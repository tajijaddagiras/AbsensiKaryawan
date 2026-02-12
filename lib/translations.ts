export type Language = 'id' | 'en';

export const translations = {
  id: {
    nav: {
      features: 'Fitur',
      howItWorks: 'Cara Kerja',
      stats: 'Statistik',
      pricing: 'Harga',
      login: 'Masuk',
      register: 'Daftar Sekarang',
    },
    hero: {
      badge: 'Solusi Absensi Modern Terpercaya',
      title: 'Absensi Karyawan Lebih Cepat & Akurat',
      description: 'Tingkatkan efisiensi manajemen kehadiran dengan teknologi pengenalan wajah canggih. Aman, mudah digunakan, dan terintegrasi real-time.',
      ctaPrimary: 'Coba Sekarang Gratis',
      ctaSecondary: 'Pelajari Cara Kerja',
      benefits: ['Akurasi Tinggi 99.9%', 'Anti-Spoofing', 'Laporan Real-time'],
      scroll: 'Scroll ke bawah',
    },
    features: {
      badge: 'Fitur Unggulan',
      title: 'Teknologi Canggih untuk Absensi',
      description: 'Tinggalkan cara lama. Beralih ke sistem absensi biometrik yang lebih aman, akurat, dan efisien.',
      items: [
        { title: 'Pengenalan Wajah Cepat', desc: 'Deteksi wajah super cepat hanya dalam hitungan detik dengan akurasi 99.9% menggunakan AI terbaru.' },
        { title: 'Pencatatan Real-time', desc: 'Data kehadiran tercatat otomatis secara real-time ke database, tidak ada lagi manipulasi jam masuk.' },
        { title: 'Anti-Spoofing', desc: 'Sistem keamanan canggih yang mampu membedakan wajah asli dengan foto atau video untuk mencegah kecurangan.' },
        { title: 'Laporan Otomatis', desc: 'Generate laporan kehadiran harian, mingguan, atau bulanan secara otomatis dengan format yang mudah dibaca.' },
        { title: 'Manajemen Karyawan', desc: 'Kelola data karyawan, jam kerja, dan shift dengan mudah dalam satu dashboard terpusat.' },
        { title: 'Integrasi Mudah', desc: 'API yang fleksibel memudahkan integrasi dengan sistem HRIS atau payroll yang sudah perusahaan Anda gunakan.' },
      ]
    },
    howItWorks: {
      badge: 'Proses Absensi',
      title: 'Absensi Mudah & Aman',
      description: 'Proses absensi yang dirancang untuk efisiensi dan keamanan maksimal.',
      steps: [
        { title: 'Scan Wajah', desc: 'Karyawan melakukan scan wajah melalui aplikasi di perangkat mereka.' },
        { title: 'Pencocokan AI', desc: 'Sistem mencocokkan wajah secara instan dengan database untuk verifikasi identitas.' },
        { title: 'Verifikasi Lokasi (GPS)', desc: 'Validasi lokasi GPS untuk memastikan karyawan berada di area yang ditentukan.' },
        { title: 'Absensi Terkirim', desc: 'Data kehadiran tercatat otomatis dan tersimpan aman di server.' },
      ]
    },
    stats: {
      items: [
        { value: '99.9%', label: 'Akurasi Wajah' },
        { value: '1M+', label: 'Absensi Tercatat' },
        { value: '24/7', label: 'Support System' },
      ]
    },
    cta: {
      title: 'Siap Transformasi Sistem Absensi Anda?',
      description: 'Mulai uji coba gratis sekarang dan rasakan kemudahan pengelolaan kehadiran karyawan tanpa ribet.',
      primary: 'Mulai Sekarang Gratis',
      secondary: 'Hubungi Tim',
    },
    footer: {
      about: 'Solusi absensi berbasis pengenalan wajah terbaik untuk meningkatkan produktivitas dan kedisiplinan perusahaan Anda.',
      quickLinks: 'Tautan Cepat',
      support: 'Dukungan',
      contact: 'Hubungi Kami',
      copyright: '© 2024 AbsensiFR. Hak Cipta Dilindungi.',
      links: {
        home: 'Beranda',
        help: 'Pusat Bantuan',
        terms: 'Syarat & Ketentuan',
        privacy: 'Kebijakan Privasi',
        faq: 'FAQ',
      }
    }
  },
  en: {
    nav: {
      features: 'Features',
      howItWorks: 'How It Works',
      stats: 'Stats',
      pricing: 'Pricing',
      login: 'Login',
      register: 'Register Now',
    },
    hero: {
      badge: 'Trusted Modern Attendance Solution',
      title: 'Faster & More Accurate Employee Attendance',
      description: 'Improve attendance management efficiency with advanced face recognition technology. Secure, easy to use, and integrated in real-time.',
      ctaPrimary: 'Try Now for Free',
      ctaSecondary: 'Learn How It Works',
      benefits: ['99.9% High Accuracy', 'Anti-Spoofing', 'Real-time Reports'],
      scroll: 'Scroll down',
    },
    features: {
      badge: 'Key Features',
      title: 'Advanced Tech for Attendance',
      description: 'Leave the old ways. Switch to a biometric attendance system that is safer, more accurate, and efficient.',
      items: [
        { title: 'Fast Face Recognition', desc: 'Super fast face detection in seconds with 99.9% accuracy using the latest AI.' },
        { title: 'Real-time Recording', desc: 'Attendance data is recorded automatically in real-time to the database, no more time manipulation.' },
        { title: 'Anti-Spoofing', desc: 'Advanced security system capable of distinguishing real faces from photos or videos to prevent fraud.' },
        { title: 'Automatic Reports', desc: 'Generate daily, weekly, or monthly attendance reports automatically in an easy-to-read format.' },
        { title: 'Employee Management', desc: 'Manage employee data, working hours, and shifts easily in one centralized dashboard.' },
        { title: 'Easy Integration', desc: 'Flexible API makes it easy to integrate with the HRIS or payroll system your company already uses.' },
      ]
    },
    howItWorks: {
      badge: 'Attendance Workflow',
      title: 'Easy & Secure Attendance',
      description: 'Attendance process designed for maximum efficiency and security.',
      steps: [
        { title: 'Scan Face', desc: 'Employees scan their face via the app on their device.' },
        { title: 'AI Matching', desc: 'System instantly matches face with database for identity verification.' },
        { title: 'Location Verification (GPS)', desc: 'GPS validation ensures employees are at the office or designated location.' },
        { title: 'Attendance Recorded', desc: 'Attendance data is automatically recorded and securely stored.' },
      ]
    },
    stats: {
      items: [
        { value: '99.9%', label: 'Face Accuracy' },
        { value: '1M+', label: 'Recorded Attendance' },
        { value: '24/7', label: 'Support System' },
      ]
    },
    cta: {
      title: 'Ready to Transform Your Attendance System?',
      description: 'Start your free trial now and experience the ease of managing employee attendance without the hassle.',
      primary: 'Start Now for Free',
      secondary: 'Contact Team',
    },
    footer: {
      about: 'The best face recognition-based attendance solution to improve your company productivity and discipline.',
      quickLinks: 'Quick Links',
      support: 'Support',
      contact: 'Contact Us',
      copyright: '© 2024 AbsensiFR. All Rights Reserved.',
      links: {
        home: 'Home',
        help: 'Help Center',
        terms: 'Terms of Service',
        privacy: 'Privacy Policy',
        faq: 'FAQ',
      }
    }
  }
};
