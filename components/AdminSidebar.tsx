'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import SuccessNotification from '@/components/SuccessNotification';
import ErrorNotification from '@/components/ErrorNotification';
import { useBodyScrollLock } from '@/lib/hooks/useBodyScrollLock';

interface AdminSidebarProps {
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (value: boolean) => void;
}

export default function AdminSidebar({ isSidebarOpen: externalSidebarOpen, setIsSidebarOpen: externalSetSidebarOpen }: AdminSidebarProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const [internalSidebarOpen, setInternalSidebarOpen] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const isSidebarOpen = externalSidebarOpen !== undefined ? externalSidebarOpen : internalSidebarOpen;
  const setIsSidebarOpen = externalSetSidebarOpen || setInternalSidebarOpen;
  const [user, setUser] = useState<any>(null);
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

  // Lock body scroll when modals are open
  useBodyScrollLock(showProfileModal || showEditModal);

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

      if (username && username !== user.username) updateData.newUsername = username;
      if (email && email !== user.email) updateData.newEmail = email;
      if (avatarUrl !== user.avatar_url) updateData.avatarUrl = avatarUrl;
      if (newPassword) {
        updateData.currentPassword = currentPassword;
        updateData.newPassword = newPassword;
      }

      const response = await fetch('/api/auth/update-profile', {
        method: 'PUT',
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

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const getInitials = (email: string) => {
    if (!email) return 'AD';
    const parts = email.split('@')[0].split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  const menuItems = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/admin/employees', label: 'Daftar Karyawan', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
    { href: '/admin/schedule', label: 'Jadwal & Kebijakan', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { href: '/admin/leave', label: 'Pengajuan Izin', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { href: '/admin/attendance', label: 'Laporan Absensi', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { href: '/admin/office-locations', label: 'Lokasi Kantor', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z' },
    { href: '/admin/settings', label: 'Pengaturan', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  ];

  return (
    <>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 shadow-lg transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          {/* Profile Section - TOP */}
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
                {getInitials(user?.email || '')}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-slate-900 font-bold text-sm truncate">{user?.username || 'Admin'}</p>
                <p className="text-slate-500 text-xs">Administrator</p>
              </div>
              <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)} // Close sidebar on mobile after click
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          {/* Footer Actions */}
          <div className="mt-auto p-3 border-t border-slate-200 bg-white">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 hover:text-red-700 transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Keluar
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* Profile View Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowProfileModal(false)}>
          <div className="bg-white rounded-2xl max-w-sm w-full max-dvh-90 overflow-y-auto custom-scrollbar shadow-2xl animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-blue-500 mx-auto mb-4 shadow-lg" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-4 border-4 border-white shadow-lg">
                  {getInitials(user?.email || '')}
                </div>
              )}
              <h3 className="text-2xl font-bold text-slate-900 mb-1">{user?.username || 'Admin'}</h3>
              <p className="text-slate-500 text-sm mb-6">{user?.email}</p>
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
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-dvh-90 overflow-hidden animate-fadeIn" onClick={(e) => e.stopPropagation()}>
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
            <div className="grid md:grid-cols-2 gap-6 p-6 overflow-y-auto max-h-[calc(90dvh-180px)] custom-scrollbar">
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
                        {getInitials(user?.email || '')}
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

// Export Mobile Toggle Button Component
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
