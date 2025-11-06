import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
  office?: { name: string; latitude: number; longitude: number };
  distance?: number;
  maxRadius?: number;
}> {
  try {
    // Fetch active office location first (to get radius from office location)
    const { data: officeData, error: officeError } = await supabaseServer
      .from('office_locations')
      .select('*')
      .eq('is_active', true)
      .single();

    if (officeError || !officeData) {
      return { valid: false, error: 'Tidak ada lokasi kantor aktif' };
    }

    // Determine maxRadius: use radius from office location if available and valid, otherwise use system settings
    let maxRadius: number;
    
    // Check if office location has a valid radius (greater than 0)
    if (officeData.radius && typeof officeData.radius === 'number' && officeData.radius > 0) {
      // Use radius from office location (priority)
      maxRadius = officeData.radius;
    } else {
      // Fallback: Fetch GPS radius from system settings
      const { data: settingsData, error: settingsError } = await supabaseServer
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'gps_accuracy_radius')
        .single();

      if (settingsError) {
        return { valid: false, error: 'Gagal mengambil pengaturan GPS radius' };
      }

      maxRadius = parseInt(settingsData?.setting_value || '3000');
    }

    // Calculate distance
    const distance = calculateHaversineDistance(
      latitude,
      longitude,
      officeData.latitude,
      officeData.longitude
    );

    if (distance > maxRadius) {
      return {
        valid: false,
        error: `Anda berada di luar jangkauan kantor (jarak: ${distance.toFixed(0)}m, maksimal: ${maxRadius}m)`,
        office: {
          name: officeData.name,
          latitude: officeData.latitude,
          longitude: officeData.longitude,
        },
        distance: distance,
        maxRadius: maxRadius,
      };
    }

    return {
      valid: true,
      office: {
        name: officeData.name,
        latitude: officeData.latitude,
        longitude: officeData.longitude,
      },
      distance: distance,
      maxRadius: maxRadius,
    };
  } catch (error: any) {
    return { valid: false, error: 'Gagal memvalidasi lokasi GPS' };
  }
}

// POST /api/attendance/check-out - Check-out with comprehensive validation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { employee_id, face_match_score, latitude, longitude } = body;

    // 1. VALIDATE REQUIRED FIELDS
    if (!employee_id) {
      return NextResponse.json(
        { success: false, error: 'employee_id is required' },
        { status: 400 }
      );
    }

    // 2. VALIDATE EMPLOYEE EXISTS AND ACTIVE
    const { data: employee, error: employeeError } = await supabaseServer
      .from('employees')
      .select('id, is_active, full_name')
      .eq('id', employee_id)
      .single();

    if (employeeError || !employee) {
      return NextResponse.json(
        { success: false, error: 'Karyawan tidak ditemukan' },
        { status: 404 }
      );
    }

    if (!employee.is_active) {
      return NextResponse.json(
        { success: false, error: 'Karyawan tidak aktif' },
        { status: 400 }
      );
    }

    // 3. VALIDATE LATITUDE AND LONGITUDE (NOT NULL AND VALID RANGE)
    if (latitude === null || latitude === undefined || longitude === null || longitude === undefined) {
      return NextResponse.json(
        { success: false, error: 'Lokasi GPS tidak tersedia. Pastikan GPS pada perangkat Anda aktif.' },
        { status: 400 }
      );
    }

    // Validate latitude range (-90 to 90)
    if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
      return NextResponse.json(
        { success: false, error: 'Koordinat latitude tidak valid' },
        { status: 400 }
      );
    }

    // Validate longitude range (-180 to 180)
    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        { success: false, error: 'Koordinat longitude tidak valid' },
        { status: 400 }
      );
    }

    // 4. VALIDATE GPS LOCATION (BACKEND VALIDATION)
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

    // 5. GET CURRENT TIME IN ASIA/JAKARTA TIMEZONE
    const now = new Date();

    // Use Intl.DateTimeFormat for accurate timezone conversion
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

    // 6. FIND TODAY'S CHECK-IN RECORD (using Asia/Jakarta date)
    // Create date objects for Jakarta timezone date range
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

    // Use query without .single() to handle multiple records properly
    const { data: checkInRecords, error: findError } = await supabaseServer
      .from('attendance')
      .select('*')
      .eq('employee_id', employee_id)
      .gte('check_in_time', jakartaToday.toISOString())
      .lt('check_in_time', jakartaTomorrow.toISOString())
      .is('check_out_time', null)
      .order('check_in_time', { ascending: false });

    if (findError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gagal mencari data absensi hari ini',
          details: findError.message,
        },
        { status: 500 }
      );
    }

    if (!checkInRecords || checkInRecords.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tidak ada data check-in untuk hari ini. Silakan lakukan check-in terlebih dahulu.',
        },
        { status: 404 }
      );
    }

    // Handle multiple records: use the most recent one
    const checkInRecord = checkInRecords[0];

    // If there are multiple records, log a warning (but proceed with the most recent)
    if (checkInRecords.length > 1) {
      console.warn(
        `⚠️ Warning: Multiple check-in records found for employee ${employee_id} on ${jakartaDateObj.year}-${String(jakartaDateObj.month).padStart(2, '0')}-${String(jakartaDateObj.day).padStart(2, '0')}. Using most recent record.`
      );
    }

    // 7. CHECK IF ALREADY CHECKED OUT
    if (checkInRecord.check_out_time) {
      return NextResponse.json(
        {
          success: false,
          error: 'Anda sudah melakukan check-out hari ini',
          details: {
            checkOutTime: checkInRecord.check_out_time,
          },
        },
        { status: 400 }
      );
    }

    // 8. UPDATE CHECK-OUT RECORD
    const updateData: any = {
      check_out_time: now.toISOString(),
      check_out_latitude: latitude,
      check_out_longitude: longitude,
      updated_at: new Date().toISOString(),
    };

    // Add face_match_score if provided (for consistency with check-in)
    if (face_match_score !== null && face_match_score !== undefined) {
      updateData.face_match_score = face_match_score;
    }

    const { data: updatedRecord, error: updateError } = await supabaseServer
      .from('attendance')
      .update(updateData)
      .eq('id', checkInRecord.id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gagal memperbarui data check-out',
          details: updateError.message,
        },
        { status: 500 }
      );
    }

    // 9. RETURN SUCCESS
    return NextResponse.json({
      success: true,
      data: updatedRecord,
      message: 'Check-out berhasil!',
      details: {
        checkOutTime: updatedRecord.check_out_time,
        location: {
          office: gpsValidation.office?.name,
          distance: gpsValidation.distance?.toFixed(0) + 'm',
          maxRadius: gpsValidation.maxRadius + 'm',
        },
      },
    });
  } catch (error: any) {
    // Better error handling with more informative messages
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
