import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper function: Calculate haversine distance
function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Helper function: Validate GPS location
async function validateGPSLocation(
  latitude: number,
  longitude: number
): Promise<{
  valid: boolean;
  error?: string;
  office?: { name: string; latitude: number; longitude: number };
  distance?: number;
  maxRadius?: number;
}> {
  try {
    const officeData = await prisma.officeLocation.findFirst({
      where: { isActive: true },
    });

    if (!officeData) {
      return { valid: false, error: 'Tidak ada lokasi kantor aktif' };
    }

    let maxRadius: number;
    
    if (officeData.radius && officeData.radius > 0) {
      maxRadius = officeData.radius;
    } else {
      const settingsData = await prisma.systemSetting.findUnique({
        where: { settingKey: 'gps_accuracy_radius' },
      });

      if (!settingsData) {
        return { valid: false, error: 'Gagal mengambil pengaturan GPS radius' };
      }

      maxRadius = parseInt(settingsData.settingValue || '3000');
    }

    const distance = calculateHaversineDistance(
      latitude,
      longitude,
      Number(officeData.latitude),
      Number(officeData.longitude)
    );

    if (distance > maxRadius) {
      return {
        valid: false,
        error: `Anda berada di luar jangkauan kantor (jarak: ${distance.toFixed(0)}m, maksimal: ${maxRadius}m)`,
        office: {
          name: officeData.name,
          latitude: Number(officeData.latitude),
          longitude: Number(officeData.longitude),
        },
        distance: distance,
        maxRadius: maxRadius,
      };
    }

    return {
      valid: true,
      office: {
        name: officeData.name,
        latitude: Number(officeData.latitude),
        longitude: Number(officeData.longitude),
      },
      distance: distance,
      maxRadius: maxRadius,
    };
  } catch (error: any) {
    return { valid: false, error: 'Gagal memvalidasi lokasi GPS' };
  }
}

// POST /api/attendance/check-out
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_id, face_match_score, latitude, longitude } = body;

    if (!employee_id) {
      return NextResponse.json(
        { success: false, error: 'employee_id is required' },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employee_id },
      select: { id: true, isActive: true, fullName: true },
    });

    if (!employee) {
      return NextResponse.json(
        { success: false, error: 'Karyawan tidak ditemukan' },
        { status: 404 }
      );
    }

    if (!employee.isActive) {
      return NextResponse.json(
        { success: false, error: 'Karyawan tidak aktif' },
        { status: 400 }
      );
    }

    if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
      return NextResponse.json(
        { success: false, error: 'Lokasi GPS tidak tersedia. Pastikan GPS pada perangkat Anda aktif.' },
        { status: 400 }
      );
    }

    if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
      return NextResponse.json(
        { success: false, error: 'Koordinat latitude tidak valid' },
        { status: 400 }
      );
    }

    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { success: false, error: 'Koordinat longitude tidak valid' },
        { status: 400 }
      );
    }

    const gpsValidation = await validateGPSLocation(latitude, longitude);
    if (!gpsValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: gpsValidation.error || 'Lokasi tidak sesuai',
          details: {
            distance: gpsValidation.distance,
            maxRadius: gpsValidation.maxRadius,
            office: gpsValidation.office?.name,
          },
        },
        { status: 400 }
      );
    }

    const now = new Date();

    const jakartaFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const jakartaParts = jakartaFormatter.formatToParts(now);
    const jakartaDateObj = {
      year: parseInt(jakartaParts.find((p) => p.type === 'year')?.value || '0'),
      month: parseInt(jakartaParts.find((p) => p.type === 'month')?.value || '0'),
      day: parseInt(jakartaParts.find((p) => p.type === 'day')?.value || '0'),
    };

    const jakartaToday = new Date(
      jakartaDateObj.year,
      jakartaDateObj.month - 1,
      jakartaDateObj.day,
      0,
      0,
      0
    );
    const jakartaTomorrow = new Date(jakartaToday);
    jakartaTomorrow.setDate(jakartaTomorrow.getDate() + 1);

    const checkInRecords = await prisma.attendance.findMany({
      where: {
        employeeId: employee_id,
        checkInTime: {
          gte: jakartaToday,
          lt: jakartaTomorrow,
        },
        checkOutTime: null,
      },
      orderBy: {
        checkInTime: 'desc',
      },
    });

    if (!checkInRecords || checkInRecords.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tidak ada data check-in untuk hari ini. Silakan lakukan check-in terlebih dahulu.',
        },
        { status: 404 }
      );
    }

    const checkInRecord = checkInRecords[0];

    if (checkInRecords.length > 1) {
      console.warn(
        `⚠️ Warning: Multiple check-in records found for employee ${employee_id}. Using most recent record.`
      );
    }

    if (checkInRecord.checkOutTime) {
      return NextResponse.json(
        {
          success: false,
          error: 'Anda sudah melakukan check-out hari ini',
          details: {
            checkOutTime: checkInRecord.checkOutTime,
          },
        },
        { status: 400 }
      );
    }

    const updateData: any = {
      checkOutTime: now,
      checkOutLatitude: latitude,
      checkOutLongitude: longitude,
    };

    if (face_match_score !== null && face_match_score !== undefined) {
      updateData.faceMatchScore = face_match_score;
    }

    const updatedRecord = await prisma.attendance.update({
      where: { id: checkInRecord.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedRecord,
      message: 'Check-out berhasil!',
      details: {
        checkOutTime: updatedRecord.checkOutTime,
        location: {
          office: gpsValidation.office?.name,
          distance: gpsValidation.distance?.toFixed(0) + 'm',
          maxRadius: gpsValidation.maxRadius + 'm',
        },
      },
    });
  } catch (error: any) {
    console.error('Check-out error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Terjadi kesalahan sistem saat melakukan check-out',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
