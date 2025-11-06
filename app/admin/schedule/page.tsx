'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar, { SidebarToggleButton } from '@/components/AdminSidebar';
import SuccessNotification from '@/components/SuccessNotification';
import ErrorNotification from '@/components/ErrorNotification';
import ConfirmationModal from '@/components/ConfirmationModal';
import SkeletonCard from '@/components/SkeletonCard';
import { cachedFetch } from '@/lib/utils/apiCache';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface WorkSchedule {
  id: string;
  day_of_week: number;
  day_name: string;
  start_time: string;
  on_time_end_time: string | null;
  tolerance_start_time: string | null;
  tolerance_end_time: string | null;
  end_time: string;
  is_active: boolean;
  late_tolerance_minutes: number;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'national' | 'company';
  description?: string | null;
  is_active?: boolean;
}

interface Policy {
  id: string;
  title: string;
  description: string;
  category: 'attendance' | 'leave' | 'general';
}

// Helpers to convert time string <-> minutes from 00:00
const timeStringToMinutes = (t: string): number => {
  if (!t) return 0;
  const [hh, mm] = t.split(':').map((p) => parseInt(p || '0', 10));
  return (isNaN(hh) ? 0 : hh) * 60 + (isNaN(mm) ? 0 : mm);
};

const minutesToTimeString = (m: number): string => {
  const mm = ((m % (24 * 60)) + (24 * 60)) % (24 * 60); // clamp into 0..1439
  const hhPart = Math.floor(mm / 60);
  const mmPart = mm % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(hhPart)}:${pad(mmPart)}`;
};

export default function SchedulePolicyPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'schedule' | 'holidays' | 'policies'>('schedule');
  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  
  // Schedule State
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule[]>([]);

  // Holidays State
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // Policies State
  const [policies, setPolicies] = useState<Policy[]>([]);

  // Loading State
  const [loading, setLoading] = useState(true);

  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [showAddHolidayModal, setShowAddHolidayModal] = useState(false);
  const [showAddPolicyModal, setShowAddPolicyModal] = useState(false);
  const [showEditHolidayModal, setShowEditHolidayModal] = useState(false);
  const [showEditPolicyModal, setShowEditPolicyModal] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [confirmDeleteHoliday, setConfirmDeleteHoliday] = useState<{
    show: boolean;
    holiday: Holiday | null;
  }>({ show: false, holiday: null });
  const [confirmDeletePolicy, setConfirmDeletePolicy] = useState<{
    show: boolean;
    policy: Policy | null;
  }>({ show: false, policy: null });
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' });

  // Lock body scroll when modals are open
  useBodyScrollLock(showAddHolidayModal || showEditHolidayModal || showAddPolicyModal || showEditPolicyModal);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

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

    // Fetch data from database
    (async () => {
      try {
        await Promise.all([
          fetchWorkSchedules(),
          fetchHolidays(),
          fetchPolicies(),
        ]);
      } catch (error) {
        console.error('Error fetching schedule data:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const fetchWorkSchedules = async (forceRefresh: boolean = false) => {
    try {
      // Gunakan cached fetch dengan TTL 60 detik (60000ms) karena data jarang berubah
      const data = await cachedFetch(
        '/api/work-schedules',
        {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          }
        },
        60000, // TTL 60 detik
        forceRefresh
      );
      if (data.success) {
        setWorkSchedule(data.data);
      }
    } catch (error) {
      console.error('Error fetching work schedules:', error);
    }
  };

  const fetchHolidays = async (forceRefresh: boolean = false) => {
    try {
      // Gunakan cached fetch dengan TTL 60 detik (60000ms) karena data jarang berubah
      const data = await cachedFetch(
        '/api/holidays',
        {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          }
        },
        60000, // TTL 60 detik
        forceRefresh
      );
      if (data.success) {
        setHolidays(data.data);
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
    }
  };

  const fetchPolicies = async (forceRefresh: boolean = false) => {
    try {
      // Gunakan cached fetch dengan TTL 60 detik (60000ms) karena data jarang berubah
      const data = await cachedFetch(
        '/api/policies',
        {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          }
        },
        60000, // TTL 60 detik
        forceRefresh
      );
      if (data.success) {
        setPolicies(data.data);
      }
    } catch (error) {
      console.error('Error fetching policies:', error);
    }
  };

  const handleUpdateSchedule = (id: string, field: 'start_time' | 'end_time' | 'on_time_end_time' | 'tolerance_start_time' | 'tolerance_end_time' | 'is_active', value: any) => {
    setWorkSchedule(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSaveSchedule = async () => {
    try {
      // Update all schedules
      for (const schedule of workSchedule) {
        await fetch('/api/work-schedules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(schedule),
        });
      }
      setNotification({ show: true, type: 'success', message: 'Jadwal kerja berhasil disimpan!' });
      fetchWorkSchedules(true); // Force refresh untuk mendapatkan data terbaru
    } catch (error) {
      console.error('Error saving schedules:', error);
      setNotification({ show: true, type: 'error', message: 'Gagal menyimpan jadwal kerja' });
    }
  };

  const handleAddHoliday = async (holidayData: { name: string; date: string; type: string; description?: string }) => {
    try {
      const response = await fetch('/api/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holidayData),
      });
      const data = await response.json();
      if (data.success) {
        setNotification({ show: true, type: 'success', message: 'Hari libur berhasil ditambahkan!' });
        fetchHolidays(true); // Force refresh untuk mendapatkan data terbaru
        setShowAddHolidayModal(false);
      } else {
        setNotification({ show: true, type: 'error', message: data.error || 'Gagal menambahkan hari libur' });
      }
    } catch (error) {
      console.error('Error adding holiday:', error);
      setNotification({ show: true, type: 'error', message: 'Gagal menambahkan hari libur' });
    }
  };

  const handleEditHoliday = async (holidayData: { id: string; name: string; date: string; type: string; description?: string }) => {
    try {
      const response = await fetch('/api/holidays', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holidayData),
      });
      const data = await response.json();
      if (data.success) {
        setNotification({ show: true, type: 'success', message: 'Hari libur berhasil diupdate!' });
        fetchHolidays(true); // Force refresh untuk mendapatkan data terbaru
        setShowEditHolidayModal(false);
        setEditingHoliday(null);
      } else {
        setNotification({ show: true, type: 'error', message: data.error || 'Gagal mengupdate hari libur' });
      }
    } catch (error) {
      console.error('Error updating holiday:', error);
      setNotification({ show: true, type: 'error', message: 'Gagal mengupdate hari libur' });
    }
  };

  const handleDeleteHoliday = (holiday: Holiday) => {
    setConfirmDeleteHoliday({ show: true, holiday });
  };

  const handleDeleteHolidayConfirm = async () => {
    if (!confirmDeleteHoliday.holiday) return;
    
    try {
      const response = await fetch(`/api/holidays?id=${confirmDeleteHoliday.holiday.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setNotification({ show: true, type: 'success', message: 'Hari libur berhasil dihapus!' });
        fetchHolidays(true); // Force refresh untuk mendapatkan data terbaru
      } else {
        setNotification({ show: true, type: 'error', message: data.error || 'Gagal menghapus hari libur' });
      }
    } catch (error) {
      console.error('Error deleting holiday:', error);
      setNotification({ show: true, type: 'error', message: 'Gagal menghapus hari libur' });
    } finally {
      setConfirmDeleteHoliday({ show: false, holiday: null });
    }
  };

  const handleAddPolicy = async (policyData: { title: string; description: string; category: string }) => {
    try {
      const response = await fetch('/api/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policyData),
      });
      const data = await response.json();
      if (data.success) {
        setNotification({ show: true, type: 'success', message: 'Kebijakan berhasil ditambahkan!' });
        fetchPolicies(true); // Force refresh untuk mendapatkan data terbaru
        setShowAddPolicyModal(false);
      } else {
        setNotification({ show: true, type: 'error', message: data.error || 'Gagal menambahkan kebijakan' });
      }
    } catch (error) {
      console.error('Error adding policy:', error);
      setNotification({ show: true, type: 'error', message: 'Gagal menambahkan kebijakan' });
    }
  };

  const handleEditPolicy = async (policyData: { id: string; title: string; description: string; category: string }) => {
    try {
      const response = await fetch('/api/policies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policyData),
      });
      const data = await response.json();
      if (data.success) {
        setNotification({ show: true, type: 'success', message: 'Kebijakan berhasil diupdate!' });
        fetchPolicies(true); // Force refresh untuk mendapatkan data terbaru
        setShowEditPolicyModal(false);
        setEditingPolicy(null);
      } else {
        setNotification({ show: true, type: 'error', message: data.error || 'Gagal mengupdate kebijakan' });
      }
    } catch (error) {
      console.error('Error updating policy:', error);
      setNotification({ show: true, type: 'error', message: 'Gagal mengupdate kebijakan' });
    }
  };

  const handleDeletePolicy = (policy: Policy) => {
    setConfirmDeletePolicy({ show: true, policy });
  };

  const handleDeletePolicyConfirm = async () => {
    if (!confirmDeletePolicy.policy) return;
    
    try {
      const response = await fetch(`/api/policies?id=${confirmDeletePolicy.policy.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        setNotification({ show: true, type: 'success', message: 'Kebijakan berhasil dihapus!' });
        fetchPolicies(true); // Force refresh untuk mendapatkan data terbaru
      } else {
        setNotification({ show: true, type: 'error', message: data.error || 'Gagal menghapus kebijakan' });
      }
    } catch (error) {
      console.error('Error deleting policy:', error);
      setNotification({ show: true, type: 'error', message: 'Gagal menghapus kebijakan' });
    } finally {
      setConfirmDeletePolicy({ show: false, policy: null });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <AdminSidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

        <div className="lg:ml-64">
          {/* Header */}
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm">
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 lg:flex-none">
                  <SidebarToggleButton onClick={() => setIsSidebarOpen(true)} />
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center"></div>
                    <div className="flex flex-col min-w-0">
                      <div className="h-6 bg-slate-200 rounded w-48 animate-pulse"></div>
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
              {/* Tabs Skeleton */}
              <div className="mb-6">
                <div className="bg-white rounded-xl sm:rounded-2xl p-2 shadow-sm border border-slate-200">
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-10 bg-slate-200 rounded-lg animate-pulse"></div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Info Box Skeleton */}
              <div className="mb-6 bg-slate-100 border border-slate-200 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-slate-200 rounded w-5/6"></div>
              </div>

              {/* Schedule List Skeleton */}
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
                <div className="h-6 bg-slate-200 rounded w-48 mb-6 animate-pulse"></div>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div key={i} className="bg-slate-50 rounded-lg p-4 border border-slate-200 animate-pulse">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                          <div className="space-y-2">
                            <div className="h-4 bg-slate-200 rounded w-24"></div>
                            <div className="h-3 bg-slate-200 rounded w-20"></div>
                          </div>
                        </div>
                        <div className="h-6 w-11 bg-slate-200 rounded-full"></div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[1, 2, 3, 4].map((j) => (
                          <div key={j} className="h-16 bg-slate-200 rounded-lg"></div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
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
          <div className="flex items-center justify-between">
            {/* Page Title */}
            <div className="flex items-center gap-3 flex-1 lg:flex-none">
              <SidebarToggleButton onClick={() => setIsSidebarOpen(true)} />
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">Jadwal & Kebijakan</h2>
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

        {/* Tabs */}
        <div className="mb-6">
          <div className="bg-white rounded-xl sm:rounded-2xl p-2 shadow-sm border border-slate-200">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'schedule'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="hidden sm:inline">⏰ Jadwal</span>
                <span className="sm:hidden">Jadwal</span>
              </button>
              <button
                onClick={() => setActiveTab('holidays')}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'holidays'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="hidden sm:inline">🏖️ Libur</span>
                <span className="sm:hidden">Libur</span>
              </button>
              <button
                onClick={() => setActiveTab('policies')}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === 'policies'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="hidden sm:inline">📋 Kebijakan</span>
                <span className="sm:hidden">Kebijakan</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'schedule' && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Jadwal Kerja Mingguan</span>
              </h2>
            </div>

            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-700 text-sm flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1 a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>
                  <strong>Jadwal & Toleransi:</strong> Sistem akan otomatis menandai karyawan sebagai "terlambat" jika check-in melebihi toleransi yang ditentukan. Contoh: Jam masuk 09:00 dengan toleransi 15 menit = status "late" jika check-in di atas 09:15.
                </span>
              </p>
            </div>

            <div className="space-y-3">
              {([...workSchedule]
                .sort((a, b) => {
                  const ao = a.day_of_week === 0 ? 7 : a.day_of_week; // 1..6,7 (Mon..Sun)
                  const bo = b.day_of_week === 0 ? 7 : b.day_of_week;
                  return ao - bo;
                })
              ).map((schedule) => (
                <div key={schedule.id} className={`rounded-lg sm:rounded-xl p-4 sm:p-5 border transition-all ${
                  schedule.is_active 
                    ? 'bg-green-50 border-green-200 hover:shadow-md' 
                    : 'bg-slate-50 border-slate-200 hover:shadow-md'
                }`}>
                  <div className="flex flex-col gap-4">
                    {/* Header Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm ${
                          schedule.is_active 
                            ? 'bg-green-500 text-white' 
                            : 'bg-slate-300 text-slate-600'
                        }`}>
                          {schedule.day_name.substring(0, 3)}
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-slate-900">{schedule.day_name}</h3>
                          <p className={`text-xs font-medium ${
                            schedule.is_active ? 'text-green-600' : 'text-slate-500'
                          }`}>
                            {schedule.is_active ? 'Hari Kerja' : 'Hari Libur'}
                          </p>
                        </div>
                      </div>

                      {/* Toggle Switch */}
                      <button
                        onClick={() => handleUpdateSchedule(schedule.id, 'is_active', !schedule.is_active)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                          schedule.is_active 
                            ? 'bg-green-500 focus:ring-green-500' 
                            : 'bg-slate-300 focus:ring-slate-400'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            schedule.is_active ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Rentang Jam Masuk */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Rentang Jam Masuk</label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="block text-[11px] text-slate-500 mb-1">Dari</span>
                            <input
                              type="time"
                              value={schedule.start_time}
                              onChange={(e) => handleUpdateSchedule(schedule.id, 'start_time', e.target.value)}
                              disabled={!schedule.is_active}
                              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                            />
                          </div>
                          <div>
                            <span className="block text-[11px] text-slate-500 mb-1">Sampai</span>
                            {(() => {
                              // Gunakan on_time_end_time jika ada, jika tidak hitung dari start_time + tol (backward compat)
                              let onTimeEnd = schedule.on_time_end_time;
                              if (!onTimeEnd) {
                                const startMin = timeStringToMinutes(schedule.start_time);
                                const tol = schedule.late_tolerance_minutes || 0;
                                onTimeEnd = minutesToTimeString(startMin + tol);
                              }
                              return (
                                <input
                                  type="time"
                                  value={onTimeEnd}
                                  onChange={(e) => {
                                    handleUpdateSchedule(schedule.id, 'on_time_end_time', e.target.value);
                                  }}
                                  disabled={!schedule.is_active}
                                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                                />
                              );
                            })()}
                          </div>
                        </div>
                        
                      </div>

                      
                      {/* Rentang Toleransi */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Rentang Toleransi</label>
                        <div className="grid grid-cols-2 gap-2">
                          {(() => {
                            // Gunakan tolerance_start_time jika ada, jika tidak hitung dari on_time_end_time atau start_time + tol
                            let toleranceStart = schedule.tolerance_start_time;
                            if (!toleranceStart) {
                              if (schedule.on_time_end_time) {
                                toleranceStart = schedule.on_time_end_time;
                              } else {
                                const startMin = timeStringToMinutes(schedule.start_time);
                                const tol = schedule.late_tolerance_minutes || 0;
                                toleranceStart = minutesToTimeString(startMin + tol);
                              }
                            }
                            
                            // Gunakan tolerance_end_time jika ada, jika tidak hitung dari tolerance_start_time + tol
                            let toleranceEnd = schedule.tolerance_end_time;
                            if (!toleranceEnd) {
                              const tolStartMin = timeStringToMinutes(toleranceStart);
                              const tol = schedule.late_tolerance_minutes || 0;
                              toleranceEnd = minutesToTimeString(tolStartMin + tol);
                            }
                            
                            return (
                              <>
                                <div>
                                  <span className="block text-[11px] text-slate-500 mb-1">Dari</span>
                                  <input
                                    type="time"
                                    value={toleranceStart}
                                    onChange={(e) => {
                                      handleUpdateSchedule(schedule.id, 'tolerance_start_time', e.target.value);
                                    }}
                                    disabled={!schedule.is_active}
                                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                                  />
                                </div>
                                <div>
                                  <span className="block text-[11px] text-slate-500 mb-1">Sampai</span>
                                  <input
                                    type="time"
                                    value={toleranceEnd}
                                    onChange={(e) => {
                                      handleUpdateSchedule(schedule.id, 'tolerance_end_time', e.target.value);
                                    }}
                                    disabled={!schedule.is_active}
                                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                                  />
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        
                      </div>

                      {/* Jam Pulang */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1.5">Jam Pulang</label>
                        <div>
                          <span className="block text-[11px] text-slate-500 mb-1">Default</span>
                          <input
                            type="time"
                            value={schedule.end_time}
                            onChange={(e) => handleUpdateSchedule(schedule.id, 'end_time', e.target.value)}
                            disabled={!schedule.is_active}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex sm:justify-end">
              <button
                onClick={handleSaveSchedule}
                className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="hidden sm:inline">Simpan Perubahan</span>
                <span className="sm:hidden">Simpan</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'holidays' && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span>Daftar Hari Libur</span>
              </h2>
              <button
                onClick={() => setShowAddHolidayModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Tambah Libur
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {holidays.map((holiday) => (
                <div key={holiday.id} className="bg-slate-50 rounded-lg sm:rounded-xl p-4 sm:p-5 border border-slate-200 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-slate-900 font-bold text-base mb-1">{holiday.name}</h3>
                      <p className="text-slate-500 text-sm flex items-center gap-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{formatDate(holiday.date)}</span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingHoliday(holiday);
                          setShowEditHolidayModal(true);
                        }}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-all text-blue-600 flex-shrink-0"
                        title="Edit"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteHoliday(holiday)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-all text-red-600 flex-shrink-0"
                        title="Hapus"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold border ${
                    holiday.type === 'national' 
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-purple-50 text-purple-700 border-purple-200'
                  }`}>
                    <span>{holiday.type === 'national' ? '🇮🇩' : '🏢'}</span>
                    <span>{holiday.type === 'national' ? 'Nasional' : 'Perusahaan'}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'policies' && (
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Kebijakan Perusahaan</span>
              </h2>
              <button
                onClick={() => setShowAddPolicyModal(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Tambah Kebijakan
              </button>
            </div>

            <div className="space-y-4">
              {policies.map((policy) => (
                <div key={policy.id} className="bg-slate-50 rounded-lg sm:rounded-xl p-4 sm:p-5 border border-slate-200 hover:shadow-md transition-all">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                        <h3 className="text-slate-900 font-bold text-base sm:text-lg">{policy.title}</h3>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold border ${
                          policy.category === 'attendance' 
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : policy.category === 'leave'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-orange-50 text-orange-700 border-orange-200'
                        }`}>
                          <span>{policy.category === 'attendance' ? '⏰' : policy.category === 'leave' ? '🏖️' : '📋'}</span>
                          <span>{policy.category === 'attendance' ? 'Absensi' : policy.category === 'leave' ? 'Cuti' : 'Umum'}</span>
                        </span>
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed text-justify">{policy.description}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingPolicy(policy);
                          setShowEditPolicyModal(true);
                        }}
                        className="p-2 hover:bg-blue-100 rounded-lg transition-all text-blue-600 flex-shrink-0"
                        title="Edit"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeletePolicy(policy)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-all text-red-600 flex-shrink-0"
                        title="Hapus"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </main>

      {/* Add Holiday Modal */}
      {showAddHolidayModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-dvh-90 overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Tambah Hari Libur
                </h3>
                <button
                  onClick={() => setShowAddHolidayModal(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddHoliday({
                name: formData.get('name') as string,
                date: formData.get('date') as string,
                type: formData.get('type') as string,
                description: formData.get('description') as string,
              });
            }} className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nama Hari Libur <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g., Tahun Baru 2026"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/50 transition-all"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Tanggal <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/50 transition-all"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Tipe <span className="text-red-500">*</span>
                </label>
                <select
                  name="type"
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/50 transition-all"
                >
                  <option value="national">Libur Nasional</option>
                  <option value="company">Libur Perusahaan</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Deskripsi (Optional)
                </label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="e.g., Hari libur nasional..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/50 transition-all resize-none"
                ></textarea>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddHolidayModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Holiday Modal */}
      {showEditHolidayModal && editingHoliday && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-dvh-90 overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Hari Libur
                </h3>
                <button
                  onClick={() => {
                    setShowEditHolidayModal(false);
                    setEditingHoliday(null);
                  }}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleEditHoliday({
                id: editingHoliday.id,
                name: formData.get('name') as string,
                date: formData.get('date') as string,
                type: formData.get('type') as string,
                description: formData.get('description') as string,
              });
            }} className="p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Nama Hari Libur <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingHoliday.name}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Tanggal <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={editingHoliday.date}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Tipe <span className="text-red-500">*</span>
                </label>
                <select
                  name="type"
                  required
                  defaultValue={editingHoliday.type}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                >
                  <option value="national">Libur Nasional</option>
                  <option value="company">Libur Perusahaan</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Deskripsi (Optional)
                </label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editingHoliday.description || ''}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                ></textarea>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditHolidayModal(false);
                    setEditingHoliday(null);
                  }}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Policy Modal */}
      {showAddPolicyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-dvh-90 overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Tambah Kebijakan
                </h3>
                <button
                  onClick={() => setShowAddPolicyModal(false)}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleAddPolicy({
                title: formData.get('title') as string,
                description: formData.get('description') as string,
                category: formData.get('category') as string,
              });
            }} className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Judul Kebijakan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="e.g., Aturan Lembur"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Kategori <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  required
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all"
                >
                  <option value="attendance">Kehadiran</option>
                  <option value="leave">Cuti & Izin</option>
                  <option value="general">Umum</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Deskripsi <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  required
                  rows={5}
                  placeholder="Jelaskan kebijakan ini secara detail..."
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/50 transition-all resize-none"
                ></textarea>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPolicyModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Policy Modal */}
      {showEditPolicyModal && editingPolicy && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-dvh-90 overflow-y-auto custom-scrollbar">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Kebijakan
                </h3>
                <button
                  onClick={() => {
                    setShowEditPolicyModal(false);
                    setEditingPolicy(null);
                  }}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleEditPolicy({
                id: editingPolicy.id,
                title: formData.get('title') as string,
                description: formData.get('description') as string,
                category: formData.get('category') as string,
              });
            }} className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Judul Kebijakan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={editingPolicy.title}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Kategori <span className="text-red-500">*</span>
                </label>
                <select
                  name="category"
                  required
                  defaultValue={editingPolicy.category}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                >
                  <option value="attendance">Kehadiran</option>
                  <option value="leave">Cuti & Izin</option>
                  <option value="general">Umum</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Deskripsi <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  required
                  rows={5}
                  defaultValue={editingPolicy.description}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
                ></textarea>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditPolicyModal(false);
                    setEditingPolicy(null);
                  }}
                  className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Delete Holiday */}
      {confirmDeleteHoliday.show && confirmDeleteHoliday.holiday && (
        <ConfirmationModal
          isOpen={confirmDeleteHoliday.show}
          title="Hapus Hari Libur?"
          message={`Apakah Anda yakin ingin menghapus hari libur "${confirmDeleteHoliday.holiday.name}"?\n\nData yang dihapus tidak dapat dikembalikan!`}
          confirmText="Ya, Hapus"
          cancelText="Batal"
          onConfirm={() => handleDeleteHolidayConfirm()}
          onCancel={() => setConfirmDeleteHoliday({ show: false, holiday: null })}
        />
      )}

      {/* Confirmation Modal for Delete Policy */}
      {confirmDeletePolicy.show && confirmDeletePolicy.policy && (
        <ConfirmationModal
          isOpen={confirmDeletePolicy.show}
          title="Hapus Kebijakan?"
          message={`Apakah Anda yakin ingin menghapus kebijakan "${confirmDeletePolicy.policy.title}"?\n\nData yang dihapus tidak dapat dikembalikan!`}
          confirmText="Ya, Hapus"
          cancelText="Batal"
          onConfirm={() => handleDeletePolicyConfirm()}
          onCancel={() => setConfirmDeletePolicy({ show: false, policy: null })}
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
      </div>
    </div>
  );
}
