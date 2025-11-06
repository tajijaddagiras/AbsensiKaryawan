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

interface OfficeLocation {
  id: string;
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  radius: number;
  is_active: boolean;
  created_at: string;
}

export default function OfficeLocationsPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [locations, setLocations] = useState<OfficeLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<OfficeLocation | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    radius: '100',
  });
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [defaultGpsRadius, setDefaultGpsRadius] = useState<number>(3000);
  const [useDefaultRadius, setUseDefaultRadius] = useState<boolean>(true);
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' });
  const [confirmDelete, setConfirmDelete] = useState<{
    show: boolean;
    location: OfficeLocation | null;
  }>({ show: false, location: null });

  // Lock body scroll when modal is open
  useBodyScrollLock(showModal);

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      router.push('/admin');
      return;
    }

    const parsedUser = JSON.parse(user);
    if (parsedUser.role !== 'admin') {
      router.push('/user/dashboard');
      return;
    }

    fetchLocations();
    fetchDefaultGpsRadius();
  }, [router]);

  const fetchDefaultGpsRadius = async (forceRefresh: boolean = false) => {
    try {
      // Gunakan cached fetch dengan TTL 60 detik (60000ms) karena data jarang berubah
      const data = await cachedFetch(
        '/api/system-settings',
        {
          method: 'GET',
          headers: {
            'Cache-Control': 'no-cache',
          }
        },
        60000, // TTL 60 detik
        forceRefresh
      );
      if (data?.success) {
        const value = parseInt(data.data?.gps_accuracy_radius?.value || '3000');
        setDefaultGpsRadius(isNaN(value) ? 3000 : value);
      }
    } catch (error) {
      console.error('Error fetching default GPS radius:', error);
      setDefaultGpsRadius(3000);
    }
  };

  const fetchLocations = async (forceRefresh: boolean = false) => {
    try {
      // Gunakan cached fetch dengan TTL 30 detik (30000ms)
      // Force refresh saat add/edit/delete untuk mendapatkan data terbaru
      const data = await cachedFetch(
        '/api/office-locations',
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
        setLocations(data.data);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      setNotification({ show: true, type: 'error', message: 'Gagal mengambil data lokasi kantor' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingLocation(null);
    setFormData({
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      radius: String(defaultGpsRadius),
    });
    setUseDefaultRadius(true);
    setShowModal(true);
  };

  const handleOpenEditModal = (location: OfficeLocation) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      address: location.address || '',
      latitude: location.latitude.toString(),
      longitude: location.longitude.toString(),
      radius: location.radius.toString(),
    });
    setUseDefaultRadius(location.radius === defaultGpsRadius);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.latitude || !formData.longitude) {
      setNotification({ show: true, type: 'error', message: 'Nama, Latitude, dan Longitude harus diisi!' });
      return;
    }

    const lat = parseFloat(formData.latitude);
    const lng = parseFloat(formData.longitude);

    if (isNaN(lat) || isNaN(lng)) {
      setNotification({ show: true, type: 'error', message: 'Latitude dan Longitude harus berupa angka!' });
      return;
    }

    if (lat < -90 || lat > 90) {
      setNotification({ show: true, type: 'error', message: 'Latitude harus antara -90 dan 90!' });
      return;
    }

    if (lng < -180 || lng > 180) {
      setNotification({ show: true, type: 'error', message: 'Longitude harus antara -180 dan 180!' });
      return;
    }

    try {
      const url = editingLocation
        ? `/api/office-locations/${editingLocation.id}`
        : '/api/office-locations';
      
      const method = editingLocation ? 'PUT' : 'POST';

      // New locations default to inactive if there's any active location already
      const isActiveToSave = editingLocation ? editingLocation.is_active : (activeLocations.length === 0);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          address: formData.address,
          latitude: lat,
          longitude: lng,
          radius: useDefaultRadius ? defaultGpsRadius : parseInt(formData.radius),
          is_active: isActiveToSave,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Safety: ensure newly created location is non-active when there is an existing active location
        if (!editingLocation && activeLocations.length > 0 && data.data && data.data.id) {
          try {
            await fetch(`/api/office-locations/${data.data.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ is_active: false }),
            });
          } catch (e) {
            console.warn('Follow-up deactivation failed, will rely on server payload:', e);
          }
        }

        setNotification({ show: true, type: 'success', message: editingLocation ? 'Lokasi berhasil diupdate!' : 'Lokasi berhasil ditambahkan!' });
        setShowModal(false);
        fetchLocations(true); // Force refresh untuk mendapatkan data terbaru
      } else {
        setNotification({ show: true, type: 'error', message: data.error || 'Gagal menyimpan lokasi' });
      }
    } catch (error) {
      console.error('Error saving location:', error);
      setNotification({ show: true, type: 'error', message: 'Gagal menyimpan lokasi' });
    }
  };

  const handleToggleActive = async (location: OfficeLocation) => {
    try {
      const response = await fetch(`/api/office-locations/${location.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...location,
          is_active: !location.is_active,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNotification({ show: true, type: 'success', message: 'Status lokasi berhasil diubah!' });
        fetchLocations(true); // Force refresh untuk mendapatkan data terbaru
      } else {
        setNotification({ show: true, type: 'error', message: data.error || 'Gagal mengubah status lokasi' });
      }
    } catch (error) {
      console.error('Error toggling location:', error);
      setNotification({ show: true, type: 'error', message: 'Gagal mengubah status lokasi' });
    }
  };

  const handleDeleteClick = (location: OfficeLocation) => {
    setConfirmDelete({ show: true, location });
  };

  const handleDeleteConfirm = async () => {
    const location = confirmDelete.location;
    if (!location) return;

    try {
      const response = await fetch(`/api/office-locations/${location.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setNotification({ show: true, type: 'success', message: 'Lokasi berhasil dihapus!' });
        fetchLocations(true); // Force refresh untuk mendapatkan data terbaru
      } else {
        setNotification({ show: true, type: 'error', message: data.error || 'Gagal menghapus lokasi' });
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      setNotification({ show: true, type: 'error', message: 'Gagal menghapus lokasi' });
    } finally {
      setConfirmDelete({ show: false, location: null });
    }
  };

  const getAddressFromCoords = async (lat: number, lng: number): Promise<string> => {
    try {
      // OpenStreetMap Nominatim Reverse Geocoding (FREE!)
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'AbsensiPintar/1.0' // Required by Nominatim
        }
      });
      
      if (!response.ok) {
        throw new Error('Gagal mendapatkan alamat');
      }
      
      const data = await response.json();
      
      // Format alamat yang lebih rapi untuk Indonesia
      if (data.address) {
        const parts = [];
        if (data.address.road) parts.push(data.address.road);
        if (data.address.house_number) parts.push(`No. ${data.address.house_number}`);
        if (data.address.suburb || data.address.village) parts.push(data.address.suburb || data.address.village);
        if (data.address.city || data.address.city_district) parts.push(data.address.city || data.address.city_district);
        if (data.address.state) parts.push(data.address.state);
        if (data.address.postcode) parts.push(data.address.postcode);
        
        return parts.length > 0 ? parts.join(', ') : data.display_name;
      }
      
      return data.display_name || `${lat}, ${lng}`;
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      return `${lat}, ${lng}`; // Fallback ke koordinat saja
    }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setNotification({ show: true, type: 'error', message: 'Browser Anda tidak mendukung GPS/Geolocation!' });
      return;
    }

    setIsLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        // Get address from coordinates using OpenStreetMap
        const address = await getAddressFromCoords(lat, lng);

        // Auto-fill all fields
        setFormData({
          ...formData,
          address: address,
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
        });

        setIsLoadingLocation(false);
        setNotification({ show: true, type: 'success', message: `Lokasi berhasil terdeteksi! Alamat: ${address}` });
      },
      (error) => {
        console.error('Error getting location:', error);
        setIsLoadingLocation(false);
        
        let errorMessage = 'Gagal mendapatkan lokasi. ';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Izin lokasi ditolak. Silakan aktifkan izin lokasi di browser.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Informasi lokasi tidak tersedia. Pastikan GPS aktif.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Waktu permintaan lokasi habis. Coba lagi.';
            break;
          default:
            errorMessage += 'Terjadi kesalahan. Coba lagi.';
        }
        
        setNotification({ show: true, type: 'error', message: errorMessage });
      },
      {
        enableHighAccuracy: true, // Gunakan GPS accuracy tinggi
        timeout: 10000, // 10 detik timeout
        maximumAge: 0 // Jangan pakai cache, ambil lokasi fresh
      }
    );
  };

  const activeLocations = locations.filter(loc => loc.is_active);
  const inactiveLocations = locations.filter(loc => !loc.is_active);

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
                <div className="h-10 bg-slate-200 rounded-lg w-24 animate-pulse"></div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
              {/* Stats Skeleton */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-slate-200 rounded w-24"></div>
                        <div className="h-6 bg-slate-300 rounded w-12"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Location List Skeleton */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <SkeletonCard variant="default" count={6} />
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">Lokasi Kantor</h2>
                  <p className="text-xs sm:text-sm text-slate-500 truncate">{currentDate}</p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenAddModal}
                className="px-3 sm:px-4 py-2 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-green-600 hover:text-green-700 text-sm font-semibold transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="hidden sm:inline">Tambah</span>
              </button>
              {/* Logout moved to sidebar */}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Total Lokasi</p>
                <p className="text-2xl font-bold text-slate-900">{locations.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-green-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Lokasi Aktif</p>
                <p className="text-2xl font-bold text-green-600">{activeLocations.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-orange-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500 font-medium">Nonaktif</p>
                <p className="text-2xl font-bold text-orange-600">{inactiveLocations.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Locations List */}
        {locations.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Belum Ada Lokasi</h3>
            <p className="text-slate-500 mb-4">Klik tombol "Tambah Lokasi" untuk menambahkan lokasi kantor baru</p>
            <button
              onClick={handleOpenAddModal}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all"
            >
              Tambah Lokasi Pertama
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {locations.map((location) => (
              <div
                key={location.id}
                className="bg-white rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-sm border border-slate-200 hover:shadow-md transition-all"
              >
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* Location Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-900">{location.name}</h3>
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold border ${
                        location.is_active 
                          ? 'bg-green-50 text-green-700 border-green-200' 
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        <span>{location.is_active ? '●' : '○'}</span>
                        <span>{location.is_active ? 'Aktif' : 'Nonaktif'}</span>
                      </span>
                    </div>
                    {location.address && (
                      <p className="text-slate-500 text-sm mb-3">{location.address}</p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <p className="text-xs text-blue-600 font-medium mb-1">Latitude</p>
                        <p className="text-sm text-slate-900 font-semibold">{location.latitude}</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                        <p className="text-xs text-purple-600 font-medium mb-1">Longitude</p>
                        <p className="text-sm text-slate-900 font-semibold">{location.longitude}</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3 border border-orange-200">
                        <p className="text-xs text-orange-600 font-medium mb-1">Radius</p>
                        <p className="text-sm text-slate-900 font-semibold">{location.radius}m</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex lg:flex-col gap-2 lg:justify-center">
                    <button
                      onClick={() => handleToggleActive(location)}
                      className={`flex-1 lg:flex-none px-4 py-2.5 rounded-lg font-semibold text-sm transition-all border ${
                        location.is_active
                          ? 'bg-orange-50 hover:bg-orange-100 text-orange-600 border-orange-200'
                          : 'bg-green-50 hover:bg-green-100 text-green-600 border-green-200'
                      }`}
                    >
                      {location.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(location)}
                      className="flex-1 lg:flex-none bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(location)}
                      className="flex-1 lg:flex-none bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2.5 rounded-lg font-semibold text-sm transition-all"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full max-dvh-90 overflow-y-auto custom-scrollbar shadow-2xl animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-7 h-7 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{editingLocation ? 'Edit Lokasi' : 'Tambah Lokasi'}</span>
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition-all"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          {!editingLocation && activeLocations.length > 0 && (
            <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">
              Lokasi kantor baru akan <strong>disimpan sebagai Nonaktif</strong> karena sudah ada lokasi aktif. Anda bisa mengaktifkannya nanti setelah verifikasi alamat.
            </div>
          )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-2 text-sm">
                  Nama Lokasi <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="Contoh: Kantor Pusat"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-2 text-sm">Alamat</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                  placeholder="Contoh: Jl. Sudirman No. 123, Jakarta"
                  rows={2}
                />
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-slate-700 font-semibold mb-2 text-sm">
                    Latitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                    placeholder="-6.200000"
                    required
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-slate-700 font-semibold mb-2 text-sm">
                    Longitude <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50 transition-all"
                    placeholder="106.816666"
                    required
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLoadingLocation}
                className={`w-full px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                  isLoadingLocation
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md hover:shadow-lg'
                }`}
              >
                {isLoadingLocation ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Mendeteksi Lokasi...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>📍 Gunakan Lokasi Saya Sekarang</span>
                  </>
                )}
              </button>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-slate-700 font-semibold text-sm">
                    Radius (meter)
                  </label>
                  <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={useDefaultRadius}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setUseDefaultRadius(checked);
                        if (checked) {
                          setFormData({ ...formData, radius: String(defaultGpsRadius) });
                        }
                      }}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Gunakan default dari Settings</span>
                  </label>
                </div>
                <input
                  type="number"
                  value={useDefaultRadius ? String(defaultGpsRadius) : formData.radius}
                  onChange={(e) => setFormData({ ...formData, radius: e.target.value })}
                  disabled={useDefaultRadius}
                  className={`w-full bg-white border rounded-lg px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none transition-all ${
                    useDefaultRadius
                      ? 'border-slate-200 text-slate-500 cursor-not-allowed bg-slate-50'
                      : 'border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50'
                  }`}
                  placeholder="100"
                  min="10"
                  max="10000"
                />
                <p className="text-slate-500 text-xs mt-1">
                  Default saat ini: <span className="font-semibold text-slate-700">{defaultGpsRadius} m</span> (dari Pengaturan → GPS Accuracy Radius)
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  {editingLocation ? 'Update' : 'Simpan'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-xl transition-all"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDelete.show && confirmDelete.location && (
        <ConfirmationModal
          isOpen={confirmDelete.show}
          title="Hapus Lokasi?"
          message={`Apakah Anda yakin ingin menghapus lokasi "${confirmDelete.location.name}"?\n\nData yang dihapus tidak dapat dikembalikan!`}
          confirmText="Ya, Hapus"
          cancelText="Batal"
          onConfirm={() => handleDeleteConfirm()}
          onCancel={() => setConfirmDelete({ show: false, location: null })}
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
