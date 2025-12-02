'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import UserSidebar, { SidebarToggleButton } from '@/components/UserSidebar';
import SkeletonCard from '@/components/SkeletonCard';

export default function UserDashboard() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [todayAttendance, setTodayAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [todaySchedule, setTodaySchedule] = useState<any>(null);
  const [isHoliday, setIsHoliday] = useState<boolean>(false);
  const [activeOffice, setActiveOffice] = useState<any>(null);
  const [distanceToOffice, setDistanceToOffice] = useState<number | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/user');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'user') {
      router.push('/admin/dashboard');
      return;
    }

    setUser(parsedUser);
    
    (async () => {
      try {
        await Promise.all([
          fetchEmployeeData(parsedUser.email),
          fetchTodayScheduleAndHoliday(),
          fetchActiveOffice(),
        ]);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const fetchEmployeeData = async (email: string) => {
    try {
      const response = await fetch(`/api/employees?email=${email}`);
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        const emp = data.data[0];
        setEmployee(emp);
        // Fetch attendance setelah employee didapat
        await fetchTodayAttendance(emp.id);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    }
  };

  const fetchTodayAttendance = async (employeeId: string) => {
    try {
      const response = await fetch(`/api/attendance/today?employee_id=${employeeId}`);
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        setTodayAttendance(data.data[0]);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const fetchTodayScheduleAndHoliday = async () => {
    try {
      const wsRes = await fetch('/api/work-schedules');
      const wsData = await wsRes.json();
      if (wsData.success) {
        const dow = new Date().getDay();
        const schedule = wsData.data.find((d: any) => d.day_of_week === dow);
        setTodaySchedule(schedule || null);
      }

      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
      const hRes = await fetch(`/api/holidays?date=${todayStr}`);
      const hData = await hRes.json();
      setIsHoliday(hData.success && Array.isArray(hData.data) && hData.data.some((h: any) => h.is_active !== false));
    } catch (e) {
      console.error('Error fetching schedule/holiday', e);
    }
  };

  const haversineDistance = (
    a: { lat: number; lon: number },
    b: { lat: number; lon: number }
  ) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
    const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
    return Math.round(R * c);
  };

  const fetchActiveOffice = async () => {
    try {
      const res = await fetch('/api/office-locations');
      const data = await res.json();
      if (data.success) {
        const act = (data.data || []).find((l: any) => l.is_active);
        setActiveOffice(act || null);
        if (act && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setDistanceToOffice(haversineDistance(
                { lat: pos.coords.latitude, lon: pos.coords.longitude },
                { lat: act.latitude, lon: act.longitude }
              ));
            },
            () => {},
            { enableHighAccuracy: true, timeout: 8000 }
          );
        }
      }
    } catch (e) {
      console.error('Error fetching office location', e);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.substring(0, 2).toUpperCase();
  };

  const formatTime = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '-';
    }
  };

  // Helper function: Format schedule time dari HH:MM:SS menjadi HH:MM
  const formatScheduleTime = (time: string | null | undefined): string => {
    if (!time) return '';
    // Potong hanya ambil HH:MM (5 karakter pertama dari HH:MM:SS)
    return time.slice(0, 5);
  };

  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <UserSidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

        <div className="lg:ml-64">
          {/* Header */}
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm">
            <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <SidebarToggleButton onClick={() => setIsSidebarOpen(true)} />
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0"></div>
                  <div className="flex flex-col min-w-0">
                    <div className="h-6 bg-slate-200 rounded w-32 animate-pulse"></div>
                    <div className="h-4 bg-slate-200 rounded w-24 mt-1 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Banner Skeleton */}
            <div className="space-y-3 sm:space-y-4 mb-6">
              <div className="h-20 bg-slate-200 rounded-lg animate-pulse"></div>
              <div className="h-20 bg-slate-200 rounded-lg animate-pulse"></div>
            </div>

            {/* Welcome Card Skeleton */}
            <div className="bg-gradient-to-br from-slate-200 to-slate-300 rounded-xl sm:rounded-2xl p-6 sm:p-8 mb-6 animate-pulse">
              <div className="flex items-center gap-4 sm:gap-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-300"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-6 bg-slate-300 rounded w-3/4"></div>
                  <div className="h-4 bg-slate-300 rounded w-1/2"></div>
                </div>
              </div>
            </div>

            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-16 mb-2"></div>
                  <div className="h-8 bg-slate-300 rounded w-12"></div>
                </div>
              ))}
            </div>

            {/* Recent Activity Skeleton */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="h-6 bg-slate-200 rounded w-40 mb-4 animate-pulse"></div>
              <div className="space-y-3">
                <SkeletonCard variant="default" count={3} />
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

      <div className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-3">
              {/* Left: Toggle + Icon + Title */}
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <SidebarToggleButton onClick={() => setIsSidebarOpen(true)} />
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 truncate">Dashboard</h1>
                  <p className="text-xs sm:text-sm text-slate-500 truncate">{currentDate}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Today Banner & Active Office */}
          <div className="space-y-3 sm:space-y-4 mb-6">
            {isHoliday ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4 flex items-start gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-md flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-red-800 text-sm font-semibold">Hari ini adalah hari libur. Absensi dinonaktifkan.</p>
              </div>
            ) : todaySchedule ? (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-3 sm:p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-blue-700 font-bold mb-1.5">📅 Jadwal Hari Ini</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs sm:text-sm text-blue-900">
                      <span className="font-bold flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded-md border border-green-200">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-green-700">
                          {formatScheduleTime(todaySchedule?.start_time)} - {formatScheduleTime(todaySchedule?.on_time_end_time || todaySchedule?.start_time)}
                        </span>
                      </span>
                      <span className="font-bold flex items-center gap-1.5 bg-orange-50 px-2 py-1 rounded-md border border-orange-200">
                        <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-orange-700">
                          {formatScheduleTime(todaySchedule?.tolerance_start_time || todaySchedule?.on_time_end_time || todaySchedule?.start_time)} - {formatScheduleTime(todaySchedule?.tolerance_end_time || todaySchedule?.on_time_end_time || todaySchedule?.start_time)}
                        </span>
                      </span>
                      <span className="font-bold flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-md border border-blue-200">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Pulang: <span className="text-blue-700">{formatScheduleTime(todaySchedule?.end_time)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeOffice && (
              <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200 flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-100 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500">Lokasi kantor aktif</p>
                  <p className="text-slate-900 font-semibold truncate">{activeOffice.name}</p>
                  <p className="text-xs text-slate-500 truncate">{activeOffice.address || `${activeOffice.latitude}, ${activeOffice.longitude}`}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{distanceToOffice !== null ? `${distanceToOffice} m` : '—'}</p>
                  <p className="text-xs text-slate-500">Jarak Anda</p>
                </div>
              </div>
            )}
          </div>
          {/* Welcome Card */}
          {employee && (
            <div className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl sm:rounded-2xl p-6 sm:p-8 mb-6 shadow-lg">
              <div className="flex items-center gap-4 sm:gap-6">
                {employee.avatar_url ? (
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full shadow-xl border-4 border-white/30 overflow-hidden">
                    <Image 
                      src={employee.avatar_url} 
                      alt={employee.full_name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 80px, 96px"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/30 flex items-center justify-center text-white font-bold text-3xl shadow-xl">
                    {getInitials(employee.full_name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">Selamat Datang, {employee.full_name.split(' ')[0]}! 👋</h2>
                  <p className="text-white/80 text-sm sm:text-base">{employee.employee_code} • {employee.department || 'No Department'}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/20 text-white border border-white/30 rounded-md text-xs font-semibold">
                      {employee.position || 'Employee'}
                    </span>
                    {employee.face_encoding_path && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/30 text-white border border-green-400/50 rounded-md text-xs font-semibold">
                        ✓ Wajah Terlatih
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
            {/* Status Absensi Hari Ini */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  todayAttendance ? 'bg-green-100' : 'bg-slate-100'
                }`}>
                  <svg className={`w-6 h-6 ${todayAttendance ? 'text-green-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-medium">Status Hari Ini</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {todayAttendance ? (
                      todayAttendance.checkOutTime || todayAttendance.check_out_time ? 'Selesai' : 
                      (todayAttendance.status === 'late' ? 'Terlambat' : 'Hadir')
                    ) : 'Belum Absen'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {todayAttendance ? formatTime(todayAttendance.checkInTime || todayAttendance.check_in_time) : 'Belum check-in'}
                  </p>
                </div>
              </div>
            </div>

            {/* Check-in */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-medium">Check-in</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {todayAttendance ? formatTime(todayAttendance.checkInTime || todayAttendance.check_in_time) : '-'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Masuk kantor</p>
                </div>
              </div>
            </div>

            {/* Check-out */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-medium">Check-out</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {todayAttendance?.checkOutTime || todayAttendance?.check_out_time ? formatTime(todayAttendance.checkOutTime || todayAttendance.check_out_time) : '-'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Pulang kantor</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
            {/* Absensi */}
            <a
              href="/user/attendance"
              className="bg-white rounded-xl sm:rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:border-blue-200 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Absensi</h3>
                  <p className="text-sm text-slate-500">Check-in & Check-out</p>
                </div>
                <svg className="w-6 h-6 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>

            {/* Riwayat Absensi */}
            <a
              href="/user/history"
              className="bg-white rounded-xl sm:rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:border-blue-200 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Riwayat Absensi</h3>
                  <p className="text-sm text-slate-500">Lihat riwayat kehadiran</p>
                </div>
                <svg className="w-6 h-6 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>

            {/* Pengajuan Izin */}
            <a
              href="/user/leave"
              className="bg-white rounded-xl sm:rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-lg hover:border-blue-200 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">Pengajuan Izin</h3>
                  <p className="text-sm text-slate-500">Ajukan izin/cuti</p>
                </div>
                <svg className="w-6 h-6 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </a>
          </div>

          {/* Info Cards */}
          {!employee?.face_encoding_path && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 sm:p-6 mb-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-yellow-900 mb-1">Wajah Belum Dilatih</h3>
                  <p className="text-sm text-yellow-700 mb-3">Anda belum dapat melakukan absensi karena data wajah belum dilatih. Silakan lakukan training wajah terlebih dahulu.</p>
                  <a
                    href="/user/face-training"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Training Sekarang
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

