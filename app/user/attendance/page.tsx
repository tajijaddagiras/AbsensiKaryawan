'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import UserSidebar, { SidebarToggleButton } from '@/components/UserSidebar';
import SkeletonCard from '@/components/SkeletonCard';

// Lazy load Camera dan Modal components untuk mengurangi initial bundle size
const FaceVerificationCamera = dynamic(() => import('@/components/FaceVerificationCamera'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-white rounded-xl p-6 text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600 font-medium">Memuat kamera...</p>
      </div>
    </div>
  )
});

const VerificationResultModal = dynamic(() => import('@/components/VerificationResultModal'), {
  ssr: false
});

const CheckInOutSuccessModal = dynamic(() => import('@/components/CheckInOutSuccessModal'), {
  ssr: false
});

const CheckInOutErrorModal = dynamic(() => import('@/components/CheckInOutErrorModal'), {
  ssr: false
});

export default function AttendancePage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [todaySchedule, setTodaySchedule] = useState<any>(null);
  const [isHoliday, setIsHoliday] = useState<any>(null);
  
  // Verification result modal state
  const [showResultModal, setShowResultModal] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    score: number;
    trainingScore?: number;
    threshold?: number;
    error?: string;
  } | null>(null);
  
  // Processing modal state
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  
  // Check-out flag
  const [isCheckOut, setIsCheckOut] = useState(false);

  // Check-in/Check-out success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    isCheckOut: boolean;
    verificationScore: number;
    threshold: number;
    location: {
      office: string;
      distance: string;
      maxRadius: number;
    };
    time: {
      timeStr: string;
      dateStr: string;
    };
  } | null>(null);

  // Check-in/Check-out error modal state
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorData, setErrorData] = useState<{
    isCheckOut: boolean;
    errorType: 'gps_out_of_range' | 'gps_not_available' | 'employee_not_found' | 'api_error' | 'network_error';
    message: string;
    userLocation?: {
      lat: number;
      lng: number;
    };
    distance?: string;
    maxRadius?: number;
    time?: {
      timeStr: string;
      dateStr: string;
    };
  } | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/user');
      return;
    }
    
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    
    (async () => {
      try {
        await Promise.all([
          fetchEmployeeData(parsedUser.email),
          fetchTodaySchedule(),
          checkHoliday(),
        ]);
        // getLocation tidak perlu di Promise.all karena bukan async fetch
        getLocation();
      } catch (error) {
        console.error('Error fetching attendance data:', error);
      } finally {
        setInitialLoading(false);
      }
    })();
  }, [router]);

  const fetchTodaySchedule = async () => {
    try {
      // Force refresh dengan timestamp untuk hindari cache
      const timestamp = Date.now();
      const response = await fetch(`/api/work-schedules?t=${timestamp}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      if (data.success) {
        // Get day of week in Asia/Jakarta timezone
        const now = new Date();
        const jakartaDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
        const dayOfWeek = jakartaDate.getDay();
        const schedule = data.data.find((s: any) => s.day_of_week === dayOfWeek);
        console.log('📅 Today schedule fetched:', {
          day: schedule?.day_name,
          start: schedule?.start_time,
          end: schedule?.end_time,
          tolerance: schedule?.late_tolerance_minutes
        });
        setTodaySchedule(schedule);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    }
  };

  const checkHoliday = async () => {
    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      const response = await fetch(`/api/holidays?date=${today}`);
      const data = await response.json();
      if (data.success && data.data.length > 0) {
        setIsHoliday(data.data[0]);
      }
    } catch (error) {
      console.error('Error checking holiday:', error);
    }
  };

  useEffect(() => {
    if (employee) {
      fetchTodayAttendance();
    }
  }, [employee]);

  const fetchEmployeeData = async (email: string) => {
    try {
      const response = await fetch(`/api/employees?email=${email}`);
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        setEmployee(data.data[0]);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => console.error('Error getting location:', error)
      );
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      if (!employee) return;

      const response = await fetch(`/api/attendance/today?employee_id=${employee.id}`);
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        setTodayAttendance(data.data[0]);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  // Fetch system settings dari API (real-time, tidak dari cache)
  const getSystemSettings = async () => {
    try {
      const response = await fetch('/api/system-settings', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        const settings = data.data;
        return {
          faceThreshold: parseInt(settings.face_recognition_threshold?.value || '80'),
          gpsRadius: parseInt(settings.gps_accuracy_radius?.value || '3000'),
        };
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
    }
    
    // Fallback default
    return { faceThreshold: 80, gpsRadius: 3000 };
  };

  const validateGPSLocation = async (userLat: number, userLng: number) => {
    try {
      // Fetch settings dari API secara real-time
      const systemSettings = await getSystemSettings();
      const maxRadius = systemSettings.gpsRadius;
      
      const response = await fetch('/api/office-locations');
      const data = await response.json();
      
      if (!data.success || !data.data.length) {
        return { valid: false, error: 'Tidak ada lokasi kantor yang terdaftar' };
      }
      
      // Cari kantor yang aktif (hanya 1 yang aktif)
      const activeOffice = data.data.find((office: any) => office.is_active);
      
      if (!activeOffice) {
        return { valid: false, error: 'Tidak ada lokasi kantor aktif' };
      }
      
      // Hitung jarak ke kantor aktif
      const distance = calculateDistance(userLat, userLng, activeOffice.latitude, activeOffice.longitude);
        
        if (distance <= maxRadius) {
        return { valid: true, office: activeOffice.name, distance: distance.toFixed(2) };
      }
      
      // Jika di luar jangkauan, return jarak untuk error modal
      return { 
        valid: false, 
        error: `Anda berada di luar jangkauan kantor (maksimal ${maxRadius}m dari lokasi kantor)`,
        distance: distance.toFixed(2),
        maxRadius: maxRadius
      };
    } catch (error: any) {
      return { valid: false, error: 'Gagal memvalidasi lokasi GPS' };
    }
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  const handleFaceVerification = async (result: { 
    success: boolean; 
    score: number; 
    trainingScore?: number;
    threshold?: number;
    image?: string; 
    error?: string 
  }) => {
    setShowCamera(false);
    setShowProcessingModal(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setShowProcessingModal(false);
    setVerificationResult(result);
    setShowResultModal(true);
  };

  const handleContinueAfterVerification = async () => {
    if (!verificationResult?.success) return;
    
    setLoading(true);

    try {
      // Prepare time data for modal
      const now = new Date();
      const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const timeStr = `${String(jakartaTime.getHours()).padStart(2, '0')}:${String(jakartaTime.getMinutes()).padStart(2, '0')}`;
      const dateStr = jakartaTime.toLocaleDateString('id-ID', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'Asia/Jakarta' 
      });

      if (!employee) {
        setErrorData({
          isCheckOut,
          errorType: 'employee_not_found',
          message: 'Data karyawan tidak ditemukan',
          time: { timeStr, dateStr }
        });
        setShowErrorModal(true);
        setLoading(false);
        return;
      }

      if (!location) {
        setErrorData({
          isCheckOut,
          errorType: 'gps_not_available',
          message: 'Lokasi GPS tidak tersedia',
          time: { timeStr, dateStr }
        });
        setShowErrorModal(true);
        setLoading(false);
        return;
      }

      const gpsValidation = await validateGPSLocation(location.lat, location.lng);
      
      if (!gpsValidation.valid) {
        // Check if it's GPS out of range error
        if (gpsValidation.distance && gpsValidation.maxRadius) {
          const systemSettings = await getSystemSettings();
          setErrorData({
            isCheckOut,
            errorType: 'gps_out_of_range',
            message: 'Lokasi tidak sesuai',
            userLocation: {
              lat: location.lat,
              lng: location.lng
            },
            distance: gpsValidation.distance,
            maxRadius: systemSettings.gpsRadius,
            time: { timeStr, dateStr }
          });
        } else {
          setErrorData({
            isCheckOut,
            errorType: 'gps_not_available',
            message: gpsValidation.error || 'Gagal memvalidasi lokasi GPS',
            time: { timeStr, dateStr }
          });
        }
        setShowErrorModal(true);
        setLoading(false);
        return;
      }

      // Get system settings untuk mendapatkan GPS radius maksimal
      const systemSettings = await getSystemSettings();
      const threshold = verificationResult.threshold || 80;

      if (isCheckOut) {
        const response = await fetch('/api/attendance/check-out', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            employee_id: employee.id,
            face_match_score: verificationResult.score,
            latitude: location?.lat,
            longitude: location?.lng,
          }),
        });

        const data = await response.json();
        if (data.success) {
          // Set data untuk success modal
          setSuccessData({
            isCheckOut: true,
            verificationScore: verificationResult.score,
            threshold: threshold,
            location: {
              office: gpsValidation.office || 'Unknown',
              distance: gpsValidation.distance || '0',
              maxRadius: systemSettings.gpsRadius
            },
            time: {
              timeStr,
              dateStr
            }
          });
          setShowSuccessModal(true);
          fetchTodayAttendance();
          setIsCheckOut(false);
        } else {
          setErrorData({
            isCheckOut: true,
            errorType: 'api_error',
            message: 'Check-out gagal',
            time: { timeStr, dateStr }
          });
          setShowErrorModal(true);
        }
      } else {
      const response = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
            face_match_score: verificationResult.score,
          latitude: location?.lat,
          longitude: location?.lng,
        }),
      });

      const data = await response.json();
      if (data.success) {
          // Set data untuk success modal
          setSuccessData({
            isCheckOut: false,
            verificationScore: verificationResult.score,
            threshold: threshold,
            location: {
              office: gpsValidation.office || 'Unknown',
              distance: gpsValidation.distance || '0',
              maxRadius: systemSettings.gpsRadius
            },
            time: {
              timeStr,
              dateStr
            }
          });
          setShowSuccessModal(true);
        fetchTodayAttendance();
      } else {
          setErrorData({
            isCheckOut: false,
            errorType: 'api_error',
            message: 'Check-in gagal',
            time: { timeStr, dateStr }
          });
          setShowErrorModal(true);
        }
      }
    } catch (error: any) {
      const now = new Date();
      const jakartaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const timeStr = `${String(jakartaTime.getHours()).padStart(2, '0')}:${String(jakartaTime.getMinutes()).padStart(2, '0')}`;
      const dateStr = jakartaTime.toLocaleDateString('id-ID', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        timeZone: 'Asia/Jakarta' 
      });

      setErrorData({
        isCheckOut,
        errorType: 'network_error',
        message: 'Koneksi terputus',
        time: { timeStr, dateStr }
      });
      setShowErrorModal(true);
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.substring(0, 2).toUpperCase();
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    // Convert to Asia/Jakarta timezone and format as 24-hour (HH:MM)
    const jakartaDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const hours = String(jakartaDate.getHours()).padStart(2, '0');
    const minutes = String(jakartaDate.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Helper function: Format schedule time dari HH:MM:SS menjadi HH:MM
  const formatScheduleTime = (time: string | null | undefined): string => {
    if (!time) return '';
    // Potong hanya ambil HH:MM (5 karakter pertama dari HH:MM:SS)
    return time.slice(0, 5);
  };

  // Helper function: Hitung status absensi berdasarkan jam check-in dan jadwal
  const getAttendanceStatus = (checkInTime: string, schedule: any): {
    status: 'on_time' | 'within_tolerance' | 'late';
    statusLabel: string;
    statusColor: string;
    statusBg: string;
  } => {
    if (!checkInTime || !schedule) {
      return { status: 'on_time', statusLabel: 'Tepat Waktu', statusColor: 'text-green-700', statusBg: 'bg-green-100' };
    }

    // Parse waktu check-in
    const [checkInHour, checkInMin] = checkInTime.split(':').slice(0, 2).map(Number);
    const checkInMinutes = checkInHour * 60 + checkInMin;

    // Parse waktu jadwal
    const startTime = formatScheduleTime(schedule.start_time);
    const onTimeEnd = formatScheduleTime(schedule.on_time_end_time || schedule.start_time);
    const toleranceStart = formatScheduleTime(schedule.tolerance_start_time || schedule.on_time_end_time || schedule.start_time);
    const toleranceEnd = formatScheduleTime(schedule.tolerance_end_time || schedule.on_time_end_time || schedule.start_time);

    const [startH, startM] = startTime.split(':').map(Number);
    const [onTimeEndH, onTimeEndM] = onTimeEnd.split(':').map(Number);
    const [toleranceStartH, toleranceStartM] = toleranceStart.split(':').map(Number);
    const [toleranceEndH, toleranceEndM] = toleranceEnd.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const onTimeEndMinutes = onTimeEndH * 60 + onTimeEndM;
    const toleranceStartMinutes = toleranceStartH * 60 + toleranceStartM;
    const toleranceEndMinutes = toleranceEndH * 60 + toleranceEndM;

    // Tentukan status
    if (checkInMinutes >= startMinutes && checkInMinutes <= onTimeEndMinutes) {
      return { status: 'on_time', statusLabel: 'Tepat Waktu', statusColor: 'text-green-700', statusBg: 'bg-green-100' };
    } else if (checkInMinutes > onTimeEndMinutes && checkInMinutes <= toleranceEndMinutes) {
      return { status: 'within_tolerance', statusLabel: 'Dalam Toleransi', statusColor: 'text-orange-700', statusBg: 'bg-orange-100' };
      } else {
      return { status: 'late', statusLabel: 'Terlambat', statusColor: 'text-red-700', statusBg: 'bg-red-100' };
    }
  };

  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Jakarta'
  });

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <UserSidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

        <div className="lg:ml-64 min-h-screen">
          {/* Header */}
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm">
            <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <SidebarToggleButton onClick={() => setIsSidebarOpen(true)} />
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0"></div>
                  <div className="flex flex-col min-w-0">
                    <div className="h-6 bg-slate-200 rounded w-24 animate-pulse"></div>
                    <div className="h-4 bg-slate-200 rounded w-32 mt-1 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Banner Skeleton */}
            <div className="h-32 bg-slate-200 rounded-xl mb-6 animate-pulse"></div>

            {/* Check-in/out Card Skeleton */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6 animate-pulse">
              <div className="h-8 bg-slate-200 rounded w-48 mb-4"></div>
              <div className="h-32 bg-slate-200 rounded-lg"></div>
            </div>

            {/* Today Attendance Skeleton */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="h-6 bg-slate-200 rounded w-40 mb-4 animate-pulse"></div>
              <div className="space-y-3">
                <SkeletonCard variant="default" count={2} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <UserSidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      <div className="lg:ml-64 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <SidebarToggleButton onClick={() => setIsSidebarOpen(true)} />
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 truncate">Absensi</h1>
                  <p className="text-xs sm:text-sm text-slate-500 truncate">{currentDate}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Holiday Banner */}
          {isHoliday && (
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 shadow-lg border border-purple-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-bold text-white mb-1">🎉 Hari Libur</h3>
                  <p className="text-sm text-white/90">{isHoliday.name}</p>
                  <p className="text-xs text-white/75 mt-1">{isHoliday.description || 'Selamat berlibur!'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Employee Info Card - MOVED UP & COMPACT */}
          {employee && (
            <div className="bg-white rounded-xl p-3 sm:p-4 mb-4 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                {employee.avatar_url ? (
                  <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                    <Image 
                      src={employee.avatar_url} 
                      alt={employee.full_name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 48px, 56px"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                    {getInitials(employee.full_name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">{employee.full_name}</h2>
                  <p className="text-xs text-slate-500">{employee.employee_code}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold">
                      {employee.department || 'No Dept'}
                    </span>
                    {employee.face_encoding_path && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-[10px] font-semibold">
                        ✓ Terlatih
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Work Schedule Info - COMPACT VERSION */}
          {todaySchedule && (
            <div className={`rounded-xl p-3 sm:p-4 mb-4 shadow-sm border ${
              todaySchedule.is_active 
                ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  todaySchedule.is_active 
                    ? 'bg-blue-500' 
                    : 'bg-gray-400'
                }`}>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
          <div>
                  <h3 className="text-xs font-semibold text-slate-600">Jadwal Hari Ini</h3>
                  <p className="text-sm font-bold text-slate-900">{todaySchedule.day_name}</p>
                </div>
              </div>
              
              {todaySchedule.is_active ? (
                <div className="space-y-2.5">
                  {/* Grid 3 Kolom - COMPACT */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Card 1: Tepat Waktu (HIJAU) - COMPACT */}
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-300 rounded-lg p-2.5 shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-6 h-6 rounded-md bg-green-500 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-[10px] font-bold text-green-700">Tepat Waktu</p>
                      </div>
                      <p className="text-lg font-black text-green-700 leading-tight">
                        {formatScheduleTime(todaySchedule.start_time)}
                        <span className="text-xs mx-0.5">-</span>
                        {formatScheduleTime(todaySchedule.on_time_end_time || todaySchedule.start_time)}
                      </p>
                      <p className="text-[10px] text-green-600 mt-1">Rentang waktu tepat</p>
                    </div>

                    {/* Card 2: Dalam Toleransi (ORANGE) - COMPACT */}
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-300 rounded-lg p-2.5 shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-6 h-6 rounded-md bg-orange-500 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-[10px] font-bold text-orange-700">Dalam Toleransi</p>
                      </div>
                      <p className="text-lg font-black text-orange-700 leading-tight">
                        {formatScheduleTime(todaySchedule.tolerance_start_time || todaySchedule.on_time_end_time || todaySchedule.start_time)}
                        <span className="text-xs mx-0.5">-</span>
                        {formatScheduleTime(todaySchedule.tolerance_end_time || todaySchedule.on_time_end_time || todaySchedule.start_time)}
                      </p>
                      <p className="text-[10px] text-orange-600 mt-1">Rentang toleransi</p>
                    </div>

                    {/* Card 3: Jam Pulang (BIRU) - COMPACT */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-300 rounded-lg p-2.5 shadow-sm">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div className="w-6 h-6 rounded-md bg-blue-500 flex items-center justify-center">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                        </div>
                        <p className="text-[10px] font-bold text-blue-700">Jam Pulang</p>
                      </div>
                      <p className="text-lg font-black text-blue-700 leading-tight">{formatScheduleTime(todaySchedule.end_time)}</p>
                      <p className="text-[10px] text-blue-600 mt-1">Waktu selesai kerja</p>
                    </div>
                  </div>

                  {/* Info Box - COMPACT */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg p-2.5 shadow-sm">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-amber-900 mb-1">📋 Ketentuan Check-in:</p>
                        <div className="space-y-0.5">
                          <p className="text-[10px] text-amber-800 leading-snug">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                            <strong>Tepat:</strong> {formatScheduleTime(todaySchedule.start_time)}-{formatScheduleTime(todaySchedule.on_time_end_time || todaySchedule.start_time)}
                          </p>
                          <p className="text-[10px] text-amber-800 leading-snug">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 mr-1.5"></span>
                            <strong>Toleransi:</strong> {formatScheduleTime(todaySchedule.tolerance_start_time || todaySchedule.on_time_end_time || todaySchedule.start_time)}-{formatScheduleTime(todaySchedule.tolerance_end_time || todaySchedule.on_time_end_time || todaySchedule.start_time)}
                          </p>
                          <p className="text-[10px] text-amber-800 leading-snug">
                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span>
                            <strong>Terlambat:</strong> Setelah <strong className="text-red-700">{formatScheduleTime(todaySchedule.tolerance_end_time || todaySchedule.on_time_end_time || todaySchedule.start_time)}</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Jam Kerja - COMPACT */}
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-300 rounded-lg p-2 shadow-sm">
                    <div className="flex items-center justify-between gap-2 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-md bg-slate-600 flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="font-bold text-slate-700">Total Jam Kerja</p>
                      </div>
                      <p className="text-xs font-bold text-slate-900">
                        {formatScheduleTime(todaySchedule.start_time)}-{formatScheduleTime(todaySchedule.end_time)}
                        <span className="text-[10px] text-slate-600 ml-1 font-semibold">
                          ({(() => {
                            const [startH, startM] = todaySchedule.start_time.split(':').map(Number);
                            const [endH, endM] = todaySchedule.end_time.split(':').map(Number);
                            const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
                            const hours = Math.floor(totalMinutes / 60);
                            const minutes = totalMinutes % 60;
                            return minutes > 0 ? `${hours}j ${minutes}m` : `${hours}j`;
                          })()})
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-gray-50 to-slate-100 border border-gray-300 rounded-xl p-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <p className="text-sm font-bold text-gray-700 mb-1">Hari Ini Bukan Hari Kerja</p>
                  <p className="text-xs text-gray-600">Absensi tidak tersedia untuk hari ini</p>
                </div>
            )}
          </div>
          )}


          {/* Check In/Out Card - MERGED & COMPACT */}
          <div className="bg-white rounded-xl p-3 sm:p-4 mb-6 shadow-sm border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Check In Section - COMPACT */}
            <div className="border border-green-200 rounded-lg overflow-hidden">
              <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white">Check In</h3>
                    <p className="text-[10px] text-white/80">Masuk kantor</p>
                  </div>
                </div>
        </div>
              <div className="p-2.5">
            <button
              onClick={() => {
                if (!employee?.face_encoding_path) {
                  alert('Wajah Anda belum dilatih. Silakan hubungi admin untuk melakukan pelatihan wajah.');
                  return;
                }
                    setIsCheckOut(false);
                setShowCamera(true);
              }}
              disabled={todayAttendance || loading}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2 px-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md text-xs sm:text-sm flex items-center justify-center gap-1.5"
            >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {loading ? 'Processing...' : 'Check In'}
            </button>
                {todayAttendance && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-[10px] text-green-700 font-semibold flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Sudah: {formatTime(todayAttendance.check_in_time)}
                    </p>
                  </div>
                )}
              </div>
          </div>

            {/* Check Out Section - COMPACT */}
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <div className="bg-gradient-to-br from-red-500 to-rose-600 p-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white">Check Out</h3>
                    <p className="text-[10px] text-white/80">Pulang kantor</p>
                  </div>
                </div>
              </div>
              <div className="p-2.5">
            <button
                  onClick={() => {
                    setIsCheckOut(true);
                    setShowCamera(true);
                  }}
                  disabled={!todayAttendance || todayAttendance.check_out_time || loading}
                  className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold py-2 px-3 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md text-xs sm:text-sm flex items-center justify-center gap-1.5"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
              {loading ? 'Processing...' : 'Check Out'}
            </button>
                {todayAttendance?.check_out_time && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-[10px] text-red-700 font-semibold flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Sudah: {formatTime(todayAttendance.check_out_time)}
                    </p>
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>

          {/* Today's Attendance Summary - TABLE FORMAT */}
        {todayAttendance && todaySchedule && (
            <div className="bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Ringkasan Absensi Hari Ini
              </h3>

              {/* Calculate Status */}
              {(() => {
                const attendanceStatus = getAttendanceStatus(formatTime(todayAttendance.check_in_time), todaySchedule);
                const checkInFormatted = formatTime(todayAttendance.check_in_time);
                const checkOutFormatted = todayAttendance.check_out_time ? formatTime(todayAttendance.check_out_time) : '-';
                const dateFormatted = new Date(todayAttendance.check_in_time).toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });

                return (
                  <>
                    {/* Row 1: Table Format - 5 Columns (Desktop) */}
                    <div className="hidden sm:block border border-slate-200 rounded-lg overflow-hidden mb-2">
                      <div className="grid grid-cols-5 gap-0 divide-x divide-slate-200">
                        {/* Jam Absen */}
                        <div className="p-2 sm:p-2.5 bg-slate-50">
                          <p className="text-[10px] sm:text-xs text-slate-500 font-medium mb-0.5">Jam Absen</p>
                          <p className="text-sm sm:text-base font-bold text-slate-900">{checkInFormatted}</p>
                        </div>

                        {/* Jam Masuk */}
                        <div className="p-2 sm:p-2.5 bg-green-50">
                          <p className="text-[10px] sm:text-xs text-green-600 font-medium mb-0.5">Jam Masuk</p>
                          <p className="text-xs sm:text-sm font-bold text-green-700">
                            {formatScheduleTime(todaySchedule.start_time)}-{formatScheduleTime(todaySchedule.on_time_end_time || todaySchedule.start_time)}
                          </p>
                        </div>

                        {/* Dalam Toleransi */}
                        <div className="p-2 sm:p-2.5 bg-orange-50">
                          <p className="text-[10px] sm:text-xs text-orange-600 font-medium mb-0.5">Toleransi</p>
                          <p className="text-xs sm:text-sm font-bold text-orange-700">
                            {formatScheduleTime(todaySchedule.tolerance_start_time || todaySchedule.on_time_end_time || todaySchedule.start_time)}-{formatScheduleTime(todaySchedule.tolerance_end_time || todaySchedule.on_time_end_time || todaySchedule.start_time)}
                          </p>
                        </div>

                        {/* Status */}
                        <div className="p-2 sm:p-2.5 bg-blue-50">
                          <p className="text-[10px] sm:text-xs text-blue-600 font-medium mb-0.5">Status</p>
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-bold ${attendanceStatus.statusBg} ${attendanceStatus.statusColor}`}>
                            {attendanceStatus.statusLabel}
                          </span>
                        </div>

                        {/* Jam Pulang */}
                        <div className="p-2 sm:p-2.5 bg-purple-50">
                          <p className="text-[10px] sm:text-xs text-purple-600 font-medium mb-0.5">Jam Pulang</p>
                          <p className={`text-sm sm:text-base font-bold ${checkOutFormatted === '-' ? 'text-slate-400' : 'text-purple-700'}`}>
                            {checkOutFormatted}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Tanggal (Desktop) */}
                    <div className="hidden sm:block bg-slate-50 border border-slate-200 rounded-lg p-2 sm:p-2.5 mb-0">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-xs sm:text-sm font-semibold text-slate-700">Tanggal: <span className="text-slate-900">{dateFormatted}</span></p>
          </div>
        </div>

                    {/* Mobile: Stack Vertical untuk layar kecil */}
                    <div className="sm:hidden space-y-2">
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                        <p className="text-[10px] text-slate-500 mb-0.5">Jam Absen</p>
                        <p className="text-sm font-bold text-slate-900">{checkInFormatted}</p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2">
                        <p className="text-[10px] text-green-600 mb-0.5">Jam Masuk</p>
                        <p className="text-xs font-bold text-green-700">
                          {formatScheduleTime(todaySchedule.start_time)}-{formatScheduleTime(todaySchedule.on_time_end_time || todaySchedule.start_time)}
                        </p>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-2">
                        <p className="text-[10px] text-orange-600 mb-0.5">Dalam Toleransi</p>
                        <p className="text-xs font-bold text-orange-700">
                          {formatScheduleTime(todaySchedule.tolerance_start_time || todaySchedule.on_time_end_time || todaySchedule.start_time)}-{formatScheduleTime(todaySchedule.tolerance_end_time || todaySchedule.on_time_end_time || todaySchedule.start_time)}
                        </p>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2">
                        <p className="text-[10px] text-blue-600 mb-0.5">Status</p>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${attendanceStatus.statusBg} ${attendanceStatus.statusColor}`}>
                          {attendanceStatus.statusLabel}
                        </span>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-2">
                        <p className="text-[10px] text-purple-600 mb-0.5">Jam Pulang</p>
                        <p className={`text-sm font-bold ${checkOutFormatted === '-' ? 'text-slate-400' : 'text-purple-700'}`}>
                          {checkOutFormatted}
                        </p>
                      </div>
                      {/* Tanggal (Mobile) */}
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="text-[10px] text-slate-500 font-medium">Tanggal:</p>
                          <p className="text-xs font-bold text-slate-900">{dateFormatted}</p>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
              )}
            </div>
      </div>

      {/* Face Verification Camera */}
      {showCamera && employee?.face_encoding_path && (
        <FaceVerificationCamera
          storedFaceEncoding={employee.face_encoding_path}
          trainingScore={employee.face_match_score}
          onVerificationComplete={handleFaceVerification}
          onClose={() => {
            setShowCamera(false);
            setIsCheckOut(false);
          }}
        />
      )}

      {/* Processing Modal */}
      {showProcessingModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-8 sm:p-10 md:p-12 max-w-xs sm:max-w-md w-full shadow-2xl animate-fadeIn">
            <div className="text-center">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-500 rounded-full animate-pulse opacity-50"></div>
                  </div>
              </div>
              </div>
              
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                Memproses Hasil Verifikasi
              </h3>
              
              <p className="text-sm sm:text-base text-gray-600 mb-6">
                Mohon tunggu sebentar, kami sedang memproses data verifikasi wajah Anda...
              </p>
              
              <div className="flex justify-center gap-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              </div>
          </div>
        </div>
      )}

      {/* Verification Result Modal */}
      {verificationResult && (
        <VerificationResultModal
          isOpen={showResultModal}
          success={verificationResult.success}
          verificationScore={verificationResult.score}
          trainingScore={verificationResult.trainingScore}
          threshold={verificationResult.threshold}
          actionText={isCheckOut ? 'Lanjutkan Check-out' : 'Lanjutkan Check-in'}
          employeeData={employee ? {
            full_name: employee.full_name,
            employee_code: employee.employee_code,
            position: employee.position,
            avatar_url: employee.avatar_url
          } : undefined}
          onClose={() => {
            setShowResultModal(false);
            setVerificationResult(null);
            setLoading(false);
            setIsCheckOut(false);
          }}
          onContinue={() => {
            setShowResultModal(false);
            setVerificationResult(null);
            handleContinueAfterVerification();
          }}
          onRetry={() => {
            setShowResultModal(false);
            setVerificationResult(null);
            setShowCamera(true);
          }}
        />
      )}

      {/* Check-in/Check-out Success Modal */}
      {successData && (
        <CheckInOutSuccessModal
          isOpen={showSuccessModal}
          isCheckOut={successData.isCheckOut}
          verificationScore={successData.verificationScore}
          threshold={successData.threshold}
          location={successData.location}
          time={successData.time}
          onClose={() => {
            setShowSuccessModal(false);
            setSuccessData(null);
          }}
        />
      )}

      {/* Check-in/Check-out Error Modal */}
      {errorData && (
        <CheckInOutErrorModal
          isOpen={showErrorModal}
          isCheckOut={errorData.isCheckOut}
          errorType={errorData.errorType}
          message={errorData.message}
          userLocation={errorData.userLocation}
          distance={errorData.distance}
          maxRadius={errorData.maxRadius}
          time={errorData.time}
          onClose={() => {
            setShowErrorModal(false);
            setErrorData(null);
          }}
          onRetry={() => {
            // Retry logic - bisa dipanggil untuk refresh atau retry check-in/out
            setShowErrorModal(false);
            setErrorData(null);
            // Bisa tambahkan logic untuk retry jika diperlukan
          }}
        />
      )}
    </div>
  );
}
