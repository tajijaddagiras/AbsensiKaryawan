'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import UserSidebar, { SidebarToggleButton } from '@/components/UserSidebar';
import SuccessNotification from '@/components/SuccessNotification';
import ErrorNotification from '@/components/ErrorNotification';
import dynamic from 'next/dynamic';

const FaceTrainingCamera = dynamic(() => import('@/components/FaceTrainingCamera'), {
  ssr: false,
});

export default function FaceTrainingPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTrainingModal, setShowTrainingModal] = useState(false);
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' });

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
    fetchEmployeeData(parsedUser.email);
  }, [router]);

  const fetchEmployeeData = async (email: string, forceRefresh = false) => {
    try {
      // Add timestamp to prevent caching
      const timestamp = forceRefresh ? `&t=${Date.now()}` : '';
      const response = await fetch(`/api/employees?email=${email}${timestamp}`, {
        cache: 'no-store', // Force no-cache
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      const data = await response.json();
      
      if (data.success && data.data.length > 0) {
        const employeeData = data.data[0];
        console.log('📊 Employee data fetched:', {
          name: employeeData.full_name,
          hasFaceEncoding: !!employeeData.face_encoding_path,
          faceScore: employeeData.face_match_score
        });
        setEmployee(employeeData);
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTrainingComplete = async (faceEncoding: string, matchScore: number) => {
    if (!employee) return;

    console.log('✅ Training complete, closing modal...');
    const employeeToSave = employee;
    setShowTrainingModal(false);

    try {
      console.log('💾 Saving training with score:', matchScore);
      const response = await fetch(`/api/employees/${employeeToSave.id}/face-encoding`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faceEncoding, matchScore }),
      });

      const data = await response.json();
      console.log('💾 API Response:', data);
      
      if (data.success) {
        console.log('✅ Training saved successfully! Refreshing data...');
        
        // Force refresh employee data to get updated face_encoding_path
        if (user?.email) {
          await fetchEmployeeData(user.email, true); // forceRefresh = true
          console.log('🔄 Data refreshed successfully');
        }
        
        // Show success message after data refresh
        setTimeout(() => {
          setNotification({
            show: true,
            type: 'success',
            message: `✅ Training wajah berhasil!\n\nScore: ${matchScore.toFixed(2)}%\n\nData wajah Anda sudah tersimpan di sistem.`
          });
        }, 200);
      } else {
        console.error('❌ Failed to save training:', data.error);
        setNotification({
          show: true,
          type: 'error',
          message: data.error || 'Gagal menyimpan training wajah'
        });
      }
    } catch (error) {
      console.error('❌ Error saving face training:', error);
      setNotification({
        show: true,
        type: 'error',
        message: 'Gagal menyimpan training wajah'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <UserSidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

        <div className="lg:pl-64 flex flex-col">
          {/* Header */}
          <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200 shadow-sm">
            <div className="px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <SidebarToggleButton onClick={() => setIsSidebarOpen(true)} />
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0"></div>
                  <div className="flex flex-col min-w-0">
                    <div className="h-6 bg-slate-200 rounded w-40 animate-pulse"></div>
                    <div className="h-4 bg-slate-200 rounded w-32 mt-1 animate-pulse"></div>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
            {/* Title Card Skeleton */}
            <div className="bg-white rounded-xl p-6 mb-6 shadow-sm border border-slate-200 animate-pulse">
              <div className="h-8 bg-slate-200 rounded w-64 mb-2"></div>
              <div className="h-4 bg-slate-200 rounded w-96"></div>
            </div>

            {/* Camera Card Skeleton */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 animate-pulse">
              <div className="h-64 bg-slate-200 rounded-lg mb-4"></div>
              <div className="h-10 bg-slate-200 rounded w-32 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check if already trained
  const isTrained = employee?.face_encoding_path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <UserSidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      {/* Main Content */}
      <div className="lg:pl-64 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <SidebarToggleButton onClick={() => setIsSidebarOpen(!isSidebarOpen)} />
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${isTrained ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'} flex items-center justify-center shadow-lg`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isTrained ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      )}
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                      {isTrained ? 'Training Berhasil' : 'Latih Wajah'}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500">
                      {isTrained ? 'Face Recognition Active' : 'Training Face Recognition'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {!isTrained ? (
            // ========== BELUM TRAINING - FORM VIEW ==========
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Info Card */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-6 sm:p-8 text-white shadow-xl">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-bold mb-2">Tentang Face Training</h3>
                    <p className="text-white/90 text-sm sm:text-base leading-relaxed">
                      Training wajah diperlukan untuk sistem absensi menggunakan face recognition. 
                      Proses ini akan merekam data wajah Anda dari 6 posisi berbeda untuk meningkatkan akurasi pengenalan.
                    </p>
                  </div>
                </div>
              </div>

              {/* Employee Info Card */}
              {employee && (
                <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Informasi Karyawan
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Nama Lengkap</p>
                      <p className="text-sm font-semibold text-slate-900">{employee.full_name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Kode Karyawan</p>
                      <p className="text-sm font-semibold text-slate-900">{employee.employee_code}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Department</p>
                      <p className="text-sm font-semibold text-slate-900">{employee.department || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Status Training</p>
                      <p className="text-sm font-semibold text-amber-600">
                        ⚠️ Belum Terlatih
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Training Instructions */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Instruksi Training
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                    <p className="text-sm text-slate-700">Pastikan pencahayaan ruangan cukup terang</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                    <p className="text-sm text-slate-700">Posisikan wajah di tengah frame kamera</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                    <p className="text-sm text-slate-700">Ikuti instruksi untuk setiap posisi wajah (6 step)</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">4</div>
                    <p className="text-sm text-slate-700">Tunggu hingga confidence mencapai minimal 85%</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">5</div>
                    <p className="text-sm text-slate-700">Proses akan otomatis lanjut ke step berikutnya</p>
                  </div>
                </div>
              </div>

              {/* Training Button */}
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-lg border border-slate-200">
                <button
                  onClick={() => setShowTrainingModal(true)}
                  disabled={!employee}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-500 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Mulai Training Wajah
                </button>
              </div>
            </div>
          ) : (
            // ========== SUDAH TRAINING - SUCCESS DASHBOARD ==========
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Hero Success Card */}
              <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-3xl p-8 sm:p-10 text-white shadow-2xl relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32"></div>
                  <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24"></div>
                </div>

                <div className="relative z-10 text-center">
                  {/* Success Icon with Animation */}
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-6 animate-pulse">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-bold mb-3">Training Wajah Berhasil!</h2>
                  <p className="text-white/90 text-sm sm:text-base max-w-2xl mx-auto">
                    Wajah Anda telah berhasil dilatih dan tersimpan di sistem. Anda sekarang dapat melakukan absensi menggunakan face recognition.
                  </p>
                </div>
              </div>

              {/* Main Dashboard Grid */}
              <div className="grid md:grid-cols-3 gap-6">
                {/* Left: Employee Photo & Info */}
                <div className="md:col-span-1">
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-200 sticky top-24">
                    {/* Photo with Animated Ring */}
                    <div className="relative w-40 h-40 mx-auto mb-6">
                      {/* Animated Ring */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 animate-spin" style={{ animationDuration: '3s' }}></div>
                      <div className="absolute inset-1 rounded-full bg-white"></div>
                      
                      {/* Employee Photo */}
                      <div className="absolute inset-2 rounded-full overflow-hidden bg-slate-100">
                        {employee?.avatar_url ? (
                          <div className="relative w-full h-full">
                            <Image 
                              src={employee.avatar_url} 
                              alt={employee.full_name}
                              fill
                              className="object-cover"
                              sizes="200px"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-100 to-emerald-100">
                            <svg className="w-20 h-20 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                        ✓ Terverifikasi
                      </div>
                    </div>

                    {/* Employee Info */}
                    <div className="text-center space-y-3">
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Nama Lengkap</p>
                        <p className="text-base font-bold text-slate-900">{employee?.full_name}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">NIK</p>
                          <p className="text-sm font-semibold text-slate-900">{employee?.employee_code}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Dept</p>
                          <p className="text-sm font-semibold text-slate-900">{employee?.department || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Training Stats & Details */}
                <div className="md:col-span-2 space-y-6">
                  {/* Training Score - BIG */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-8 border-2 border-green-200 shadow-lg">
                    <div className="text-center">
                      <p className="text-sm font-semibold text-green-700 mb-2 flex items-center justify-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Skor Training Terakhir
                      </p>
                      <div className="text-6xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 mb-2">
                        {employee?.face_match_score ? Number(employee.face_match_score).toFixed(1) : '0.0'}%
                      </div>
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Akurasi Tinggi
                      </div>
                    </div>
                  </div>

                  {/* Training Details Grid */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Status Card */}
                    <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1">Status Training</p>
                          <p className="text-sm font-bold text-green-600">✓ Sudah Terlatih</p>
                        </div>
                      </div>
                    </div>

                    {/* Face Recognition Card */}
                    <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1">Face Recognition</p>
                          <p className="text-sm font-bold text-blue-600">Aktif</p>
                        </div>
                      </div>
                    </div>

                    {/* Training Steps Card */}
                    <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1">Training Steps</p>
                          <p className="text-sm font-bold text-purple-600">6 Posisi</p>
                        </div>
                      </div>
                    </div>

                    {/* Database Card */}
                    <div className="bg-white rounded-xl p-5 shadow-md border border-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1">Data Tersimpan</p>
                          <p className="text-sm font-bold text-amber-600">Database</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Update Training Button - Secondary Style */}
                  <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-900 mb-1">Perbarui Training?</h4>
                        <p className="text-xs text-slate-600 mb-3">
                          Jika wajah Anda berubah signifikan atau ingin meningkatkan akurasi, Anda dapat memperbarui training wajah.
                        </p>
                        <button
                          onClick={() => setShowTrainingModal(true)}
                          className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-2.5 px-6 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 text-sm"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Update Training
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Training Modal */}
      {showTrainingModal && employee && (
        <FaceTrainingCamera
          onComplete={handleTrainingComplete}
          onClose={() => setShowTrainingModal(false)}
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
  );
}

