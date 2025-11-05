'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar, { SidebarToggleButton } from '@/components/AdminSidebar';
import SuccessNotification from '@/components/SuccessNotification';
import ErrorNotification from '@/components/ErrorNotification';
import SkeletonCard from '@/components/SkeletonCard';

export default function SettingsPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [systemSettings, setSystemSettings] = useState({
    faceThreshold: 80,
    gpsRadius: 3000,
  });
  const [notification, setNotification] = useState<{ show: boolean; type: 'success' | 'error'; message: string }>({
    show: false,
    type: 'success',
    message: '',
  });
  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  useEffect(() => {
    checkAuth();
    fetchSystemSettings();
  }, []);

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

  const fetchSystemSettings = async () => {
    try {
      const response = await fetch('/api/system-settings');
      const data = await response.json();
      
      if (data.success) {
        const settings = data.data;
        setSystemSettings({
          faceThreshold: parseInt(settings.face_recognition_threshold?.value || '80'),
          gpsRadius: parseInt(settings.gps_accuracy_radius?.value || '3000'),
        });
      }
    } catch (error) {
      console.error('Error fetching system settings:', error);
      setSystemSettings({
        faceThreshold: 80,
        gpsRadius: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const faceThreshold = systemSettings.faceThreshold || 80;
      const gpsRadius = systemSettings.gpsRadius || 3000;
      
      if (faceThreshold < 50 || faceThreshold > 100) {
        setNotification({ show: true, type: 'error', message: 'Face Recognition Threshold harus antara 50-100%' });
        return;
      }
      
      if (gpsRadius < 10 || gpsRadius > 10000) {
        setNotification({ show: true, type: 'error', message: 'GPS Radius harus antara 10-10000 meter' });
        return;
      }
      
      const response = await fetch('/api/system-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          face_recognition_threshold: faceThreshold,
          gps_accuracy_radius: gpsRadius,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
      const validSettings = {
        faceThreshold: faceThreshold,
        gpsRadius: gpsRadius,
      };
      setSystemSettings(validSettings);
        setNotification({
          show: true,
          type: 'success',
          message: `Pengaturan berhasil disimpan!\n\nFace Recognition Threshold: ${faceThreshold}%\nGPS Accuracy Radius: ${gpsRadius} meter\n\nPengaturan ini akan berlaku untuk semua karyawan.`,
        });
      } else {
        setNotification({ show: true, type: 'error', message: data.error || 'Gagal menyimpan pengaturan' });
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setNotification({ show: true, type: 'error', message: 'Gagal menyimpan pengaturan' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <AdminSidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

        <div className="lg:ml-64 min-h-screen">
          {/* Header */}
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm">
            <div className="px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 lg:flex-none">
                  <SidebarToggleButton onClick={() => setIsSidebarOpen(true)} />
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center"></div>
                    <div className="flex flex-col min-w-0">
                      <div className="h-6 bg-slate-200 rounded w-32 animate-pulse"></div>
                      <div className="h-4 bg-slate-200 rounded w-32 mt-1 animate-pulse"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto">
              {/* Info Card Skeleton */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 mb-6 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-48"></div>
                  <div className="h-3 bg-slate-200 rounded w-full"></div>
                  <div className="h-3 bg-slate-200 rounded w-5/6"></div>
                  <div className="h-3 bg-slate-200 rounded w-4/5"></div>
                </div>
              </div>

              {/* Settings Form Skeleton */}
              <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
                <div className="h-7 bg-slate-200 rounded w-48 mb-6 animate-pulse"></div>
                
                <div className="space-y-6">
                  {/* Setting 1 Skeleton */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 sm:p-6 border border-slate-200 animate-pulse">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-slate-200 rounded w-48"></div>
                        <div className="h-4 bg-slate-200 rounded w-64"></div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-10 bg-slate-200 rounded-lg"></div>
                      <div className="h-2 bg-slate-200 rounded w-full"></div>
                    </div>
                  </div>

                  {/* Setting 2 Skeleton */}
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 sm:p-6 border border-slate-200 animate-pulse">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 bg-slate-200 rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-5 bg-slate-200 rounded w-48"></div>
                        <div className="h-4 bg-slate-200 rounded w-64"></div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-10 bg-slate-200 rounded-lg"></div>
                      <div className="h-2 bg-slate-200 rounded w-full"></div>
                    </div>
                  </div>
                </div>

                {/* Save Button Skeleton */}
                <div className="mt-6 flex justify-end">
                  <div className="h-10 bg-slate-200 rounded-lg w-32 animate-pulse"></div>
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


      <div className="lg:ml-64 min-h-screen">
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">Pengaturan</h2>
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
        <div className="max-w-4xl mx-auto">

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 mb-6">
          <div className="flex gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-slate-700">
              <p className="font-bold text-slate-900 mb-1">Informasi Penting:</p>
              <ul className="space-y-1">
                <li>• Pengaturan ini berlaku untuk <strong>semua karyawan</strong></li>
                <li>• Untuk mengatur <strong>lokasi kantor</strong>, gunakan menu <strong>"Lokasi Kantor"</strong> di dashboard</li>
                <li>• Perubahan langsung tersimpan ke database</li>
              </ul>
                    </div>
                  </div>
                </div>

        {/* System Settings */}
        <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span>Pengaturan Validasi</span>
          </h2>
          
          <div className="space-y-6">
            {/* Face Recognition Threshold */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 sm:p-6 border border-purple-200">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">Face Recognition Threshold</h3>
                  <p className="text-slate-600 text-sm">Minimal similarity score untuk verifikasi wajah berhasil</p>
          </div>
        </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <input
                type="number"
                  min="50"
                max="100"
                value={systemSettings.faceThreshold}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                      setSystemSettings({ ...systemSettings, faceThreshold: 50 });
                  } else {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue)) {
                        setSystemSettings({ ...systemSettings, faceThreshold: numValue });
                      }
                    }
                  }}
                  className="w-full sm:w-32 bg-white border-2 border-purple-300 rounded-lg px-4 py-3 text-slate-900 text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  placeholder="80"
                />
                <div className="flex-1 w-full">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-500 text-sm font-medium">50%</span>
                    <span className="text-purple-600 font-bold text-lg">{systemSettings.faceThreshold}%</span>
                    <span className="text-slate-500 text-sm font-medium">100%</span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-300 shadow-md"
                      style={{ width: `${systemSettings.faceThreshold}%` }}
                    ></div>
                  </div>
                  <p className="text-slate-500 text-xs mt-2">
                    💡 Rekomendasi: 70-85% (lebih tinggi = lebih ketat)
                  </p>
                </div>
              </div>
            </div>

            {/* GPS Accuracy Radius */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 sm:p-6 border border-green-200">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
            </div>
              <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-900 mb-1">GPS Accuracy Radius</h3>
                  <p className="text-slate-600 text-sm">Jarak maksimal dari lokasi kantor untuk check-in valid</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <input
                type="number"
                  min="10"
                max="10000"
                value={systemSettings.gpsRadius}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                      setSystemSettings({ ...systemSettings, gpsRadius: 10 });
                  } else {
                    const numValue = parseInt(value);
                    if (!isNaN(numValue)) {
                        setSystemSettings({ ...systemSettings, gpsRadius: numValue });
                      }
                    }
                  }}
                  className="w-full sm:w-32 bg-white border-2 border-green-300 rounded-lg px-4 py-3 text-slate-900 text-lg font-bold text-center focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                  placeholder="3000"
                />
                <div className="flex-1 w-full">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-500 text-sm font-medium">10m</span>
                    <span className="text-green-600 font-bold text-lg">{systemSettings.gpsRadius}m</span>
                    <span className="text-slate-500 text-sm font-medium">10km</span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-300 shadow-md"
                      style={{ width: `${Math.min((systemSettings.gpsRadius / 10000) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-slate-500 text-xs mt-2">
                    💡 Rekomendasi: 100-5000m (tergantung area kantor)
                  </p>
                </div>
              </div>
            </div>
            </div>

          {/* Summary & Save */}
          <div className="mt-8 pt-6 border-t border-slate-200">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="font-bold text-slate-900 mb-2 text-sm">Ringkasan Pengaturan:</p>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                    <span>Face Threshold: <span className="text-purple-600 font-bold">{systemSettings.faceThreshold}%</span></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    <span>GPS Radius: <span className="text-green-600 font-bold">{systemSettings.gpsRadius} meter</span></span>
                  </li>
                </ul>
              </div>
              <button 
                onClick={handleSaveSettings}
                className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Simpan Pengaturan
              </button>
            </div>
            </div>
          </div>
        </div>
      </main>
          </div>

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
    </div>
  );
}
