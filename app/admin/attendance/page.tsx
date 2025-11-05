'use client';

import { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import AdminSidebar, { SidebarToggleButton } from '@/components/AdminSidebar';
import { useDebounce } from '@/lib/utils/useDebounce';
import SkeletonCard from '@/components/SkeletonCard';
// Import CSS untuk DatePicker (akan di-bundle oleh Next.js)
import 'react-datepicker/dist/react-datepicker.css';

// Lazy load DatePicker untuk mengurangi initial bundle size
// @ts-ignore - Type issue with react-datepicker dynamic import
const DatePicker = dynamic(() => import('react-datepicker').then(mod => mod.default), { 
  ssr: false,
  loading: () => <div className="h-10 bg-slate-200 rounded-lg animate-pulse"></div>
});

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface AttendanceRecord {
  id: string;
  employee_id: string;
  check_in_time: string;
  check_out_time?: string;
  check_in_latitude?: number;
  check_in_longitude?: number;
  status: string;
  face_match_score?: number;
  notes?: string | null;
  employees: {
    full_name: string;
    employee_code: string;
    avatar_url?: string;
  };
}

export default function AttendancePage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'today' | 'week' | 'custom'>('today');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // Date picker states
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [useMonthFilter, setUseMonthFilter] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  // Debounced search query untuk optimasi performa
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  
  // Download dropdown state
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  
  // Schedule data state
  const [schedules, setSchedules] = useState<any[]>([]);
  
  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  useEffect(() => {
    checkAuth();
    fetchAttendance();
    fetchSchedules();
  }, [filter, selectedMonth, useMonthFilter]);

  // Fetch work schedules
  const fetchSchedules = async () => {
    try {
      const response = await fetch('/api/work-schedules');
      const data = await response.json();
      if (data.success) {
        setSchedules(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
    }
  };

  // Close download menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    };

    if (showDownloadMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDownloadMenu]);

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

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      
      // Get current time in Jakarta timezone
      const now = new Date();
      const jakartaFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      const jakartaParts = jakartaFormatter.formatToParts(now);
      const jakartaDateObj = {
        year: parseInt(jakartaParts.find(p => p.type === 'year')?.value || '0'),
        month: parseInt(jakartaParts.find(p => p.type === 'month')?.value || '0'),
        day: parseInt(jakartaParts.find(p => p.type === 'day')?.value || '0'),
        hour: parseInt(jakartaParts.find(p => p.type === 'hour')?.value || '0'),
        minute: parseInt(jakartaParts.find(p => p.type === 'minute')?.value || '0')
      };
      
      // Build API URL with proper date filtering using Jakarta timezone
      let apiUrl = '/api/attendance/history';
      
      if (useMonthFilter && selectedMonth) {
        // Per Bulan: use month/year filter
        const month = selectedMonth.getMonth() + 1; // 0-11 to 1-12
        const year = selectedMonth.getFullYear();
        apiUrl = `/api/attendance/history?month=${month}&year=${year}`;
      } else if (filter === 'today') {
        // Hari Ini: calculate Jakarta today midnight (UTC)
        const jakartaTodayMidnightUTC = Date.UTC(
          jakartaDateObj.year,
          jakartaDateObj.month - 1,
          jakartaDateObj.day,
          0, 0, 0, 0
        ) - (7 * 60 * 60 * 1000); // Subtract 7 hours for Jakarta UTC offset
        const jakartaTomorrowMidnightUTC = jakartaTodayMidnightUTC + (24 * 60 * 60 * 1000);
        
        const startDate = new Date(jakartaTodayMidnightUTC).toISOString();
        const endDate = new Date(jakartaTomorrowMidnightUTC).toISOString();
        apiUrl = `/api/attendance/history?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      } else if (filter === 'week') {
        // 7 Hari: calculate Jakarta 7 days ago midnight (UTC)
        const jakartaTodayMidnightUTC = Date.UTC(
          jakartaDateObj.year,
          jakartaDateObj.month - 1,
          jakartaDateObj.day,
          0, 0, 0, 0
        ) - (7 * 60 * 60 * 1000); // Subtract 7 hours for Jakarta UTC offset
        const jakartaTomorrowMidnightUTC = jakartaTodayMidnightUTC + (24 * 60 * 60 * 1000);
        const jakartaWeekAgoMidnightUTC = jakartaTodayMidnightUTC - (6 * 24 * 60 * 60 * 1000); // 7 days including today
        
        const startDate = new Date(jakartaWeekAgoMidnightUTC).toISOString();
        const endDate = new Date(jakartaTomorrowMidnightUTC).toISOString();
        apiUrl = `/api/attendance/history?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      }
      // else: filter === 'all' or 'custom' without month filter -> fetch all (no date params)
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.success) {
        // Data sudah di-filter di server, langsung set tanpa client-side date filtering
        setAttendance(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper function: Get Jakarta date string (YYYY-MM-DD)
  const getJakartaDateStr = (date: Date): string => {
    const jakartaDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const year = jakartaDate.getFullYear();
    const month = String(jakartaDate.getMonth() + 1).padStart(2, '0');
    const day = String(jakartaDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function: Get Jakarta day of week (0-6, Sunday = 0)
  const getJakartaDow = (date: Date): number => {
    const jakartaDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    return jakartaDate.getDay();
  };

  // Helper function: Format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Helper function: Format schedule time dari HH:MM:SS menjadi HH:MM
  const formatScheduleTime = (time: string | null | undefined): string => {
    if (!time) return '';
    return time.slice(0, 5); // Ambil 5 karakter pertama (HH:MM)
  };

  // Helper function: Get schedule berdasarkan day of week (0-6)
  const getScheduleForDay = (dayOfWeek: number): any => {
    return schedules.find(s => s.day_of_week === dayOfWeek && s.is_active) || null;
  };

  // Helper function: Parse time string ke minutes
  const timeToMinutes = (timeStr: string): number => {
    const [h, m] = timeStr.split(':').slice(0, 2).map(Number);
    return h * 60 + m;
  };

  // Helper function: Klasifikasi status detail berdasarkan notes (prioritas) atau status/schedule (fallback)
  const getAttendanceStatusDetail = (record: AttendanceRecord): {
    statusDetail: 'on_time' | 'within_tolerance' | 'late';
    statusLabel: string;
    onTimeRange: string;
    toleranceRange: string;
    lateMinutes: number;
  } => {
    if (!record.check_in_time) {
      return {
        statusDetail: 'on_time',
        statusLabel: 'Tepat Waktu',
        onTimeRange: '-',
        toleranceRange: '-',
        lateMinutes: 0
      };
    }

    // PRIORITAS 1: Cek status field DULU - jika status = 'late', langsung return late
    // Ini penting untuk memastikan semua record terlambat terdeteksi, termasuk yang notes-nya mungkin tidak lengkap
    if (record.status === 'late') {
      const checkInDate = new Date(record.check_in_time);
      const jakartaDate = new Date(checkInDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const dayOfWeek = jakartaDate.getDay();
      const schedule = getScheduleForDay(dayOfWeek);
      
      // Parse late minutes dari notes jika ada
      let lateMinutes = 0;
      if (record.notes) {
        const lateMatch = record.notes.match(/(\d+)\s*menit/);
        if (lateMatch) {
          lateMinutes = parseInt(lateMatch[1], 10);
        }
      }
      
      let onTimeRange = '-';
      let toleranceRange = '-';
      if (schedule) {
        const startTime = formatScheduleTime(schedule.start_time);
        const onTimeEnd = formatScheduleTime(schedule.on_time_end_time || schedule.start_time);
        const toleranceStart = formatScheduleTime(schedule.tolerance_start_time || schedule.on_time_end_time || schedule.start_time);
        const toleranceEnd = formatScheduleTime(schedule.tolerance_end_time || schedule.on_time_end_time || schedule.start_time);
        onTimeRange = `${startTime}-${onTimeEnd}`;
        toleranceRange = `${toleranceStart}-${toleranceEnd}`;
      }

      return {
        statusDetail: 'late',
        statusLabel: 'Terlambat',
        onTimeRange: '-',
        toleranceRange: '-',
        lateMinutes: lateMinutes || 0
      };
    }

    // PRIORITAS 2: Gunakan notes field jika ada (lebih akurat, dari data saat check-in)
    if (record.notes && record.notes.trim() !== '') {
      const notesLower = record.notes.toLowerCase().trim();
      
      // Parse late minutes dari notes jika ada
      let lateMinutes = 0;
      const lateMatch = record.notes.match(/(\d+)\s*menit/);
      if (lateMatch) {
        lateMinutes = parseInt(lateMatch[1], 10);
      }

      // Klasifikasi dari notes - PRIORITAS: cek terlambat DULU sebelum yang lain
      if (notesLower.includes('terlambat') || notesLower.includes('late') || notesLower.includes('melewati batas') || notesLower.includes('melewati')) {
        // Get schedule untuk format range (untuk konsistensi)
        const checkInDate = new Date(record.check_in_time);
        const jakartaDate = new Date(checkInDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
        const dayOfWeek = jakartaDate.getDay();
        const schedule = getScheduleForDay(dayOfWeek);
        
        let onTimeRange = '-';
        let toleranceRange = '-';
        if (schedule) {
          const startTime = formatScheduleTime(schedule.start_time);
          const onTimeEnd = formatScheduleTime(schedule.on_time_end_time || schedule.start_time);
          const toleranceStart = formatScheduleTime(schedule.tolerance_start_time || schedule.on_time_end_time || schedule.start_time);
          const toleranceEnd = formatScheduleTime(schedule.tolerance_end_time || schedule.on_time_end_time || schedule.start_time);
          onTimeRange = `${startTime}-${onTimeEnd}`;
          toleranceRange = `${toleranceStart}-${toleranceEnd}`;
        }

        return {
          statusDetail: 'late',
          statusLabel: 'Terlambat',
          onTimeRange: '-',
          toleranceRange: '-',
          lateMinutes: lateMinutes || 0
        };
      } else if (notesLower.includes('tepat waktu') || notesLower.includes('tepatwaktu') || notesLower.includes('tepat-waktu')) {
        // Get schedule untuk format range (jika schedule tersedia)
        const checkInDate = new Date(record.check_in_time);
        const jakartaDate = new Date(checkInDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
        const dayOfWeek = jakartaDate.getDay();
        const schedule = getScheduleForDay(dayOfWeek);
        
        let onTimeRange = '-';
        if (schedule) {
          const startTime = formatScheduleTime(schedule.start_time);
          const onTimeEnd = formatScheduleTime(schedule.on_time_end_time || schedule.start_time);
          onTimeRange = `${startTime}-${onTimeEnd}`;
        }

        return {
          statusDetail: 'on_time',
          statusLabel: 'Tepat Waktu',
          onTimeRange,
          toleranceRange: '-',
          lateMinutes: 0
        };
      } else if (notesLower.includes('dalam toleransi') || notesLower.includes('toleransi') || notesLower.includes('hadir dalam')) {
        // Get schedule untuk format range
        const checkInDate = new Date(record.check_in_time);
        const jakartaDate = new Date(checkInDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
        const dayOfWeek = jakartaDate.getDay();
        const schedule = getScheduleForDay(dayOfWeek);
        
        let toleranceRange = '-';
        if (schedule) {
          const toleranceStart = formatScheduleTime(schedule.tolerance_start_time || schedule.on_time_end_time || schedule.start_time);
          const toleranceEnd = formatScheduleTime(schedule.tolerance_end_time || schedule.on_time_end_time || schedule.start_time);
          toleranceRange = `${toleranceStart}-${toleranceEnd}`;
        }

        return {
          statusDetail: 'within_tolerance',
          statusLabel: 'Dalam Toleransi',
          onTimeRange: '-',
          toleranceRange,
          lateMinutes: 0
        };
      }
    }

    // FALLBACK 3: Jika notes tidak ada dan status bukan 'late', hitung dari schedule (untuk data lama)
    // Get day of week dari check-in time (dalam timezone Jakarta)
    const checkInDate = new Date(record.check_in_time);
    const jakartaDate = new Date(checkInDate.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const dayOfWeek = jakartaDate.getDay();

    // Get schedule untuk hari tersebut
    const schedule = getScheduleForDay(dayOfWeek);
    
    if (!schedule) {
      // Jika tidak ada schedule, default ke 'on_time' (kecuali status = 'late' sudah di-handle di atas)
      return {
        statusDetail: 'on_time',
        statusLabel: 'Tepat Waktu',
        onTimeRange: '-',
        toleranceRange: '-',
        lateMinutes: 0
      };
    }

    // Parse waktu check-in dalam Jakarta timezone
    const jakartaTimeStr = jakartaDate.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Jakarta'
    });
    const [checkInHour, checkInMin] = jakartaTimeStr.split(':').map(Number);
    const checkInMinutes = checkInHour * 60 + checkInMin;

    // Parse waktu jadwal
    const startTime = formatScheduleTime(schedule.start_time);
    const onTimeEnd = formatScheduleTime(schedule.on_time_end_time || schedule.start_time);
    const toleranceStart = formatScheduleTime(schedule.tolerance_start_time || schedule.on_time_end_time || schedule.start_time);
    const toleranceEnd = formatScheduleTime(schedule.tolerance_end_time || schedule.on_time_end_time || schedule.start_time);

    const startMinutes = timeToMinutes(startTime);
    const onTimeEndMinutes = timeToMinutes(onTimeEnd);
    const toleranceStartMinutes = timeToMinutes(toleranceStart);
    const toleranceEndMinutes = timeToMinutes(toleranceEnd);

    // Format ranges
    const onTimeRange = `${startTime}-${onTimeEnd}`;
    const toleranceRange = `${toleranceStart}-${toleranceEnd}`;

    // Klasifikasi status dari schedule
    if (checkInMinutes >= startMinutes && checkInMinutes <= onTimeEndMinutes) {
      return {
        statusDetail: 'on_time',
        statusLabel: 'Tepat Waktu',
        onTimeRange,
        toleranceRange: '-',
        lateMinutes: 0
      };
    } else if (checkInMinutes > onTimeEndMinutes && checkInMinutes <= toleranceEndMinutes) {
      return {
        statusDetail: 'within_tolerance',
        statusLabel: 'Dalam Toleransi',
        onTimeRange: '-',
        toleranceRange,
        lateMinutes: 0
      };
    } else {
      const lateMinutes = checkInMinutes - startMinutes;
      return {
        statusDetail: 'late',
        statusLabel: 'Terlambat',
        onTimeRange: '-',
        toleranceRange: '-',
        lateMinutes
      };
    }
  };

  // Helper function: Get status info (untuk backward compatibility - deprecated, gunakan getStatusDetailInfo)
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'present':
        return { label: 'Hadir', color: 'green', icon: '✓' };
      case 'late':
        return { label: 'Terlambat', color: 'yellow', icon: '⏰' };
      default:
        return { label: 'Absen', color: 'red', icon: '✕' };
    }
  };

  // Helper function: Get status detail info untuk tampilan badge/list (menggunakan status detail, bukan status umum)
  const getStatusDetailInfo = (record: AttendanceRecord) => {
    const statusDetail = getAttendanceStatusDetail(record);
    
    switch (statusDetail.statusDetail) {
      case 'on_time':
        return { 
          label: 'Tepat Waktu', 
          color: 'emerald', 
          icon: '✓',
          bgColor: 'bg-emerald-50',
          textColor: 'text-emerald-700',
          borderColor: 'border-emerald-200'
        };
      case 'within_tolerance':
        return { 
          label: 'Dalam Toleransi', 
          color: 'orange', 
          icon: '⏱️',
          bgColor: 'bg-orange-50',
          textColor: 'text-orange-700',
          borderColor: 'border-orange-200'
        };
      case 'late':
        return { 
          label: 'Terlambat', 
          color: 'yellow', 
          icon: '⏰',
          bgColor: 'bg-yellow-50',
          textColor: 'text-yellow-700',
          borderColor: 'border-yellow-200'
        };
      default:
        return { 
          label: 'Tepat Waktu', 
          color: 'emerald', 
          icon: '✓',
          bgColor: 'bg-emerald-50',
          textColor: 'text-emerald-700',
          borderColor: 'border-emerald-200'
        };
    }
  };

  // Excel export function - Lazy load XLSX saat akan digunakan
  const handleExportExcel = async () => {
    if (filteredAttendance.length === 0) {
      alert('Tidak ada data untuk di-export');
      return;
    }

    // Lazy load XLSX hanya saat akan export
    const XLSX = await import('xlsx');

    // Prepare data for Excel (use filtered data dengan 11 kolom)
    const excelData = filteredAttendance.map((record, index) => {
      const checkIn = formatDateTime(record.check_in_time);
      const checkOut = record.check_out_time ? formatDateTime(record.check_out_time) : { date: '-', time: '-' };
      
      // Get status detail dengan schedule data
      const statusDetail = getAttendanceStatusDetail(record);
      
      // Calculate duration
      let duration = '-';
      if (record.check_out_time) {
        const start = new Date(record.check_in_time);
        const end = new Date(record.check_out_time);
        const diff = end.getTime() - start.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        duration = `${hours}h ${minutes}m`;
      }

      // Format late minutes jika terlambat
      let lateDisplay = '-';
      if (statusDetail.statusDetail === 'late' && statusDetail.lateMinutes > 0) {
        lateDisplay = `${statusDetail.lateMinutes} menit`;
      }

      return {
        'No': index + 1,
        'NIK': record.employees.employee_code,
        'Nama Lengkap': record.employees.full_name,
        'Tanggal': checkIn.date,
        'Jam Masuk': checkIn.time,
        'Jam Tepat Waktu': statusDetail.onTimeRange,
        'Jam Toleransi': statusDetail.toleranceRange,
        'Terlambat': lateDisplay,
        'Jam Pulang': checkOut.time,
        'Durasi Kerja': duration,
        'Status': statusDetail.statusLabel,
      };
    });

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Set column widths (11 kolom)
    worksheet['!cols'] = [
      { wch: 5 },  // No
      { wch: 12 }, // NIK
      { wch: 25 }, // Nama Lengkap
      { wch: 15 }, // Tanggal
      { wch: 12 }, // Jam Masuk
      { wch: 18 }, // Jam Tepat Waktu
      { wch: 18 }, // Jam Toleransi
      { wch: 15 }, // Terlambat
      { wch: 12 }, // Jam Pulang
      { wch: 15 }, // Durasi Kerja
      { wch: 18 }, // Status
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Absensi');

    // Generate filename
    let filename = 'Laporan_Absensi';
    if (useMonthFilter && selectedMonth) {
      const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const monthName = monthNames[selectedMonth.getMonth()];
      const year = selectedMonth.getFullYear();
      filename = `Laporan_Absensi_${monthName}_${year}`;
      
      // Add search query to filename if exists
      if (searchQuery) {
        filename += `_${searchQuery.replace(/\s+/g, '_')}`;
      }
    } else {
      const now = new Date();
      filename = `Laporan_Absensi_${now.toISOString().split('T')[0]}`;
      
      // Add search query to filename if exists
      if (searchQuery) {
        filename += `_${searchQuery.replace(/\s+/g, '_')}`;
      }
    }

    // Download file
    XLSX.writeFile(workbook, `${filename}.xlsx`);
    
    // Close menu after download
    setShowDownloadMenu(false);
  };

  // PDF export function - Lazy load jsPDF dan autoTable saat akan digunakan
  const handleExportPDF = async () => {
    if (filteredAttendance.length === 0) {
      alert('Tidak ada data untuk di-export');
      return;
    }

    // Lazy load jsPDF dan autoTable hanya saat akan export
    const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);

    // Create new PDF document
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // Generate filename (same logic as Excel)
    let filename = 'Laporan_Absensi';
    if (useMonthFilter && selectedMonth) {
      const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const monthName = monthNames[selectedMonth.getMonth()];
      const year = selectedMonth.getFullYear();
      filename = `Laporan_Absensi_${monthName}_${year}`;
      
      if (searchQuery) {
        filename += `_${searchQuery.replace(/\s+/g, '_')}`;
      }
    } else {
      const now = new Date();
      filename = `Laporan_Absensi_${now.toISOString().split('T')[0]}`;
      
      if (searchQuery) {
        filename += `_${searchQuery.replace(/\s+/g, '_')}`;
      }
    }

    // Prepare data for PDF table (11 kolom)
    const tableData = filteredAttendance.map((record, index) => {
      const checkIn = formatDateTime(record.check_in_time);
      const checkOut = record.check_out_time ? formatDateTime(record.check_out_time) : { date: '-', time: '-' };
      
      // Get status detail dengan schedule data
      const statusDetail = getAttendanceStatusDetail(record);
      
      // Calculate duration
      let duration = '-';
      if (record.check_out_time) {
        const start = new Date(record.check_in_time);
        const end = new Date(record.check_out_time);
        const diff = end.getTime() - start.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        duration = `${hours}h ${minutes}m`;
      }

      // Format late minutes jika terlambat
      let lateDisplay = '-';
      if (statusDetail.statusDetail === 'late' && statusDetail.lateMinutes > 0) {
        lateDisplay = `${statusDetail.lateMinutes} menit`;
      }
      
      return [
        index + 1,
        record.employees.employee_code,
        record.employees.full_name,
        checkIn.date,
        checkIn.time,
        statusDetail.onTimeRange,
        statusDetail.toleranceRange,
        lateDisplay,
        checkOut.time,
        duration,
        statusDetail.statusLabel
      ];
    });

    // Add title
    doc.setFontSize(16);
    doc.setTextColor(30, 58, 138); // Blue color
    doc.text('Laporan Absensi', 14, 15);
    
    // Add subtitle with date range
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate color
    let subtitle = '';
    if (useMonthFilter && selectedMonth) {
      const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                          'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const monthName = monthNames[selectedMonth.getMonth()];
      const year = selectedMonth.getFullYear();
      subtitle = `Periode: ${monthName} ${year}`;
    } else if (filter === 'today') {
      subtitle = 'Periode: Hari Ini';
    } else if (filter === 'week') {
      subtitle = 'Periode: 7 Hari Terakhir';
    } else {
      subtitle = 'Periode: Semua Data';
    }
    
    if (searchQuery) {
      subtitle += ` | Pencarian: ${searchQuery}`;
    }
    
    doc.text(subtitle, 14, 22);
    
    // Add generated date
    const generatedDate = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.setFontSize(9);
    doc.text(`Dibuat pada: ${generatedDate}`, 14, 27);

    // Add table using autoTable (11 kolom)
    autoTable(doc, {
      head: [['No', 'NIK', 'Nama Lengkap', 'Tanggal', 'Jam Masuk', 'Jam Tepat Waktu', 'Jam Toleransi', 'Terlambat', 'Jam Pulang', 'Durasi Kerja', 'Status']],
      body: tableData,
      startY: 32,
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
      },
      headStyles: {
        fillColor: [30, 58, 138], // Blue background
        textColor: 255, // White text
        fontStyle: 'bold',
        fontSize: 7,
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251], // Light gray
      },
      columnStyles: {
        0: { cellWidth: 8 },  // No
        1: { cellWidth: 20 }, // NIK
        2: { cellWidth: 35 }, // Nama Lengkap
        3: { cellWidth: 20 }, // Tanggal
        4: { cellWidth: 18 }, // Jam Masuk
        5: { cellWidth: 22 }, // Jam Tepat Waktu
        6: { cellWidth: 22 }, // Jam Toleransi
        7: { cellWidth: 18 }, // Terlambat
        8: { cellWidth: 18 }, // Jam Pulang
        9: { cellWidth: 18 }, // Durasi Kerja
        10: { cellWidth: 22 }, // Status
      },
      margin: { left: 10, right: 10 },
    });

    // Save PDF
    doc.save(`${filename}.pdf`);
    
    // Close menu after download
    setShowDownloadMenu(false);
  };

  // Memoize handler untuk menghindari re-creation pada setiap render
  const handleViewDetail = useCallback((record: AttendanceRecord) => {
    setSelectedRecord(record);
    setShowDetailModal(true);
  }, []);

  // Filter attendance by search query (menggunakan debounced untuk optimasi)
  // Memoize filtered list untuk menghindari re-filtering yang tidak perlu
  const filteredAttendance = useMemo(() => {
    return attendance.filter((record) => {
      if (!debouncedSearchQuery.trim()) return true; // Show all if no search query
      
      const fullName = record.employees?.full_name?.toLowerCase() || '';
      const employeeCode = record.employees?.employee_code?.toLowerCase() || '';
      const query = debouncedSearchQuery.toLowerCase().trim();
      
      // Search by name or employee code (NIK)
      return fullName.includes(query) || employeeCode.includes(query);
    });
  }, [attendance, debouncedSearchQuery]);

  // Calculate stats dengan klasifikasi status detail
  // Gunakan useMemo untuk memastikan calculation hanya dilakukan setelah data ready
  const stats = useMemo(() => {
    const onTimeCount = filteredAttendance.filter(a => {
      const statusDetail = getAttendanceStatusDetail(a);
      return statusDetail.statusDetail === 'on_time';
    }).length;
    
    const withinToleranceCount = filteredAttendance.filter(a => {
      const statusDetail = getAttendanceStatusDetail(a);
      return statusDetail.statusDetail === 'within_tolerance';
    }).length;
    
    const lateCount = filteredAttendance.filter(a => {
      const statusDetail = getAttendanceStatusDetail(a);
      return statusDetail.statusDetail === 'late';
    }).length;

    // Debug logging (hanya di development)
    if (process.env.NODE_ENV === 'development' && filteredAttendance.length > 0) {
      // Cek semua record dengan status = 'late' untuk memastikan terdeteksi
      const recordsWithLateStatus = filteredAttendance.filter(r => r.status === 'late');
      const recordsWithLateNotes = filteredAttendance.filter(r => {
        const notes = r.notes?.toLowerCase() || '';
        return notes.includes('terlambat') || notes.includes('late') || notes.includes('melewati');
      });
      
      const sampleRecords = filteredAttendance.slice(0, 5).map(r => ({
        id: r.id,
        employee: r.employees.full_name,
        notes: r.notes || '(null)',
        status: r.status,
        checkInTime: r.check_in_time,
        statusDetail: getAttendanceStatusDetail(r),
        classification: {
          hasLateStatus: r.status === 'late',
          hasLateNotes: (r.notes?.toLowerCase() || '').includes('terlambat') || (r.notes?.toLowerCase() || '').includes('late') || (r.notes?.toLowerCase() || '').includes('melewati')
        }
      }));
      
      console.log('📊 Stats Calculation:', {
        total: filteredAttendance.length,
        onTime: onTimeCount,
        withinTolerance: withinToleranceCount,
        late: lateCount,
        schedulesLoaded: schedules.length,
        filter: filter,
        useMonthFilter: useMonthFilter,
        recordsWithLateStatus: recordsWithLateStatus.length,
        recordsWithLateNotes: recordsWithLateNotes.length,
        sampleRecords: sampleRecords
      });
      
      // Log records yang terlambat untuk debugging
      const lateRecords = filteredAttendance.filter(a => {
        const statusDetail = getAttendanceStatusDetail(a);
        return statusDetail.statusDetail === 'late';
      });
      
      if (lateRecords.length > 0) {
        console.log('🔍 Late Records Details:', lateRecords.map(r => ({
          id: r.id,
          employee: r.employees.full_name,
          notes: r.notes || '(null)',
          status: r.status,
          checkInTime: r.check_in_time,
          statusDetail: getAttendanceStatusDetail(r)
        })));
      } else {
        console.warn('⚠️ TIDAK ADA RECORD TERLAMBAT YANG TERDETEKSI!', {
          recordsWithLateStatus: recordsWithLateStatus.length,
          recordsWithLateNotes: recordsWithLateNotes.length,
          allStatuses: [...new Set(filteredAttendance.map(r => r.status))],
          sampleNotes: filteredAttendance.slice(0, 10).map(r => r.notes || '(null)')
        });
      }
    }

    return {
      total: filteredAttendance.length,
      present: filteredAttendance.filter(a => a.status === 'present').length,
      onTime: onTimeCount,
      withinTolerance: withinToleranceCount,
      late: lateCount,
      checkOut: filteredAttendance.filter(a => a.check_out_time).length,
    };
  }, [filteredAttendance, schedules]);

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
                      <div className="h-6 bg-slate-200 rounded w-40 animate-pulse"></div>
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
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
              {/* Stats Summary Skeleton */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 animate-pulse">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-slate-200 rounded w-20"></div>
                        <div className="h-6 bg-slate-300 rounded w-12"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Filter Tabs Skeleton */}
              <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 bg-slate-200 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              </div>

              {/* Search Skeleton */}
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 shadow-sm border border-slate-200">
                <div className="h-10 bg-slate-200 rounded-lg animate-pulse"></div>
              </div>

              {/* Attendance List Skeleton */}
              <div className="space-y-3">
                <SkeletonCard variant="attendance" count={5} />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const getInitials = (email: string) => {
    if (!email) return 'A';
    const name = email.split('@')[0];
    return name.substring(0, 2).toUpperCase();
  };

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
              <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <div className="flex flex-col min-w-0">
                  <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 truncate">Laporan Absensi</h2>
                  <p className="text-xs sm:text-sm text-slate-500 truncate">{currentDate}</p>
                </div>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-slate-500 font-medium">Total</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-green-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-slate-500 font-medium">Hadir</p>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.present}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-emerald-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-slate-500 font-medium">Tepat Waktu</p>
                <p className="text-xl sm:text-2xl font-bold text-emerald-600">{stats.onTime}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-orange-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-slate-500 font-medium">Toleransi</p>
                <p className="text-xl sm:text-2xl font-bold text-orange-600">{stats.withinTolerance}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-yellow-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-slate-500 font-medium">Terlambat</p>
                <p className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.late}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-indigo-200 hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-xs sm:text-sm text-slate-500 font-medium">Check-Out</p>
                <p className="text-xl sm:text-2xl font-bold text-indigo-600">{stats.checkOut}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs & Month Picker */}
        <div className="mb-6 space-y-4">
          {/* Quick Filters */}
          <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-sm border border-slate-200">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
              <button
                onClick={() => { setFilter('today'); setUseMonthFilter(false); setSearchQuery(''); }}
                className={`px-3 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  filter === 'today' && !useMonthFilter
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Hari Ini
              </button>
              <button
                onClick={() => { setFilter('week'); setUseMonthFilter(false); setSearchQuery(''); }}
                className={`px-3 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  filter === 'week' && !useMonthFilter
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                7 Hari
              </button>
              <button
                onClick={() => { setFilter('custom'); setUseMonthFilter(true); }}
                className={`px-3 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                  useMonthFilter
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="hidden sm:inline">📅 </span>Per Bulan
              </button>
              <div className="relative" ref={downloadMenuRef}>
                <button
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  disabled={filteredAttendance.length === 0}
                  className="px-3 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md hover:shadow-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 sm:gap-2 w-full"
                >
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">Download</span>
                  <span className="sm:hidden">Download</span>
                  <svg className={`w-3 h-3 transition-transform ${showDownloadMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                {showDownloadMenu && (
                  <div className="absolute right-0 mt-2 w-48 sm:w-56 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50 animate-fadeIn">
                    <button
                      onClick={handleExportExcel}
                      disabled={filteredAttendance.length === 0}
                      className="w-full px-4 py-3 text-left hover:bg-green-50 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">Download Excel</p>
                        <p className="text-xs text-slate-500 truncate">File .xlsx</p>
                      </div>
                    </button>
                    
                    <div className="h-px bg-slate-200"></div>
                    
                    <button
                      onClick={handleExportPDF}
                      disabled={filteredAttendance.length === 0}
                      className="w-full px-4 py-3 text-left hover:bg-red-50 transition-colors flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">Download PDF</p>
                        <p className="text-xs text-slate-500 truncate">File .pdf</p>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Month Picker & Search */}
          {useMonthFilter && (
            <div className="bg-white rounded-xl sm:rounded-2xl p-4 shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Month Picker */}
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    📅 Pilih Bulan & Tahun:
                  </label>
                  <DatePicker
                    selected={selectedMonth}
                    onChange={(date: Date | null) => date && setSelectedMonth(date)}
                    dateFormat="MMMM yyyy"
                    showMonthYearPicker
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium"
                  />
                </div>

                {/* Search Input */}
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    🔍 Cari Karyawan:
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ketik nama atau NIK karyawan..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full px-4 py-2.5 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm font-medium placeholder:text-slate-400"
                    />
                    {searchQuery ? (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        title="Clear search"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    ) : (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Search Results Info */}
              {attendance.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  {searchQuery ? (
                    <p className="text-xs text-slate-600">
                      📊 Menampilkan <span className="font-bold text-blue-600">{filteredAttendance.length}</span> dari <span className="font-semibold">{attendance.length}</span> data {filteredAttendance.length === 0 && <span className="text-red-600">(tidak ditemukan)</span>}
                      {filteredAttendance.length > 0 && <span className="text-slate-500"> untuk "{searchQuery}"</span>}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500">
                      📊 Menampilkan {attendance.length} data absensi untuk periode yang dipilih
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Attendance List */}
          {filteredAttendance.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {searchQuery ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                )}
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {searchQuery ? 'Tidak Ditemukan' : 'Tidak Ada Data'}
            </h3>
            <p className="text-slate-500">
              {searchQuery 
                ? `Tidak ada hasil untuk "${searchQuery}". Coba kata kunci lain.`
                : 'Belum ada data absensi untuk periode ini'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Reset Pencarian
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredAttendance.map((record) => {
              // Gunakan getStatusDetailInfo untuk menampilkan status detail (Tepat Waktu, Dalam Toleransi, Terlambat)
              const statusDetailInfo = getStatusDetailInfo(record);
              const checkIn = formatDateTime(record.check_in_time);
              const checkOut = record.check_out_time ? formatDateTime(record.check_out_time) : null;
              
              return (
                <div key={record.id} className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all overflow-hidden">
                  <div className="p-3 sm:p-4">
                    <div className="flex flex-col gap-3">
                      {/* Employee Info with Status Badge - MOBILE & DESKTOP */}
                      <div className="flex items-start sm:items-center gap-3">
                        {record.employees.avatar_url ? (
                          <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg shadow-sm border-2 border-white flex-shrink-0 overflow-hidden">
                            <Image 
                              src={record.employees.avatar_url} 
                              alt={record.employees.full_name}
                              fill
                              className="object-cover"
                              sizes="(max-width: 640px) 44px, 48px"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm sm:text-base shadow-sm flex-shrink-0">
                            {record.employees.full_name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">{record.employees.full_name}</h3>
                          <p className="text-xs text-slate-500">{record.employees.employee_code}</p>
                  </div>
                        {/* Status Badge - Menampilkan status detail (Tepat Waktu, Dalam Toleransi, Terlambat) */}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs font-semibold border flex-shrink-0 ${statusDetailInfo.bgColor} ${statusDetailInfo.textColor} ${statusDetailInfo.borderColor}`}>
                          <span>{statusDetailInfo.icon}</span>
                          <span className="hidden sm:inline">{statusDetailInfo.label}</span>
                  </span>
                </div>
                
                      {/* Time Info & Action Button */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                        {/* Check In & Check Out - Grid */}
                        <div className="grid grid-cols-2 gap-3 sm:gap-4 flex-1 w-full sm:w-auto">
                          {/* Check In */}
                          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                            <div className="flex items-center gap-2 mb-1">
                              <svg className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                              </svg>
                              <p className="text-xs text-slate-500 font-medium">Check-In</p>
                            </div>
                            <p className="text-sm font-bold text-slate-900">{checkIn.time}</p>
                            <p className="text-xs text-slate-500">{checkIn.date}</p>
                          </div>

                          {/* Check Out */}
                          <div className={`rounded-lg p-2.5 border ${checkOut ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <svg className={`w-3.5 h-3.5 flex-shrink-0 ${checkOut ? 'text-indigo-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                              </svg>
                              <p className="text-xs text-slate-500 font-medium">Check-Out</p>
                            </div>
                            {checkOut ? (
                              <>
                                <p className="text-sm font-bold text-slate-900">{checkOut.time}</p>
                                <p className="text-xs text-slate-500">{checkOut.date}</p>
                              </>
                            ) : (
                              <p className="text-sm text-slate-400">Belum</p>
                            )}
                          </div>
                        </div>
                        
                        {/* Action Button */}
                        <button
                          onClick={() => handleViewDetail(record)}
                          className="w-full sm:w-auto px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-600 hover:text-blue-700 text-sm font-semibold transition-all flex items-center justify-center gap-2 group/btn flex-shrink-0"
                        >
                          <svg className="w-4 h-4 group-hover/btn:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <span>Detail</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Detail Modal - Redesigned Compact & Professional */}
        {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white rounded-xl sm:rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            {/* Header - Compact */}
            <div className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {selectedRecord.employees.avatar_url ? (
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl border-2 border-white/40 shadow-lg flex-shrink-0 overflow-hidden">
                      <Image 
                        src={selectedRecord.employees.avatar_url} 
                        alt={selectedRecord.employees.full_name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 48px, 56px"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white/20 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0">
                      {selectedRecord.employees.full_name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-white truncate">{selectedRecord.employees.full_name}</h2>
                    <p className="text-xs text-white/80 truncate">{selectedRecord.employees.employee_code}</p>
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
            <div className="p-4 sm:p-5 bg-slate-50 space-y-3">
              {/* Status & Score - Horizontal on mobile, Grid on larger */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <p className="text-xs text-slate-500 font-medium mb-1.5">Status Kehadiran</p>
                  {(() => {
                    // Gunakan getStatusDetailInfo untuk menampilkan status detail di modal
                    const statusDetailInfo = getStatusDetailInfo(selectedRecord);
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold ${statusDetailInfo.bgColor} ${statusDetailInfo.textColor}`}>
                        <span>{statusDetailInfo.icon}</span>
                        <span>{statusDetailInfo.label}</span>
                      </span>
                    );
                  })()}
                </div>

                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <p className="text-xs text-slate-500 font-medium mb-1.5">Skor Verifikasi</p>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900">
                    {selectedRecord.face_match_score 
                      ? `${selectedRecord.face_match_score.toFixed(1)}%`
                      : 'N/A'
                    }
                  </p>
                </div>
              </div>

              {/* Time Details - Compact */}
              <div className="bg-white rounded-lg p-3 sm:p-4 border border-slate-200">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {/* Check In */}
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                      </div>
                      <p className="text-xs text-slate-500 font-semibold">Check-In</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900 mb-0.5">
                      {formatDateTime(selectedRecord.check_in_time).time}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(selectedRecord.check_in_time).date}
                    </p>
        </div>

                  {/* Check Out */}
                        <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${selectedRecord.check_out_time ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                        <svg className={`w-4 h-4 ${selectedRecord.check_out_time ? 'text-indigo-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                      </div>
                      <p className="text-xs text-slate-500 font-semibold">Check-Out</p>
                        </div>
                    {selectedRecord.check_out_time ? (
                      <>
                        <p className="text-sm font-bold text-slate-900 mb-0.5">
                          {formatDateTime(selectedRecord.check_out_time).time}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDateTime(selectedRecord.check_out_time).date}
                        </p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-400 italic">Belum check-out</p>
                    )}
                  </div>
          </div>
        </div>

              {/* Location - Compact */}
              {(selectedRecord.check_in_latitude && selectedRecord.check_in_longitude) && (
                <div className="bg-white rounded-lg p-3 border border-slate-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-xs text-slate-500 font-semibold">Lokasi Check-In</p>
          </div>
                  <p className="text-xs text-slate-700 font-mono bg-slate-50 px-2 py-1 rounded border border-slate-200">
                    {selectedRecord.check_in_latitude.toFixed(6)}, {selectedRecord.check_in_longitude.toFixed(6)}
            </p>
          </div>
              )}
            </div>

            {/* Footer - Compact */}
            <div className="p-3 sm:p-4 bg-white border-t border-slate-200">
              <button
                onClick={() => setShowDetailModal(false)}
                className="w-full bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 font-semibold py-2.5 px-4 rounded-lg transition-all text-sm"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
        )}
        </div>
      </main>
      </div>
    </div>
  );
}
