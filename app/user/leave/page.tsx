'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import UserSidebar, { SidebarToggleButton } from '@/components/UserSidebar';
import SuccessNotification from '@/components/SuccessNotification';
import ErrorNotification from '@/components/ErrorNotification';
import SkeletonCard from '@/components/SkeletonCard';
import { cachedFetch } from '@/lib/utils/apiCache';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: 'sick' | 'annual' | 'personal' | 'emergency';
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  attachment_url?: string;
  admin_notes?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
}

export default function UserLeavePage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' });
  const [formData, setFormData] = useState({
    leave_type: 'sick' as 'sick' | 'annual' | 'personal' | 'emergency',
    start_date: '',
    end_date: '',
    reason: '',
  });

  // Lock body scroll when modals are open
  useBodyScrollLock(showDetailModal || showFormModal);

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
        console.error('Error fetching leave data:', error);
      } finally {
        setInitialLoading(false);
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
        setEmployee(data.data[0]);
        // Fetch leave requests setelah employee didapat
        await fetchLeaveRequests(data.data[0].user_id);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    }
  };

  const fetchLeaveRequests = async (userId: string, forceRefresh: boolean = false) => {
    try {
      // Gunakan cached fetch dengan TTL 30 detik (30000ms)
      // Force refresh saat submit leave request untuk mendapatkan data terbaru
      const data = await cachedFetch(
        `/api/leave-requests?user_id=${userId}`,
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
        setLeaveRequests(data.data);
      }
    } catch (error) {
      console.error('Error fetching leave requests:', error);
    }
  };

  const calculateDays = () => {
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      // Calculate difference in days
      // 30 Oct to 31 Oct = 1 day (not 2)
      // Same day = 1 day
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      // If same day (diff = 0), count as 1 day
      // If different days, count the difference
      return diffDays === 0 ? 1 : (diffDays > 0 ? diffDays : 0);
    }
    return 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setNotification({ show: true, type: 'error', message: 'Data user tidak ditemukan' });
      return;
    }

    const days = calculateDays();
    if (days <= 0) {
      setNotification({ show: true, type: 'error', message: 'Tanggal tidak valid' });
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/leave-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          ...formData,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNotification({ show: true, type: 'success', message: 'Pengajuan izin berhasil dikirim!' });
        setShowFormModal(false);
        setFormData({
          leave_type: 'sick',
          start_date: '',
          end_date: '',
          reason: '',
        });
        // Refresh leave requests
        await fetchLeaveRequests(user.id, true); // Force refresh untuk mendapatkan data terbaru
      } else {
        setNotification({ show: true, type: 'error', message: data.message || 'Gagal mengirim pengajuan izin' });
      }
    } catch (error) {
      console.error('Error submitting leave request:', error);
      setNotification({ show: true, type: 'error', message: 'Terjadi kesalahan saat mengirim pengajuan izin' });
    } finally {
      setLoading(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'sick': return { text: 'Sakit', icon: '🤒', color: 'red' };
      case 'annual': return { text: 'Cuti Tahunan', icon: '🏖️', color: 'blue' };
      case 'personal': return { text: 'Izin Pribadi', icon: '📝', color: 'yellow' };
      case 'emergency': return { text: 'Darurat', icon: '🚨', color: 'orange' };
      default: return { text: type, icon: '📄', color: 'gray' };
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: '⏳', text: 'Menunggu', bgClass: 'bg-yellow-500 text-white' };
      case 'approved':
        return { icon: '✅', text: 'Disetujui', bgClass: 'bg-green-500 text-white' };
      case 'rejected':
        return { icon: '❌', text: 'Ditolak', bgClass: 'bg-red-500 text-white' };
      default:
        return { icon: '●', text: status, bgClass: 'bg-gray-500 text-white' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/30 font-semibold">⏳ Menunggu</span>;
      case 'approved':
        return <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30 font-semibold">✅ Disetujui</span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30 font-semibold">❌ Ditolak</span>;
      default:
        return <span className="px-3 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full border border-gray-500/30 font-semibold">{status}</span>;
    }
  };

  const handleViewDetail = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Memoize stats calculation untuk menghindari re-calculation yang tidak perlu
  const stats = useMemo(() => {
    return {
      total: leaveRequests.length,
      pending: leaveRequests.filter(r => r.status === 'pending').length,
      approved: leaveRequests.filter(r => r.status === 'approved').length,
      rejected: leaveRequests.filter(r => r.status === 'rejected').length,
    };
  }, [leaveRequests]);

  if (initialLoading) {
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
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0"></div>
                  <div className="flex flex-col min-w-0">
                    <div className="h-6 bg-slate-200 rounded w-40 animate-pulse"></div>
                    <div className="h-4 bg-slate-200 rounded w-32 mt-1 animate-pulse"></div>
                  </div>
                </div>
                <div className="h-10 bg-slate-200 rounded-xl w-24 animate-pulse"></div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 animate-pulse">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-200 rounded w-16"></div>
                      <div className="h-6 bg-slate-300 rounded w-12"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Leave Request List Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              <SkeletonCard variant="leave" count={6} />
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
              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                <SidebarToggleButton onClick={() => setIsSidebarOpen(true)} />
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 truncate">Pengajuan Izin</h1>
                  <p className="text-xs sm:text-sm text-slate-500 truncate">Ajukan izin/cuti Anda</p>
                </div>
              </div>

              <button
                onClick={() => setShowFormModal(true)}
                className="px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2 flex-shrink-0"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Ajukan Izin</span>
                <span className="sm:hidden">Baru</span>
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 font-medium">Total</p>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.total}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 font-medium">Menunggu</p>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.pending}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 font-medium">Disetujui</p>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.approved}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-500 font-medium">Ditolak</p>
                  <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.rejected}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Leave Requests List */}
          {loading ? (
            <div className="bg-white rounded-xl sm:rounded-2xl p-12 text-center shadow-sm border border-slate-200">
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600 font-medium">Memuat data...</p>
            </div>
          ) : leaveRequests.length === 0 ? (
            <div className="bg-white rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center shadow-sm border border-slate-200">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">Belum Ada Pengajuan</h3>
              <p className="text-sm sm:text-base text-slate-500 mb-6">Klik tombol "Ajukan Izin" untuk membuat pengajuan baru</p>
              <button
                onClick={() => setShowFormModal(true)}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold rounded-xl transition-all shadow-md hover:shadow-lg inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajukan Izin Pertama
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {leaveRequests.map((request) => {
                const typeInfo = getTypeLabel(request.leave_type);
                const statusInfo = getStatusInfo(request.status);
                return (
                  <div key={request.id} className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-purple-200 transition-all overflow-hidden group">
                    {/* Card Header with Gradient */}
                    <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-rose-600 p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <div className="text-2xl">{typeInfo.icon}</div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-base font-bold text-white truncate">{typeInfo.text}</h3>
                            <p className="text-xs text-white/80 truncate">{request.days} hari</p>
                          </div>
                        </div>
                        
                        {/* Status Badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold shadow-sm flex-shrink-0 ${statusInfo.bgClass}`}>
                          <span className="text-xs">{statusInfo.icon}</span>
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-3 sm:p-4 space-y-2.5">
                      {/* Dates - 2 Columns */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-50 rounded-md p-2 border border-slate-100">
                          <p className="text-xs text-slate-500 font-medium mb-0.5">Mulai</p>
                          <p className="text-xs text-slate-900 truncate font-medium">{new Date(request.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                        </div>
                        <div className="bg-slate-50 rounded-md p-2 border border-slate-100">
                          <p className="text-xs text-slate-500 font-medium mb-0.5">Selesai</p>
                          <p className="text-xs text-slate-900 truncate font-medium">{new Date(request.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                        </div>
                      </div>

                      {/* Reason */}
                      <div className="bg-slate-50 rounded-md p-2 border border-slate-100">
                        <p className="text-xs text-slate-500 font-medium mb-1">Alasan</p>
                        <p className="text-xs text-slate-700 line-clamp-2">{request.reason}</p>
                      </div>

                      {/* Admin Notes (if rejected or approved) */}
                      {request.admin_notes && (
                        <div className="bg-indigo-50 rounded-md p-2 border border-indigo-200">
                          <p className="text-xs text-indigo-600 font-medium mb-1">Catatan Admin</p>
                          <p className="text-xs text-indigo-700 line-clamp-2">{request.admin_notes}</p>
                        </div>
                      )}

                      {/* Submitted Date */}
                      <div className="pt-2 border-t border-slate-100">
                        <p className="text-xs text-slate-500">
                          Diajukan: {formatDate(request.created_at)}
                        </p>
                        {request.reviewed_at && (
                          <p className="text-xs text-slate-500 mt-1">
                            Direview: {formatDate(request.reviewed_at)}
                          </p>
                        )}
                      </div>

                      {/* Action Buttons - Detail Button */}
                      <div className="pt-2 border-t border-slate-100">
                        <button
                          onClick={() => handleViewDetail(request)}
                          className="w-full px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-md text-purple-600 hover:text-purple-700 text-xs font-semibold transition-all flex items-center justify-center gap-1"
                          title="Detail"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>Detail</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal - Compact & Professional */}
      {showDetailModal && selectedRequest && employee && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white rounded-xl sm:rounded-2xl max-w-lg w-full max-dvh-95 overflow-hidden animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            {/* Header - Compact */}
            <div className="bg-gradient-to-br from-purple-500 via-pink-500 to-rose-600 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {employee.avatar_url ? (
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 border-white/40 shadow-lg flex-shrink-0 overflow-hidden">
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
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-lg flex-shrink-0">
                      {employee.full_name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-white truncate">{employee.full_name}</h2>
                    <p className="text-xs text-white/80 truncate">{employee.employee_code}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-white/70 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all flex-shrink-0"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content - Compact */}
            <div className="p-4 sm:p-5 bg-slate-50 space-y-3 max-h-[65dvh] overflow-y-auto custom-scrollbar">
              {/* Status & Type */}
              <div className="grid grid-cols-2 gap-3 min-w-0">
                <div className="bg-white rounded-lg p-3 border border-slate-200 min-w-0">
                  <p className="text-xs text-slate-500 font-medium mb-1.5">Status</p>
                  {getStatusBadge(selectedRequest.status)}
                </div>
                <div className="bg-white rounded-lg p-3 border border-slate-200 min-w-0">
                  <p className="text-xs text-slate-500 font-medium mb-1.5">Jenis Izin</p>
                  <p className="text-sm font-semibold text-slate-900 break-words">{getTypeLabel(selectedRequest.leave_type).text}</p>
                </div>
              </div>

              {/* Period & Duration */}
              <div className="bg-white rounded-lg p-3 sm:p-4 border border-slate-200 min-w-0">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-xs text-slate-500 font-semibold">Periode</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900 mb-0.5 break-words">{formatDate(selectedRequest.start_date)}</p>
                    <p className="text-xs text-slate-500 break-words">{formatDate(selectedRequest.end_date)}</p>
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-xs text-slate-500 font-semibold">Durasi</p>
                    </div>
                    <p className="text-xl sm:text-2xl font-bold text-slate-900 break-words">{selectedRequest.days}</p>
                    <p className="text-xs text-slate-500 break-words">hari</p>
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="bg-white rounded-lg p-3 border border-slate-200 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <svg className="w-4 h-4 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-xs text-slate-500 font-semibold">Alasan</p>
                </div>
                <p className="text-sm text-slate-700 break-words whitespace-pre-wrap">{selectedRequest.reason}</p>
              </div>

              {/* Admin Notes (if reviewed) */}
              {selectedRequest.admin_notes && (
                <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-200 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <svg className="w-4 h-4 text-indigo-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    <p className="text-xs text-indigo-700 font-semibold">Catatan Admin</p>
                  </div>
                  <p className="text-sm text-indigo-900 break-words whitespace-pre-wrap">{selectedRequest.admin_notes}</p>
                  {selectedRequest.reviewed_by_name && (
                    <p className="text-xs text-indigo-600 mt-2 break-words">— {selectedRequest.reviewed_by_name}</p>
                  )}
                </div>
              )}

              {/* Attachment */}
              {selectedRequest.attachment_url && (
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-purple-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <p className="text-xs text-slate-500 font-semibold">Lampiran</p>
                  </div>
                  <a 
                    href={selectedRequest.attachment_url} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-purple-600 text-xs font-medium transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="truncate">Lihat Lampiran</span>
                  </a>
                </div>
              )}

              {/* Submitted Date */}
              <div className="bg-slate-100 rounded-lg p-3 border border-slate-200 min-w-0">
                <p className="text-xs text-slate-500 mb-1">Diajukan pada</p>
                <p className="text-sm font-semibold text-slate-700 break-words">{formatDate(selectedRequest.created_at)}</p>
                {selectedRequest.reviewed_at && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <p className="text-xs text-slate-500 mb-0.5">Direview pada</p>
                    <p className="text-sm font-medium text-slate-600 break-words">{formatDate(selectedRequest.reviewed_at)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer - Close Button */}
            <div className="px-6 sm:px-8 py-5 bg-white border-t border-slate-200">
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-xl transition-all"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" onClick={() => setShowFormModal(false)}>
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 max-w-sm sm:max-w-md w-full shadow-2xl border border-slate-200 max-dvh-95 overflow-y-auto custom-scrollbar animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Ajukan Izin Baru
              </h2>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-lg"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
              {/* Type */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="block text-slate-700 text-xs sm:text-sm font-semibold">
                  Jenis Izin
                </label>
                <div className="relative">
                  <select
                    value={formData.leave_type}
                    onChange={(e) => setFormData({ ...formData, leave_type: e.target.value as any })}
                    className="w-full bg-white border border-slate-300 rounded-lg shadow-sm px-3 sm:px-4 py-2.5 sm:py-3 pr-11 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40 transition-all appearance-none min-h-[3rem]"
                    required
                  >
                    <option value="sick">🤒 Sakit</option>
                    <option value="annual">🏖️ Cuti Tahunan</option>
                    <option value="personal">📝 Izin Pribadi</option>
                    <option value="emergency">🚨 Darurat</option>
                  </select>
                  <svg
                    className="pointer-events-none absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="block text-slate-700 text-xs sm:text-sm font-semibold">
                    Tanggal Mulai
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg shadow-sm px-3 sm:px-4 py-2.5 sm:py-3 pr-12 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40 transition-all min-h-[3rem]"
                      required
                    />
                    <svg
                      className="pointer-events-none absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-500/70"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V5m8 2V5m-9 8h10m-7 4h4m-9 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <label className="block text-slate-700 text-xs sm:text-sm font-semibold">
                    Tanggal Selesai
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg shadow-sm px-3 sm:px-4 py-2.5 sm:py-3 pr-12 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40 transition-all min-h-[3rem]"
                      required
                    />
                    <svg
                      className="pointer-events-none absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-purple-500/70"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V5m8 2V5m-9 8h10m-7 4h4m-9 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Duration */}
              {formData.start_date && formData.end_date && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-sm text-purple-700">
                    <strong>Durasi:</strong> {calculateDays()} hari
                  </p>
                </div>
              )}

              {/* Reason */}
              <div className="space-y-1.5 sm:space-y-2">
                <label className="block text-slate-700 text-xs sm:text-sm font-semibold">
                  Alasan
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg shadow-sm px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40 transition-all resize-none min-h-[140px]"
                  rows={4}
                  placeholder="Jelaskan alasan pengajuan izin Anda..."
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all text-sm sm:text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Ajukan
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  disabled={loading}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl border border-slate-300 transition-all text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notifications */}
      {notification.type === 'success' && (
        <SuccessNotification
          isOpen={notification.show}
          message={notification.message}
          onClose={() => setNotification({ show: false, type: 'success', message: '' })}
        />
      )}
      {notification.type === 'error' && (
        <ErrorNotification
          isOpen={notification.show}
          message={notification.message}
          onClose={() => setNotification({ show: false, type: 'error', message: '' })}
        />
      )}
    </div>
  );
}

