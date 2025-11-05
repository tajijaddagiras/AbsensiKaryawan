'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import UserSidebar, { SidebarToggleButton } from '@/components/UserSidebar';
import SkeletonCard from '@/components/SkeletonCard';
import { cachedFetch } from '@/lib/utils/apiCache';

export default function UserHistoryPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | '7days' | '30days'>('7days');

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
        await fetchEmployeeData(parsedUser.email);
      } catch (error) {
        console.error('Error fetching history data:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const fetchEmployeeData = async (email: string, forceRefresh: boolean = false) => {
    try {
      // Gunakan cached fetch dengan TTL 60 detik (60000ms) karena data employee jarang berubah
      const data = await cachedFetch(
        `/api/employees?email=${email}`,
        {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          }
        },
        60000, // TTL 60 detik
        forceRefresh
      );
      
      if (data.success && data.data.length > 0) {
        const emp = data.data[0];
        setEmployee(emp);
        // Fetch attendance history setelah employee didapat
        await fetchAttendanceHistory(emp.id);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    }
  };

  const fetchAttendanceHistory = async (employeeId: string, forceRefresh: boolean = false) => {
    try {
      // Gunakan cached fetch dengan TTL 30 detik (30000ms) untuk history
      const data = await cachedFetch(
        `/api/attendance/history?employee_id=${employeeId}&limit=100`,
        {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          }
        },
        30000, // TTL 30 detik
        forceRefresh
      );
      
      if (data.success) {
        setAttendanceHistory(data.data);
      }
    } catch (error) {
      console.error('Error fetching attendance history:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  // Helper function: Klasifikasi status detail berdasarkan data yang ada
  // Note: statusDetail tidak ada di database, jadi kita klasifikasi berdasarkan status dan notes
  const getStatusDetail = (record: any): 'on_time' | 'within_tolerance' | 'late_beyond' => {
    // Jika status === 'late', pasti late_beyond
    if (record.status === 'late') {
      return 'late_beyond';
    }
    
    // Jika status === 'present', cek notes untuk tahu apakah within_tolerance
    if (record.status === 'present') {
      // Jika ada notes tentang toleransi, berarti within_tolerance
      if (record.notes && (record.notes.includes('toleransi') || record.notes.includes('Toleransi'))) {
        return 'within_tolerance';
      }
      // Default untuk present adalah on_time
      return 'on_time';
    }
    
    // Default
    return 'on_time';
  };

  // Memoize filtered records untuk menghindari re-filtering yang tidak perlu
  const filteredRecords = useMemo(() => {
    const now = new Date();
    return attendanceHistory.filter((record) => {
      const recordDate = new Date(record.check_in_time);
      const diffDays = Math.floor((now.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (filter === '7days') return diffDays <= 7;
      if (filter === '30days') return diffDays <= 30;
      return true;
    });
  }, [attendanceHistory, filter]);

  // Memoize stats calculations untuk menghindari re-calculation yang tidak perlu
  const stats = useMemo(() => {
    return {
      total: filteredRecords.length,
      onTime: filteredRecords.filter(r => getStatusDetail(r) === 'on_time').length,
      withinTolerance: filteredRecords.filter(r => getStatusDetail(r) === 'within_tolerance').length,
      lateBeyond: filteredRecords.filter(r => getStatusDetail(r) === 'late_beyond').length,
    };
  }, [filteredRecords]);

  if (loading) {
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
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0"></div>
                  <div className="flex flex-col min-w-0">
                    <div className="h-6 bg-slate-200 rounded w-40 animate-pulse"></div>
                    <div className="h-4 bg-slate-200 rounded w-48 mt-1 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 animate-pulse">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-200 rounded-xl"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-200 rounded w-20"></div>
                      <div className="h-6 bg-slate-300 rounded w-12"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* History List Skeleton */}
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
              <div className="h-6 bg-slate-200 rounded w-40 mb-4 animate-pulse"></div>
              <div className="space-y-3">
                <SkeletonCard variant="attendance" count={5} />
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
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 truncate">Riwayat Absensi</h1>
                  <p className="text-xs sm:text-sm text-slate-500 truncate">Lihat riwayat kehadiran Anda</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Stats Summary - 5 Cards (Konsisten dengan Admin Dashboard) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6">
            {/* Card 1: Total Absensi */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-medium">Total Absensi</p>
                  <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                  <p className="text-xs text-slate-500 mt-1">Periode yang dipilih</p>
                </div>
              </div>
            </div>

            {/* Card 2: Tepat Waktu (BARU) */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-medium">Tepat Waktu</p>
                  <p className="text-2xl font-bold text-green-600">{stats.onTime}</p>
                  <p className="text-xs text-slate-500 mt-1">Masuk tepat waktu</p>
                </div>
              </div>
            </div>

            {/* Card 3: Dalam Toleransi (BARU) */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-medium">Dalam Toleransi</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.withinTolerance}</p>
                  <p className="text-xs text-slate-500 mt-1">Masuk dalam batas</p>
                </div>
              </div>
            </div>

            {/* Card 4: Terlambat */}
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500 font-medium">Terlambat</p>
                  <p className="text-2xl font-bold text-red-600">{stats.lateBeyond}</p>
                  <p className="text-xs text-slate-500 mt-1">Lewat batas toleransi</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 mb-6 shadow-sm border border-slate-200">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('7days')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  filter === '7days'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                7 Hari
              </button>
              <button
                onClick={() => setFilter('30days')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  filter === '30days'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                30 Hari
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  filter === 'all'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Semua
              </button>
            </div>
          </div>

          {/* Attendance List */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="bg-white rounded-xl sm:rounded-2xl p-12 text-center shadow-sm border border-slate-200">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Tidak Ada Riwayat</h3>
              <p className="text-slate-500">Belum ada data absensi untuk periode yang dipilih</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredRecords.map((record) => (
                <div key={record.id} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          record.status === 'present' 
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : record.status === 'late'
                            ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {record.status === 'present' ? '✓ Hadir' : record.status === 'late' ? '⏰ Terlambat' : '✕ Absen'}
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{formatDate(record.check_in_time)}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                          <p className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                            Check-in
                          </p>
                          <p className="text-lg font-bold text-slate-900">{formatTime(record.check_in_time)}</p>
                        </div>

                        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                          <p className="text-xs text-slate-500 font-medium mb-1 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Check-out
                          </p>
                          <p className="text-lg font-bold text-slate-900">
                            {record.check_out_time ? formatTime(record.check_out_time) : '-'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {record.face_match_score && (
                      <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-lg">
                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <p className="text-xs text-indigo-600 font-medium">Skor Verifikasi</p>
                          <p className="text-lg font-bold text-indigo-700">{record.face_match_score}%</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

