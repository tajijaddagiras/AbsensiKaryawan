'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AdminSidebar, { SidebarToggleButton } from '@/components/AdminSidebar';
import SuccessNotification from '@/components/SuccessNotification';
import ErrorNotification from '@/components/ErrorNotification';
import ConfirmationModal from '@/components/ConfirmationModal';
import SkeletonCard from '@/components/SkeletonCard';
import { cachedFetch } from '@/lib/utils/apiCache';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface LeaveRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string;
  employee_email: string;
  department: string;
  position: string;
  avatar_url?: string;
  leave_type: 'sick' | 'annual' | 'personal' | 'emergency';
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  attachment_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_by_name?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export default function LeaveRequestPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' });
  const [confirmApprove, setConfirmApprove] = useState<{
    show: boolean;
    request: LeaveRequest | null;
  }>({ show: false, request: null });
  const [confirmReject, setConfirmReject] = useState<{
    show: boolean;
    request: LeaveRequest | null;
  }>({ show: false, request: null });

  // Lock body scroll when modals are open
  useBodyScrollLock(showDetailModal || confirmApprove.show || confirmReject.show);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/admin');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'admin') {
      router.push('/user/dashboard');
      return;
    }

    setUser(parsedUser);
    fetchLeaveRequests();
  }, [router]);

  const fetchLeaveRequests = async (forceRefresh: boolean = false) => {
    try {
      setLoading(true);
      // Gunakan cached fetch dengan TTL 30 detik (30000ms)
      // Force refresh saat approve/reject untuk mendapatkan data terbaru
      const data = await cachedFetch(
        '/api/leave-requests',
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
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleApproveClick = (request: LeaveRequest) => {
    setConfirmApprove({ show: true, request });
  };

  const handleApproveConfirm = async (notes?: string) => {
    const request = confirmApprove.request;
    if (!request || !user) {
      setConfirmApprove({ show: false, request: null });
      return;
    }

    setConfirmApprove({ show: false, request: null });

    try {
      setLoading(true);
      const response = await fetch('/api/leave-requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: request.id,
          status: 'approved',
          admin_notes: notes && notes.trim() ? notes.trim() : null,
          reviewed_by: user.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNotification({ show: true, type: 'success', message: 'Pengajuan izin disetujui' });
        await fetchLeaveRequests(true); // Force refresh untuk mendapatkan data terbaru
        setShowDetailModal(false);
      } else {
        setNotification({ show: true, type: 'error', message: `Gagal menyetujui: ${data.message}` });
      }
    } catch (error) {
      console.error('Error approving leave request:', error);
      setNotification({ show: true, type: 'error', message: 'Terjadi kesalahan' });
    } finally {
      setLoading(false);
    }
  };

  const handleRejectClick = (request: LeaveRequest) => {
    setConfirmReject({ show: true, request });
  };

  const handleRejectConfirm = async (notes?: string) => {
    const request = confirmReject.request;
    if (!request || !user) {
      setConfirmReject({ show: false, request: null });
      return;
    }

    setConfirmReject({ show: false, request: null });

    try {
      setLoading(true);
      const response = await fetch('/api/leave-requests', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: request.id,
          status: 'rejected',
          admin_notes: notes && notes.trim() ? notes.trim() : null,
          reviewed_by: user.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNotification({ show: true, type: 'success', message: 'Pengajuan izin ditolak' });
        await fetchLeaveRequests(true); // Force refresh untuk mendapatkan data terbaru
        setShowDetailModal(false);
      } else {
        setNotification({ show: true, type: 'error', message: `Gagal menolak: ${data.message}` });
      }
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      setNotification({ show: true, type: 'error', message: 'Terjadi kesalahan' });
    } finally {
      setLoading(false);
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
        return { icon: '⏳', bgClass: 'bg-yellow-500 text-white' };
      case 'approved':
        return { icon: '✅', bgClass: 'bg-green-500 text-white' };
      case 'rejected':
        return { icon: '❌', bgClass: 'bg-red-500 text-white' };
      default:
        return { icon: '●', bgClass: 'bg-gray-500 text-white' };
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

  // Memoize filtered requests untuk menghindari re-filtering yang tidak perlu
  const filteredRequests = useMemo(() => {
    return leaveRequests.filter(req => 
      activeFilter === 'all' ? true : req.status === activeFilter
    );
  }, [leaveRequests, activeFilter]);

  // Memoize stats calculation untuk menghindari re-calculation yang tidak perlu
  const stats = useMemo(() => {
    return {
      total: leaveRequests.length,
      pending: leaveRequests.filter(r => r.status === 'pending').length,
      approved: leaveRequests.filter(r => r.status === 'approved').length,
      rejected: leaveRequests.filter(r => r.status === 'rejected').length,
    };
  }, [leaveRequests]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <AdminSidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

        <div className="lg:ml-64">
          {/* Header */}
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm">
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <SidebarToggleButton onClick={() => setIsSidebarOpen(true)} />
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0"></div>
                    <div className="flex flex-col min-w-0">
                      <div className="h-5 bg-slate-200 rounded w-40 animate-pulse"></div>
                      <div className="h-4 bg-slate-200 rounded w-32 mt-1 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
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

              {/* Filter Tabs Skeleton */}
              <div className="bg-white rounded-xl sm:rounded-2xl p-2 shadow-sm border border-slate-200 mb-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 bg-slate-200 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              </div>

              {/* Leave Request List Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                <SkeletonCard variant="leave" count={6} />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <AdminSidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />


      <div className="lg:ml-64">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Toggle + Title */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <SidebarToggleButton onClick={() => setIsSidebarOpen(true)} />
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 truncate">Pengajuan Izin</h2>
                  <p className="text-xs sm:text-sm text-slate-500 truncate">{currentDate}</p>
                </div>
              </div>
            </div>

            {/* Logout moved to sidebar */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-slate-500 text-xs sm:text-sm">Total</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-slate-500 text-xs sm:text-sm">Menunggu</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.pending}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-slate-500 text-xs sm:text-sm">Disetujui</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.approved}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="text-slate-500 text-xs sm:text-sm">Ditolak</p>
                <p className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.rejected}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-2 shadow-sm border border-slate-200 mb-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                activeFilter === 'all'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Semua ({stats.total})
            </button>
            <button
              onClick={() => setActiveFilter('pending')}
              className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                activeFilter === 'pending'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Menunggu ({stats.pending})
            </button>
            <button
              onClick={() => setActiveFilter('approved')}
              className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                activeFilter === 'approved'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Disetujui ({stats.approved})
            </button>
            <button
              onClick={() => setActiveFilter('rejected')}
              className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all ${
                activeFilter === 'rejected'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Ditolak ({stats.rejected})
            </button>
          </div>
        </div>

        {/* Leave Requests Grid - Clean & Professional */}
        {loading ? (
          <div className="bg-white rounded-xl sm:rounded-2xl p-12 text-center shadow-sm border border-slate-200">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 font-medium">Memuat data...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center shadow-sm border border-slate-200">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">Tidak Ada Pengajuan</h3>
            <p className="text-sm sm:text-base text-slate-500">Belum ada pengajuan izin untuk ditampilkan</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {filteredRequests.map((request) => {
              const typeInfo = getTypeLabel(request.leave_type);
              const statusInfo = getStatusInfo(request.status);
              return (
                <div key={request.id} className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-blue-200 transition-all overflow-hidden group">
                  {/* Card Header with Gradient */}
                  <div className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-3 sm:p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {request.avatar_url ? (
                          <div className="relative w-12 h-12 sm:w-13 sm:h-13 rounded-lg border-2 border-white/30 shadow-lg flex-shrink-0 overflow-hidden">
                            <Image 
                              src={request.avatar_url} 
                              alt={request.employee_name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 48px, 52px"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-lg bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-lg flex-shrink-0">
                            {request.employee_name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-white truncate">{request.employee_name}</h3>
                          <p className="text-xs text-white/80 truncate">{request.employee_code}</p>
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
                    {/* Type Info */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs text-slate-500 font-medium">Jenis Izin</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-xs font-semibold">
                        {typeInfo.icon}
                        <span>{typeInfo.text}</span>
                      </span>
                    </div>

                    {/* Details - 3 Columns (Compact) */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className="bg-slate-50 rounded-md p-1.5 border border-slate-100">
                        <p className="text-[10px] text-slate-500 font-medium mb-0.5">Mulai</p>
                        <p className="text-xs text-slate-900 truncate font-semibold">{new Date(request.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                      </div>
                      <div className="bg-slate-50 rounded-md p-1.5 border border-slate-100">
                        <p className="text-[10px] text-slate-500 font-medium mb-0.5">Selesai</p>
                        <p className="text-xs text-slate-900 truncate font-semibold">{new Date(request.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                      </div>
                      <div className="bg-slate-50 rounded-md p-1.5 border border-slate-100">
                        <p className="text-[10px] text-slate-500 font-medium mb-0.5">Durasi</p>
                        <p className="text-xs text-slate-900 truncate font-semibold">{request.days} hari</p>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="bg-slate-50 rounded-md p-2 border border-slate-100">
                      <p className="text-xs text-slate-500 font-medium mb-1">Alasan</p>
                      <p className="text-xs text-slate-700 line-clamp-2">{request.reason}</p>
                    </div>

                    {/* Action Buttons - 2x2 Grid */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        onClick={() => handleViewDetail(request)}
                        className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md text-blue-600 hover:text-blue-700 text-xs font-semibold transition-all flex items-center justify-center gap-1"
                        title="Detail"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>Detail</span>
                      </button>
                      
                      {request.status === 'pending' ? (
                        <>
                          <button
                            onClick={() => handleApproveClick(request)}
                            className="px-2.5 py-1.5 bg-green-50 hover:bg-green-100 border border-green-200 rounded-md text-green-600 hover:text-green-700 text-xs font-semibold transition-all flex items-center justify-center gap-1"
                            title="Setujui"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Setujui</span>
                          </button>
                          <button
                            onClick={() => handleRejectClick(request)}
                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md text-red-600 hover:text-red-700 text-xs font-semibold transition-all flex items-center justify-center gap-1 col-span-2"
                            title="Tolak"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>Tolak</span>
                          </button>
                        </>
                      ) : (
                        <div className="col-span-2 text-center py-1">
                          <span className="text-xs text-slate-400 italic">No action available</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal - Compact & Professional */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white rounded-xl sm:rounded-2xl max-w-lg w-full max-dvh-95 overflow-hidden animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            {/* Header - Compact */}
            <div className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {selectedRequest.avatar_url ? (
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 border-white/40 shadow-lg flex-shrink-0 overflow-hidden">
                      <Image 
                        src={selectedRequest.avatar_url} 
                        alt={selectedRequest.employee_name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 48px, 56px"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-lg flex-shrink-0">
                      {selectedRequest.employee_name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-white truncate">{selectedRequest.employee_name}</h2>
                    <p className="text-xs text-white/80 truncate">{selectedRequest.employee_code}</p>
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
                      <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <p className="text-xs text-slate-500 font-semibold">Lampiran</p>
                  </div>
                  <a 
                    href={selectedRequest.attachment_url} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-600 text-xs font-medium transition-all"
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

            {/* Actions - Compact */}
            {selectedRequest.status === 'pending' && (
              <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => handleApproveClick(selectedRequest)}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Memproses...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Setujui
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleRejectClick(selectedRequest)}
                    disabled={loading}
                    className="flex-1 bg-white hover:bg-red-50 border-2 border-red-500 text-red-600 hover:text-red-700 font-semibold py-2.5 px-4 rounded-lg transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                        Memproses...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Tolak
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* No Action for Approved/Rejected */}
            {selectedRequest.status !== 'pending' && (
              <div className="px-6 sm:px-8 py-5 bg-white border-t border-slate-200">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-xl transition-all"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Approve */}
      {confirmApprove.show && confirmApprove.request && (
        <ConfirmationModal
          isOpen={confirmApprove.show}
          title="✅ SETUJUI PENGAJUAN IZIN"
          message={`Apakah Anda yakin ingin menyetujui pengajuan izin ini?\n\nNama: ${confirmApprove.request.employee_name}\nKode Karyawan: ${confirmApprove.request.employee_code}\nJenis Izin: ${getTypeLabel(confirmApprove.request.leave_type).text}\nPeriode: ${formatDate(confirmApprove.request.start_date)} - ${formatDate(confirmApprove.request.end_date)}\nDurasi: ${confirmApprove.request.days} hari\nAlasan: ${confirmApprove.request.reason}`}
          confirmText="Ya, Setujui"
          cancelText="Batal"
          showNotesInput={true}
          notesLabel="Catatan"
          notesPlaceholder="Masukkan catatan untuk karyawan (opsional)"
          onConfirm={handleApproveConfirm}
          onCancel={() => setConfirmApprove({ show: false, request: null })}
        />
      )}

      {/* Confirmation Modal for Reject */}
      {confirmReject.show && confirmReject.request && (
        <ConfirmationModal
          isOpen={confirmReject.show}
          title="❌ TOLAK PENGAJUAN IZIN"
          message={`Apakah Anda yakin ingin menolak pengajuan izin ini?\n\nNama: ${confirmReject.request.employee_name}\nKode Karyawan: ${confirmReject.request.employee_code}\nJenis Izin: ${getTypeLabel(confirmReject.request.leave_type).text}\nPeriode: ${formatDate(confirmReject.request.start_date)} - ${formatDate(confirmReject.request.end_date)}\nDurasi: ${confirmReject.request.days} hari\nAlasan: ${confirmReject.request.reason}\n\n⚠️ Tindakan ini tidak dapat dibatalkan!`}
          confirmText="Ya, Tolak"
          cancelText="Batal"
          showNotesInput={true}
          notesLabel="Alasan Penolakan"
          notesPlaceholder="Masukkan alasan penolakan (opsional)"
          onConfirm={handleRejectConfirm}
          onCancel={() => setConfirmReject({ show: false, request: null })}
        />
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
      </main>
      </div>
    </div>
  );
}

