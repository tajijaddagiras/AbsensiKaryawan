import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper: Calculate time difference in minutes (time2 - time1)
function getMinutesDifference(time1: string, time2: string): number {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  return (h2 * 60 + m2) - (h1 * 60 + m1);
}

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
  office?: { name: string; latitude: number; longitude: number; id?: number };
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
        latitude: officeData.latitude,
        longitude: officeData.longitude,
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
    const { data: employee } = await supabaseServer
      .from('employees')
      .select('id, is_active')
      .eq('id', employee_id)
      .single();

    if (!employee || !employee.is_active) {
      return NextResponse.json(
        { success: false, error: 'Karyawan tidak ditemukan atau tidak aktif' },
        { status: 404 }
      );
    }

    // VALIDATE LATITUDE AND LONGITUDE (NOT NULL AND VALID RANGE)
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

    // VALIDATE GPS LOCATION (BACKEND VALIDATION)
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
    
    // Use Intl.DateTimeFormat for accurate timezone conversion
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
    
    // Create Jakarta date object for day of week calculation
    const jakartaDate = new Date(jakartaDateObj.year, jakartaDateObj.month - 1, jakartaDateObj.day, jakartaDateObj.hour, jakartaDateObj.minute);
    
    // Date string in Asia/Jakarta timezone (YYYY-MM-DD)
    const currentDateStr = `${jakartaDateObj.year}-${String(jakartaDateObj.month).padStart(2, '0')}-${String(jakartaDateObj.day).padStart(2, '0')}`;
    
    // Time string in Asia/Jakarta timezone (HH:MM, 24-hour format)
    const currentTimeStr = `${String(jakartaDateObj.hour).padStart(2, '0')}:${String(jakartaDateObj.minute).padStart(2, '0')}`;
    
    // Day of week in Asia/Jakarta timezone (0=Sunday, 1=Monday, ..., 6=Saturday)
    const dayOfWeek = jakartaDate.getDay();

    // 1. CHECK HOLIDAY
    const { data: holidayData } = await supabaseServer
      .from('holidays')
      .select('*')
      .eq('date', currentDateStr)
      .eq('is_active', true)
      .single();

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
    const { data: scheduleData } = await supabaseServer
      .from('work_schedules')
      .select('*')
      .eq('day_of_week', dayOfWeek)
      .single();

    if (!scheduleData) {
      return NextResponse.json(
        { success: false, error: 'Jadwal kerja untuk hari ini belum dikonfigurasi' },
        { status: 400 }
      );
    }

    if (!scheduleData.is_active) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Hari ini (${scheduleData.day_name}) bukan hari kerja`,
          schedule: scheduleData
        },
        { status: 400 }
      );
    }

    // 3. CHECK IF TOO EARLY (only block if more than 1 hour before work window starts)
    // This validation allows check-in within the work window or up to 1 hour before
    const workWindowStart = scheduleData.start_time;
    const checkInMinutes = timeToMinutes(currentTimeStr);
    const workStartMinutes = timeToMinutes(workWindowStart);
    
    // Calculate how many minutes before work start (negative = before, positive = after)
    const minutesBeforeStart = checkInMinutes - workStartMinutes;
    
    // Only block if check-in is MORE THAN 1 hour before work window starts
    // This means: if checkInMinutes < (workStartMinutes - 60), then block
    // Or: if (checkInMinutes - workStartMinutes) < -60, then block
    // Examples:
    // - Work starts 05:20, check-in 05:25 → minutesBeforeStart = 5, allowed ✓
    // - Work starts 05:20, check-in 05:20 → minutesBeforeStart = 0, allowed ✓
    // - Work starts 05:20, check-in 04:30 → minutesBeforeStart = -50, allowed ✓ (within 1 hour buffer)
    // - Work starts 05:20, check-in 04:15 → minutesBeforeStart = -65, blocked ✗ (too early)
    if (minutesBeforeStart < -60) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Terlalu pagi untuk check-in. Rentang jam masuk dimulai pukul ${scheduleData.start_time}. Check-in diizinkan maksimal 1 jam sebelum jam mulai.`,
          schedule: scheduleData
        },
        { status: 400 }
      );
    }

    // 4. CHECK IF ALREADY CHECKED IN TODAY (using Asia/Jakarta date)
    // Create date objects for Jakarta timezone date range
    const jakartaToday = new Date(jakartaDateObj.year, jakartaDateObj.month - 1, jakartaDateObj.day, 0, 0, 0);
    const jakartaTomorrow = new Date(jakartaToday);
    jakartaTomorrow.setDate(jakartaTomorrow.getDate() + 1);
    
    const { data: existingCheckIn } = await supabaseServer
      .from('attendance')
      .select('id')
      .eq('employee_id', employee_id)
      .gte('check_in_time', jakartaToday.toISOString())
      .lt('check_in_time', jakartaTomorrow.toISOString())
      .is('check_out_time', null)
      .single();

    if (existingCheckIn) {
      return NextResponse.json(
        { success: false, error: 'Anda sudah check-in hari ini' },
        { status: 400 }
      );
    }

    // 5. DETERMINE STATUS dengan rentang bebas dari database
    let status = 'present';
    let notes = '';
    let lateDuration = 0;
    let statusDetail: 'on_time' | 'within_tolerance' | 'late_beyond' = 'on_time';

    // Ambil rentang waktu dari database (atau hitung fallback jika NULL)
    const startTime = scheduleData.start_time;
    
    // Akhir jendela "Tepat Waktu"
    let onTimeEnd = scheduleData.on_time_end_time;
    if (!onTimeEnd) {
      // Fallback: hitung dari start_time + late_tolerance_minutes
      const startMin = timeToMinutes(startTime);
      const tol = Math.max(0, scheduleData.late_tolerance_minutes || 0);
      const totalMin = startMin + tol;
      const [h, m] = [Math.floor(totalMin / 60) % 24, totalMin % 60];
      onTimeEnd = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    
    // Awal jendela "Dalam Toleransi"
    let toleranceStart = scheduleData.tolerance_start_time;
    if (!toleranceStart) {
      toleranceStart = onTimeEnd; // Default: langsung setelah on_time_end
    }
    
    // Akhir jendela "Dalam Toleransi"
    let toleranceEnd = scheduleData.tolerance_end_time;
    if (!toleranceEnd) {
      // Fallback: hitung dari tolerance_start + late_tolerance_minutes
      const tolStartMin = timeToMinutes(toleranceStart);
      const tol = Math.max(0, scheduleData.late_tolerance_minutes || 0);
      const totalMin = tolStartMin + tol;
      const [h, m] = [Math.floor(totalMin / 60) % 24, totalMin % 60];
      toleranceEnd = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    // Tentukan status berdasarkan waktu check-in
    const checkInMin = timeToMinutes(currentTimeStr);
    const startMin = timeToMinutes(startTime);
    const onTimeEndMin = timeToMinutes(onTimeEnd);
    const toleranceStartMin = timeToMinutes(toleranceStart);
    const toleranceEndMin = timeToMinutes(toleranceEnd);

    if (checkInMin >= startMin && checkInMin <= onTimeEndMin) {
      // Tepat Waktu: di dalam rentang [start_time .. on_time_end_time]
      status = 'present';
      statusDetail = 'on_time';
      const minutesLate = Math.max(0, checkInMin - startMin);
      if (minutesLate > 0) {
        notes = `Tepat waktu (masuk ${minutesLate} menit setelah jam mulai)`;
      }
    } else if (checkInMin > onTimeEndMin && checkInMin <= toleranceEndMin) {
      // Dalam Toleransi: di dalam rentang (on_time_end_time .. tolerance_end_time]
      status = 'present';
      statusDetail = 'within_tolerance';
      const minutesLate = checkInMin - startMin;
      notes = `Hadir dalam toleransi (+${minutesLate} menit)`;
    } else if (checkInMin > toleranceEndMin) {
      // Lewat Toleransi: setelah tolerance_end_time
      status = 'late';
      statusDetail = 'late_beyond';
      lateDuration = checkInMin - startMin;
      notes = `Terlambat ${lateDuration} menit (melewati batas toleransi: ${toleranceEnd})`;
    } else {
      // Sebelum start_time (masih dianggap tepat waktu jika tidak terlalu pagi)
      status = 'present';
      statusDetail = 'on_time';
    }

    // 6. INSERT CHECK-IN RECORD (use server UTC time, but based on Jakarta calculation)
    // Use office_location_id from GPS validation if location_id not provided
    const finalLocationId = location_id || gpsValidation.office?.id || null;

    const { data, error } = await supabaseServer
      .from('attendance')
      .insert({
        employee_id,
        check_in_time: now.toISOString(), // Store as UTC in database
        check_in_latitude: latitude,
        check_in_longitude: longitude,
        office_location_id: finalLocationId,
        face_match_score,
        status,
        notes: notes || null
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gagal menyimpan data check-in',
          details: error.message,
        },
        { status: 500 }
      );
    }

    // 7. RETURN SUCCESS WITH DETAILED MESSAGE
    let message = '✅ Check-in berhasil!';
    if (status === 'late') {
      message = `⚠️ Check-in berhasil (Terlambat ${lateDuration} menit)`;
    }

    return NextResponse.json({ 
      success: true,
      data,
      message,
      details: {
        status,
        statusDetail,
        lateDuration,
        workSchedule: `${scheduleData.start_time} - ${scheduleData.end_time}`,
        lateToleranceMinutes: scheduleData.late_tolerance_minutes,
        location: {
          office: gpsValidation.office?.name,
          distance: gpsValidation.distance?.toFixed(0) + 'm',
          maxRadius: gpsValidation.maxRadius + 'm',
        },
      }
    });
  } catch (error: any) {
    // Better error handling with more informative messages
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

