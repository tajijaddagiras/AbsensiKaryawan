'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import SuccessNotification from '@/components/SuccessNotification';
import ErrorNotification from '@/components/ErrorNotification';

interface UserSidebarProps {
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (open: boolean) => void;
}

export default function UserSidebar({ isSidebarOpen: externalSidebarOpen, setIsSidebarOpen: externalSetSidebarOpen }: UserSidebarProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({
    username: '',
    email: '',
    avatarUrl: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [notification, setNotification] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({
    show: false,
    type: 'success',
    message: '',
  });

  // Use external state if provided, otherwise use internal state
  const [internalSidebarOpen, setInternalSidebarOpen] = useState(false);
  const isSidebarOpen = externalSidebarOpen !== undefined ? externalSidebarOpen : internalSidebarOpen;
  const setIsSidebarOpen = externalSetSidebarOpen || setInternalSidebarOpen;

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      fetchEmployeeData(parsedUser.email);
    }
  }, []);

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

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  const handleOpenProfile = () => {
    setShowProfileModal(true);
  };

  const handleOpenEdit = () => {
    setEditData({
      username: user?.username || '',
      email: user?.email || '',
      avatarUrl: user?.avatar_url || '/images/profile.jpg',
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    setShowProfileModal(false);
    setShowEditModal(true);
  };

  const handleUpdateProfile = async () => {
    try {
      const { username, email, currentPassword, newPassword, confirmPassword, avatarUrl } = editData;

      if (newPassword && newPassword !== confirmPassword) {
        setNotification({ show: true, type: 'error', message: 'Password baru dan konfirmasi tidak cocok!' });
        return;
      }

      if (newPassword && !currentPassword) {
        setNotification({ show: true, type: 'error', message: 'Masukkan password saat ini untuk mengubah password!' });
        return;
      }

      const updateData: any = { currentEmail: user.email };

      if (username && username !== user.username) updateData.username = username;
      if (email && email !== user.email) updateData.newEmail = email;
      if (avatarUrl !== user.avatar_url) updateData.avatarUrl = avatarUrl;
      if (newPassword) {
        updateData.currentPassword = currentPassword;
        updateData.newPassword = newPassword;
      }

      const response = await fetch('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (data.success) {
        const updatedUser = {
          ...user,
          username: data.updatedUsername || username,
          email: data.updatedEmail || email,
          avatar_url: avatarUrl,
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setShowEditModal(false);
        setIsSidebarOpen(false); // Tutup sidebar mobile setelah simpan (konsisten dengan menu items)
        
        // Delay kecil agar modal tutup dulu, baru notifikasi muncul
        setTimeout(() => {
          setNotification({
            show: true,
            type: 'success',
            message: newPassword ? 'Profil dan password berhasil diperbarui!' : 'Profil berhasil diperbarui!',
          });
        }, 200);
      } else {
        setNotification({ show: true, type: 'error', message: data.error || 'Gagal memperbarui profil' });
      }
    } catch (error) {
      console.error('Error:', error);
      setNotification({ show: true, type: 'error', message: 'Terjadi kesalahan saat memperbarui profil' });
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name.substring(0, 2).toUpperCase();
  };

  const menuItems = [
    {
      href: '/user/dashboard',
      label: 'Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />
        </svg>
      ),
    },
    {
      href: '/user/face-training',
      label: 'Latih Wajah',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: '/user/attendance',
      label: 'Absensi',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: '/user/history',
      label: 'Riwayat Absensi',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      href: '/user/leave',
      label: 'Pengajuan Izin',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Profile Section - Top */}
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <button
              onClick={handleOpenProfile}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 shadow-sm transition-all group"
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="Profile"
                  className="w-11 h-11 rounded-full object-cover border-2 border-blue-200 shadow-sm"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm ${user?.avatar_url ? 'hidden' : ''}`}>
                {getInitials(user?.username || user?.email || '')}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-bold text-slate-900 text-sm truncate">{user?.username || 'User'}</p>
                <p className="text-xs text-slate-500 truncate">{employee?.employee_code || 'Karyawan'}</p>
              </div>
              <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex-shrink-0">{item.icon}</div>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout Button - Bottom */}
          <div className="p-4 border-t border-slate-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-all text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Keluar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Profile View Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowProfileModal(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-blue-500 mx-auto mb-4 shadow-lg" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 border-4 border-white shadow-lg">
                  {getInitials(user?.username || user?.email || '')}
                </div>
              )}
              <h3 className="text-2xl font-bold text-slate-900 mb-1">{user?.username || 'User'}</h3>
              <p className="text-slate-500 text-sm mb-2">{user?.email}</p>
              <p className="text-xs text-slate-500 mb-6">{employee?.employee_code || 'Karyawan'}</p>
              <div className="space-y-2">
                <button onClick={handleOpenEdit} className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg">
                  Edit Profile
                </button>
                <button onClick={() => setShowProfileModal(false)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-xl transition-all">
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal - 2 Sections Design */}
      {showEditModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-hidden animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </h3>
                <button onClick={() => setShowEditModal(false)} className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-lg transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content - 2 Sections */}
            <div className="grid md:grid-cols-2 gap-6 p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {/* Left Section - Profile Info */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl p-5 border border-blue-200">
                  <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Informasi Profile
                  </h4>
                  
                  {/* Avatar Preview */}
                  <div className="flex flex-col items-center mb-4">
                    {editData.avatarUrl ? (
                      <img src={editData.avatarUrl} alt="Preview" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg" />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg">
                        {getInitials(user?.username || user?.email || '')}
                      </div>
                    )}
                  </div>

                  {/* Avatar URL Input */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">URL Foto Profile</label>
                    <input
                      type="text"
                      value={editData.avatarUrl}
                      onChange={(e) => setEditData({ ...editData, avatarUrl: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                      placeholder="/images/profile.jpg"
                    />
                    <p className="text-xs text-slate-500 mt-1.5">💡 Contoh: /images/nama-foto.jpg</p>
                  </div>
                </div>

                {/* Account Info */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Username</label>
                      <input
                        type="text"
                        value={editData.username}
                        onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                        placeholder="Username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={editData.email}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Section - Password */}
              <div>
                <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl p-5 border border-amber-300 h-full">
                  <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Ubah Password
                  </h4>
                  <p className="text-xs text-amber-700 mb-4">Kosongkan jika tidak ingin mengubah password</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Password Saat Ini</label>
                      <input
                        type="password"
                        value={editData.currentPassword}
                        onChange={(e) => setEditData({ ...editData, currentPassword: e.target.value })}
                        className="w-full bg-white border border-amber-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/50 transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Password Baru</label>
                      <input
                        type="password"
                        value={editData.newPassword}
                        onChange={(e) => setEditData({ ...editData, newPassword: e.target.value })}
                        className="w-full bg-white border border-amber-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/50 transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Konfirmasi Password</label>
                      <input
                        type="password"
                        value={editData.confirmPassword}
                        onChange={(e) => setEditData({ ...editData, confirmPassword: e.target.value })}
                        className="w-full bg-white border border-amber-300 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/50 transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex gap-3">
              <button
                onClick={handleUpdateProfile}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Simpan Perubahan
              </button>
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-3 bg-white hover:bg-slate-100 border-2 border-slate-300 text-slate-700 font-semibold rounded-xl transition-all"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {notification.type === 'success' && (
        <SuccessNotification
          isOpen={notification.show}
          message={notification.message}
          onClose={() => setNotification({ show: false, type: 'success', message: '' })}
        />
      )}

      {/* Error Notification */}
      {notification.type === 'error' && (
        <ErrorNotification
          isOpen={notification.show}
          message={notification.message}
          onClose={() => setNotification({ show: false, type: 'error', message: '' })}
        />
      )}
    </>
  );
}

export function SidebarToggleButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-all"
      aria-label="Toggle Sidebar"
    >
      <svg className="w-6 h-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
  );
}
