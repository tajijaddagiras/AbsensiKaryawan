import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper: Convert time string to minutes from 00:00
function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

// Helper function: Calculate haversine distance between two GPS coordinates (in meters)
function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Helper function: Validate GPS location against active office
async function validateGPSLocation(
  latitude: number,
  longitude: number
): Promise<{
  valid: boolean;
  error?: string;
  office?: { name: string; latitude: number; longitude: number; id?: string };
  distance?: number;
  maxRadius?: number;
}> {
  try {
    // Fetch active office location first
    const officeData = await prisma.officeLocation.findFirst({
      where: { isActive: true },
    });

    if (!officeData) {
      return { valid: false, error: 'Tidak ada lokasi kantor aktif' };
    }

    // Determine maxRadius
    let maxRadius: number;
    
    if (officeData.radius && officeData.radius > 0) {
      maxRadius = officeData.radius;
    } else {
      // Fallback: Fetch GPS radius from system settings
      const settingsData = await prisma.systemSetting.findUnique({
        where: { settingKey: 'gps_accuracy_radius' },
      });

      if (!settingsData) {
        return { valid: false, error: 'Gagal mengambil pengaturan GPS radius' };
      }

      maxRadius = parseInt(settingsData.settingValue || '3000');
    }

    // Calculate distance
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
          id: officeData.id,
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
        id: officeData.id,
      },
      distance: distance,
      maxRadius: maxRadius,
    };
  } catch (error: any) {
    return { valid: false, error: 'Gagal memvalidasi lokasi GPS' };
  }
}

// POST /api/attendance/check-in - Check-in with face recognition + smart validation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_id, face_match_score, latitude, longitude, location_id } = body;

    if (!employee_id) {
      return NextResponse.json(
        { success: false, error: 'employee_id is required' },
        { status: 400 }
      );
    }

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employee_id },
      select: { id: true, isActive: true },
    });

    if (!employee || !employee.isActive) {
      return NextResponse.json(
        { success: false, error: 'Karyawan tidak ditemukan atau tidak aktif' },
        { status: 404 }
      );
    }

    // VALIDATE LATITUDE AND LONGITUDE
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

    // VALIDATE GPS LOCATION
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

    // Get current time in Asia/Jakarta timezone
    const now = new Date();
    
    const jakartaFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const jakartaParts = jakartaFormatter.formatToParts(now);
    const jakartaDateObj = {
      year: parseInt(jakartaParts.find(p => p.type === 'year')?.value || '0'),
      month: parseInt(jakartaParts.find(p => p.type === 'month')?.value || '0'),
      day: parseInt(jakartaParts.find(p => p.type === 'day')?.value || '0'),
      hour: parseInt(jakartaParts.find(p => p.type === 'hour')?.value || '0'),
      minute: parseInt(jakartaParts.find(p => p.type === 'minute')?.value || '0')
    };
    
    const jakartaDate = new Date(jakartaDateObj.year, jakartaDateObj.month - 1, jakartaDateObj.day, jakartaDateObj.hour, jakartaDateObj.minute);
    const currentDateStr = `${jakartaDateObj.year}-${String(jakartaDateObj.month).padStart(2, '0')}-${String(jakartaDateObj.day).padStart(2, '0')}`;
    const currentTimeStr = `${String(jakartaDateObj.hour).padStart(2, '0')}:${String(jakartaDateObj.minute).padStart(2, '0')}`;
    const dayOfWeek = jakartaDate.getDay();

    // 1. CHECK HOLIDAY
    const holidayData = await prisma.holiday.findFirst({
      where: {
        date: new Date(currentDateStr),
        isActive: true,
      },
    });

    if (holidayData) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Hari ini adalah hari libur: ${holidayData.name}`,
          holiday: holidayData
        },
        { status: 400 }
      );
    }

    // 2. CHECK WORK SCHEDULE
    const scheduleData = await prisma.workSchedule.findUnique({
      where: { dayOfWeek },
    });

    if (!scheduleData) {
      return NextResponse.json(
        { success: false, error: 'Jadwal kerja untuk hari ini belum dikonfigurasi' },
        { status: 400 }
      );
    }

    if (!scheduleData.isActive) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Hari ini (${scheduleData.dayName}) bukan hari kerja`,
          schedule: scheduleData
        },
        { status: 400 }
      );
    }

    // 3. CHECK IF TOO EARLY
    const workWindowStart = scheduleData.startTime;
    const checkInMinutes = timeToMinutes(currentTimeStr);
    const workStartMinutes = timeToMinutes(workWindowStart);
    const minutesBeforeStart = checkInMinutes - workStartMinutes;
    
    if (minutesBeforeStart < -60) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Terlalu pagi untuk check-in. Rentang jam masuk dimulai pukul ${scheduleData.startTime}. Check-in diizinkan maksimal 1 jam sebelum jam mulai.`,
          schedule: scheduleData
        },
        { status: 400 }
      );
    }

    // 4. CHECK IF ALREADY CHECKED IN TODAY
    const jakartaToday = new Date(jakartaDateObj.year, jakartaDateObj.month - 1, jakartaDateObj.day, 0, 0, 0);
    const jakartaTomorrow = new Date(jakartaToday);
    jakartaTomorrow.setDate(jakartaTomorrow.getDate() + 1);
    
    const existingCheckIn = await prisma.attendance.findFirst({
      where: {
        employeeId: employee_id,
        checkInTime: {
          gte: jakartaToday,
          lt: jakartaTomorrow,
        },
        checkOutTime: null,
      },
    });

    if (existingCheckIn) {
      return NextResponse.json(
        { success: false, error: 'Anda sudah check-in hari ini' },
        { status: 400 }
      );
    }

    // 5. DETERMINE STATUS
    let status = 'present';
    let notes = '';
    let lateDuration = 0;
    let statusDetail: 'on_time' | 'within_tolerance' | 'late_beyond' = 'on_time';

    const startTime = scheduleData.startTime;
    
    let onTimeEnd = scheduleData.onTimeEndTime;
    if (!onTimeEnd) {
      const startMin = timeToMinutes(startTime);
      const tol = Math.max(0, scheduleData.lateToleranceMinutes || 0);
      const totalMin = startMin + tol;
      const [h, m] = [Math.floor(totalMin / 60) % 24, totalMin % 60];
      onTimeEnd = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    
    let toleranceStart = scheduleData.toleranceStartTime;
    if (!toleranceStart) {
      toleranceStart = onTimeEnd;
    }
    
    let toleranceEnd = scheduleData.toleranceEndTime;
    if (!toleranceEnd) {
      const tolStartMin = timeToMinutes(toleranceStart);
      const tol = Math.max(0, scheduleData.lateToleranceMinutes || 0);
      const totalMin = tolStartMin + tol;
      const [h, m] = [Math.floor(totalMin / 60) % 24, totalMin % 60];
      toleranceEnd = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    const checkInMin = timeToMinutes(currentTimeStr);
    const startMin = timeToMinutes(startTime);
    const onTimeEndMin = timeToMinutes(onTimeEnd);
    const toleranceEndMin = timeToMinutes(toleranceEnd);

    if (checkInMin >= startMin && checkInMin <= onTimeEndMin) {
      status = 'present';
      statusDetail = 'on_time';
      const minutesLate = Math.max(0, checkInMin - startMin);
      if (minutesLate > 0) {
        notes = `Tepat waktu (masuk ${minutesLate} menit setelah jam mulai)`;
      }
    } else if (checkInMin > onTimeEndMin && checkInMin <= toleranceEndMin) {
      status = 'present';
      statusDetail = 'within_tolerance';
      const minutesLate = checkInMin - startMin;
      notes = `Hadir dalam toleransi (+${minutesLate} menit)`;
    } else if (checkInMin > toleranceEndMin) {
      status = 'late';
      statusDetail = 'late_beyond';
      lateDuration = checkInMin - startMin;
      notes = `Terlambat ${lateDuration} menit (melewati batas toleransi: ${toleranceEnd})`;
    } else {
      status = 'present';
      statusDetail = 'on_time';
    }

    // 6. INSERT CHECK-IN RECORD
    const finalLocationId = location_id || gpsValidation.office?.id || null;

    const attendance = await prisma.attendance.create({
      data: {
        employeeId: employee_id,
        checkInTime: now,
        checkInLatitude: latitude,
        checkInLongitude: longitude,
        officeLocationId: finalLocationId,
        faceMatchScore: face_match_score,
        status,
        notes: notes || null,
      },
    });

    // 7. RETURN SUCCESS
    let message = '✅ Check-in berhasil!';
    if (status === 'late') {
      message = `⚠️ Check-in berhasil (Terlambat ${lateDuration} menit)`;
    }

    return NextResponse.json({ 
      success: true,
      data: attendance,
      message,
      details: {
        status,
        statusDetail,
        lateDuration,
        workSchedule: `${scheduleData.startTime} - ${scheduleData.endTime}`,
        lateToleranceMinutes: scheduleData.lateToleranceMinutes,
        location: {
          office: gpsValidation.office?.name,
          distance: gpsValidation.distance?.toFixed(0) + 'm',
          maxRadius: gpsValidation.maxRadius + 'm',
        },
      }
    });
  } catch (error: any) {
    console.error('Check-in error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Terjadi kesalahan sistem saat melakukan check-in',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
