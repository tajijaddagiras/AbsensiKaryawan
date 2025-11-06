'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import AdminSidebar, { SidebarToggleButton } from '@/components/AdminSidebar';
import SuccessNotification from '@/components/SuccessNotification';
import ErrorNotification from '@/components/ErrorNotification';
import ConfirmationModal from '@/components/ConfirmationModal';
import SkeletonCard from '@/components/SkeletonCard';
import { cachedFetch } from '@/lib/utils/apiCache';

interface Employee {
  id: string;
  employee_code: string;
  full_name: string;
  username?: string;
  email: string;
  phone?: string;
  department?: string;
  position?: string;
  is_active: boolean;
  face_encoding_path?: string;
  face_match_score?: number;
  avatar_url?: string;
}

export default function EmployeesPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    employee_code: '',
    full_name: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    department: '',
    position: '',
  });
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' });
  const [confirmDelete, setConfirmDelete] = useState<{
    show: boolean;
    employee: Employee | null;
  }>({ show: false, employee: null });
  const [confirmToggle, setConfirmToggle] = useState<{
    show: boolean;
    employee: Employee | null;
  }>({ show: false, employee: null });

  useEffect(() => {
    checkAuth();
    fetchEmployees();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  const checkAuth = () => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/admin');
      return;
    }
    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'admin') {
      router.push('/user/dashboard');
    }
  };

  const fetchEmployees = async (forceRefresh: boolean = false) => {
    try {
      // Gunakan cached fetch dengan TTL 30 detik (30000ms)
      // Force refresh saat add/edit/delete untuk mendapatkan data terbaru
      const data = await cachedFetch(
        `/api/employees?showInactive=true`,
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
        console.log('Fetched employees:', data.data.length, 'total');
        console.log('Active:', data.data.filter((e: Employee) => e.is_active).length);
        console.log('Inactive:', data.data.filter((e: Employee) => !e.is_active).length);
        setEmployees(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.password || formData.password.length < 6) {
      setNotification({ show: true, type: 'error', message: 'Password minimal 6 karakter!' });
      return;
    }

    try {
      if (!formData.username || formData.username.trim() === '') {
        setNotification({ show: true, type: 'error', message: 'Username tidak boleh kosong!' });
        return;
      }

      const userResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          phone: formData.phone || undefined,
          role: 'user'
        }),
      });

      const userData = await userResponse.json();
      
      if (!userData.success) {
        const errorMsg = userData.details || userData.error || 'Gagal membuat akun user';
        setNotification({ show: true, type: 'error', message: errorMsg });
        return;
      }

      console.log('User created:', userData.user.email);

      const { password, ...employeeData } = formData;
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userData.user.id,
          ...employeeData,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setNotification({ show: true, type: 'success', message: 'Karyawan berhasil ditambahkan!' });
        setShowAddModal(false);
        setFormData({
          employee_code: '',
          full_name: '',
          username: '',
          email: '',
          password: '',
          phone: '',
          department: '',
          position: '',
        });
        fetchEmployees(true); // Force refresh untuk mendapatkan data terbaru
      } else {
        setNotification({ show: true, type: 'error', message: data.error || 'Gagal menambah karyawan' });
      }
    } catch (error) {
      console.error('Error adding employee:', error);
      setNotification({ show: true, type: 'error', message: 'Gagal menambah karyawan' });
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      employee_code: employee.employee_code,
      full_name: employee.full_name,
      username: employee.username || '',
      email: employee.email,
      password: '',
      phone: employee.phone || '',
      department: employee.department || '',
      position: employee.position || '',
    });
    setShowEditModal(true);
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingEmployee) return;

    try {
      const { password, ...updateData } = formData;
      
      const response = await fetch(`/api/employees/${editingEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      if (data.success) {
        setNotification({ show: true, type: 'success', message: 'Karyawan berhasil diupdate!' });
        setShowEditModal(false);
        setEditingEmployee(null);
        setFormData({
          employee_code: '',
          full_name: '',
          username: '',
          email: '',
          password: '',
          phone: '',
          department: '',
          position: '',
        });
        fetchEmployees(true); // Force refresh untuk mendapatkan data terbaru
      } else {
        setNotification({ show: true, type: 'error', message: data.error || 'Gagal update karyawan' });
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      setNotification({ show: true, type: 'error', message: 'Gagal update karyawan' });
    }
  };

  const handleToggleStatus = (id: string) => {
    const employee = employees.find(emp => emp.id === id);
    if (!employee) {
      setNotification({ show: true, type: 'error', message: 'Karyawan tidak ditemukan' });
      return;
    }
    setConfirmToggle({ show: true, employee });
  };

  const handleToggleConfirm = async () => {
    const employee = confirmToggle.employee;
    if (!employee) return;

    const currentStatus = employee.is_active;
    const action = currentStatus ? 'deactivate' : 'activate';
    const actionText = currentStatus ? 'menonaktifkan' : 'mengaktifkan';

    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      if (data.success) {
        setNotification({ show: true, type: 'success', message: `Karyawan berhasil di${actionText}!` });
        fetchEmployees(true); // Force refresh untuk mendapatkan data terbaru
      } else {
        setNotification({ show: true, type: 'error', message: data.error || `Gagal ${actionText} karyawan` });
      }
    } catch (error: any) {
      console.error(`Error toggling employee status:`, error);
      setNotification({ show: true, type: 'error', message: error.message || `Gagal ${actionText} karyawan` });
    } finally {
      setConfirmToggle({ show: false, employee: null });
    }
  };


  // Memoize handler untuk menghindari re-creation pada setiap render
  const handleDeleteClick = useCallback((id: string) => {
    const employee = employees.find(emp => emp.id === id);
    if (!employee) {
      setNotification({ show: true, type: 'error', message: 'Karyawan tidak ditemukan' });
      return;
    }
    setConfirmDelete({ show: true, employee });
  }, [employees]);

  // Memoize stats calculation untuk menghindari re-calculation yang tidak perlu
  const statsSummary = useMemo(() => {
    const activeCount = employees.filter(e => e.is_active).length;
    const inactiveCount = employees.filter(e => !e.is_active).length;
    const activePercentage = employees.length > 0 ? Math.round((activeCount / employees.length) * 100) : 0;

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {/* Total Karyawan */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 hover:shadow-lg transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500 font-medium">Total</p>
              <p className="text-2xl sm:text-3xl font-bold text-slate-900">{employees.length}</p>
            </div>
          </div>
        </div>

        {/* Aktif */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 hover:shadow-lg transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500 font-medium">Aktif</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600">{activeCount}</p>
            </div>
          </div>
        </div>

        {/* Non-Aktif */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 hover:shadow-lg transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500 font-medium">Non-Aktif</p>
              <p className="text-2xl sm:text-3xl font-bold text-red-600">{inactiveCount}</p>
            </div>
          </div>
        </div>
        
        {/* Persentase Aktif */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 hover:shadow-lg transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs text-slate-500 font-medium">% Aktif</p>
              <p className="text-2xl sm:text-3xl font-bold text-indigo-600">{activePercentage}%</p>
            </div>
          </div>
        </div>
      </div>
    );
  }, [employees]);

  const handleDeleteConfirm = async () => {
    const employee = confirmDelete.employee;
    if (!employee) return;

    try {
      const response = await fetch(`/api/employees/${employee.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Gagal menghapus karyawan');
      }

      if (data.success) {
        setEmployees(prevEmployees => prevEmployees.filter(emp => emp.id !== employee.id));
        setNotification({ show: true, type: 'success', message: 'Karyawan berhasil dihapus permanen!' });
        fetchEmployees(true); // Force refresh untuk mendapatkan data terbaru
      } else {
        setNotification({ show: true, type: 'error', message: data.error || 'Gagal menghapus karyawan' });
      }
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      setNotification({ show: true, type: 'error', message: error.message || 'Gagal menghapus karyawan. Silakan coba lagi.' });
    } finally {
      setConfirmDelete({ show: false, employee: null });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <AdminSidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

        <div className="lg:ml-64 min-h-screen">
          {/* Header */}
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm">
            <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <SidebarToggleButton onClick={() => setIsSidebarOpen(true)} />
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0"></div>
                    <div className="flex flex-col min-w-0">
                      <div className="h-5 bg-slate-200 rounded w-32 animate-pulse"></div>
                      <div className="h-4 bg-slate-200 rounded w-24 mt-1 animate-pulse"></div>
                    </div>
                  </div>
                </div>
                <div className="h-9 bg-slate-200 rounded-lg w-20 animate-pulse"></div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="p-3 sm:p-4 md:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
              {/* Stats Summary Skeleton */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-200 rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-slate-200 rounded w-16"></div>
                        <div className="h-6 bg-slate-300 rounded w-12"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Employee List Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                <SkeletonCard variant="employee" count={6} />
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


      <div className="lg:ml-64 min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Toggle + Title */}
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <SidebarToggleButton onClick={() => setIsSidebarOpen(true)} />
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <h2 className="text-base sm:text-lg lg:text-xl font-bold text-slate-900 truncate">Daftar Karyawan</h2>
                  <p className="text-xs sm:text-sm text-slate-500 truncate">{currentDate}</p>
                </div>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowAddModal(true)}
                className="px-3 sm:px-4 py-2 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-green-600 hover:text-green-700 text-sm font-semibold transition-all flex items-center gap-2"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Tambah</span>
            </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-3 sm:p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* Stats Summary */}
        {statsSummary}

        {/* Employee List - Grid Layout */}
        {employees.length === 0 ? (
          <div className="bg-white rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center shadow-sm border border-slate-200">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2">Belum Ada Karyawan</h3>
            <p className="text-sm sm:text-base text-slate-500 mb-4 sm:mb-6">Mulai dengan menambahkan karyawan pertama</p>
                      <button
              onClick={() => setShowAddModal(true)}
              className="px-5 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-sm sm:text-base font-semibold rounded-lg sm:rounded-xl shadow-md hover:shadow-lg transition-all inline-flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
              <span>Tambah Karyawan Pertama</span>
                </button>
              </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
            {employees.map((employee) => (
              <div key={employee.id} className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 hover:shadow-lg hover:border-blue-200 transition-all overflow-hidden group">
                {/* Card Header dengan Gradient - Compact */}
                <div className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      {employee.avatar_url ? (
                        <div className="relative w-12 h-12 sm:w-13 sm:h-13 rounded-lg border-2 border-white/30 shadow-lg flex-shrink-0 overflow-hidden">
                          <Image 
                            src={employee.avatar_url} 
                            alt={employee.full_name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 48px, 52px"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-lg bg-white/20 backdrop-blur-sm border-2 border-white/30 flex items-center justify-center text-white font-bold text-base sm:text-lg shadow-lg flex-shrink-0">
                          {employee.full_name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm sm:text-base font-bold text-white truncate">{employee.full_name}</h3>
                        <p className="text-xs text-white/80 truncate">{employee.employee_code}</p>
            </div>
        </div>

                    {/* Status Badge - Compact */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold shadow-sm flex-shrink-0 ${
                        employee.is_active
                        ? 'bg-green-500 text-white'
                        : 'bg-red-500 text-white'
                    }`}>
                      <span className="text-xs">{employee.is_active ? '●' : '○'}</span>
                    </span>
                  </div>
                </div>

                {/* Card Body - Compact */}
                <div className="p-3 sm:p-4 space-y-2.5">
                  {/* Training Status - Compact */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">Training</span>
                    {employee.face_match_score ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-md text-xs font-semibold">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{employee.face_match_score}%</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-md text-xs font-semibold">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>Belum</span>
                      </span>
                    )}
                  </div>

                  {/* Details - Compact & Consistent */}
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 rounded-md p-2 border border-slate-100">
                        <p className="text-xs text-slate-500 font-medium mb-0.5">Departemen</p>
                        <p className="text-xs text-slate-900 truncate font-medium">{employee.department || '-'}</p>
                      </div>
                      <div className="bg-slate-50 rounded-md p-2 border border-slate-100">
                        <p className="text-xs text-slate-500 font-medium mb-0.5">Jabatan</p>
                        <p className="text-xs text-slate-900 truncate font-medium">{employee.position || '-'}</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-md p-2 border border-slate-100">
                      <p className="text-xs text-slate-500 font-medium mb-0.5">Email</p>
                      <p className="text-xs text-slate-900 truncate font-medium">{employee.email}</p>
                    </div>
                  </div>

                    {/* Action Buttons - Compact (3 buttons: Edit, Status, Delete) */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                        <button
                          onClick={() => handleEditEmployee(employee)}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md text-blue-600 hover:text-blue-700 text-xs font-semibold transition-all flex items-center justify-center gap-1"
                          title="Edit Karyawan"
                        >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                      <span>Edit</span>
                        </button>

                        <button
                      onClick={() => handleToggleStatus(employee.id)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center justify-center gap-1 border ${
                            employee.is_active
                          ? 'bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-600 hover:text-yellow-700'
                          : 'bg-green-50 hover:bg-green-100 border-green-200 text-green-600 hover:text-green-700'
                          }`}
                          title={employee.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                        >
                          {employee.is_active ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
                            </svg>
                          <span>Off</span>
                        </>
                          ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          <span>On</span>
                        </>
                          )}
                        </button>

                        <button
                          onClick={() => handleDeleteClick(employee.id)}
                      className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md text-red-600 hover:text-red-700 text-xs font-semibold transition-all flex items-center justify-center gap-1"
                      title="Hapus Permanen"
                        >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                      <span>Hapus</span>
                        </button>
                      </div>
          </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </main>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 w-full max-w-sm sm:max-w-md lg:max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span className="truncate">Tambah Karyawan</span>
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 sm:p-2 rounded-lg transition-all flex-shrink-0"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="space-y-3 sm:space-y-4">
              {/* Grid 2 columns untuk desktop */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <div>
                  <label className="block text-slate-700 font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm">Kode Karyawan <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.employee_code}
                  onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                  required
                    placeholder="EMP001"
                />
              </div>

              <div>
                  <label className="block text-slate-700 font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm">Nama Lengkap <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                    required
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm">Username <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                    placeholder="Username untuk login"
                  required
                />
                  <p className="text-slate-500 text-xs mt-1">Username unik untuk login</p>
              </div>

              <div>
                  <label className="block text-slate-700 font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all break-all"
                    required
                    placeholder="email@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm">Password <span className="text-red-500">*</span></label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                    placeholder="Minimal 6 karakter"
                  required
                    minLength={6}
                  />
                  <p className="text-slate-500 text-xs mt-1">Password untuk login karyawan</p>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm">Telepon</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                    placeholder="08123456789"
                />
              </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <div>
                  <label className="block text-slate-700 font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm">Departemen</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                    placeholder="IT, HR, Finance, dll"
                />
              </div>

              <div>
                  <label className="block text-slate-700 font-semibold mb-1.5 sm:mb-2 text-xs sm:text-sm">Jabatan</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                    placeholder="Manager, Staff, dll"
                />
              </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all text-sm sm:text-base"
                >
                  Tambah Karyawan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({
                      employee_code: '',
                      full_name: '',
                      username: '',
                      email: '',
                      password: '',
                      phone: '',
                      department: '',
                      position: '',
                    });
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl transition-all text-sm sm:text-base"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 w-full max-w-sm sm:max-w-md lg:max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span className="truncate">Edit Karyawan</span>
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 sm:p-2 rounded-lg transition-all flex-shrink-0"
              >
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-2 text-sm">Kode Karyawan</label>
                <input
                  type="text"
                  value={formData.employee_code}
                  onChange={(e) => setFormData({ ...formData, employee_code: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-2 text-sm">Nama Lengkap</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-2 text-sm">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-2 text-sm">Telepon</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-2 text-sm">Departemen</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-2 text-sm">Jabatan</label>
                <input
                  type="text"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingEmployee(null);
                    setFormData({
                      employee_code: '',
                      full_name: '',
                      username: '',
                      email: '',
                      password: '',
                      phone: '',
                      department: '',
                      position: '',
                    });
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-xl transition-all"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal - Delete */}
      {confirmDelete.show && confirmDelete.employee && (
        <ConfirmationModal
          isOpen={confirmDelete.show}
          title="🔴 HAPUS PERMANEN"
          message={`Apakah Anda yakin ingin menghapus PERMANEN karyawan ini?\n\nNama: ${confirmDelete.employee.full_name}\nEmail: ${confirmDelete.employee.email}`}
          confirmText="Ya, Hapus Permanen"
          cancelText="Batal"
          requireConfirmText="HAPUS"
          onConfirm={() => handleDeleteConfirm()}
          onCancel={() => setConfirmDelete({ show: false, employee: null })}
        />
      )}

      {/* Confirmation Modal - Toggle Status */}
      {confirmToggle.show && confirmToggle.employee && (
        <ConfirmationModal
          isOpen={confirmToggle.show}
          title={confirmToggle.employee.is_active ? '⚠️ NONAKTIFKAN KARYAWAN' : '✅ AKTIFKAN KARYAWAN'}
          message={`Apakah Anda yakin ingin ${confirmToggle.employee.is_active ? 'menonaktifkan' : 'mengaktifkan'} karyawan ini?\n\nNama: ${confirmToggle.employee.full_name}\nEmail: ${confirmToggle.employee.email}\nStatus Saat Ini: ${confirmToggle.employee.is_active ? 'AKTIF' : 'NON-AKTIF'}\nStatus Baru: ${confirmToggle.employee.is_active ? 'NON-AKTIF' : 'AKTIF'}`}
          confirmText={confirmToggle.employee.is_active ? 'Ya, Nonaktifkan' : 'Ya, Aktifkan'}
          cancelText="Batal"
          onConfirm={() => handleToggleConfirm()}
          onCancel={() => setConfirmToggle({ show: false, employee: null })}
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
