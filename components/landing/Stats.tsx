'use client';

export default function Stats() {
  const stats = [
    {
      value: '99.9%',
      label: 'Akurasi Wajah',
      description: 'Teknologi pengenalan wajah dengan presisi tinggi',
      color: 'text-primary-400',
    },
    {
      value: '< 1s',
      label: 'Kecepatan Scan',
      description: 'Proses absensi instan tanpa antrian',
      color: 'text-secondary-400',
    },
    {
      value: '10k+',
      label: 'Karyawan Aktif',
      description: 'Dipercaya oleh berbagai perusahaan',
      color: 'text-blue-400',
    },
    {
      value: '24/7',
      label: 'Uptime Server',
      description: 'Sistem selalu online dan dapat diakses',
      color: 'text-emerald-400',
    },
  ];

  return (
    <section id="stats" className="py-24 bg-slate-900 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-500/5 rounded-full blur-[100px]"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat, index) => (
            <div key={index} className="text-center group">
              <div className={`text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 ${stat.color} transition-transform duration-300 group-hover:scale-110`}>
                {stat.value}
              </div>
              <div className="text-lg font-semibold text-white mb-2">
                {stat.label}
              </div>
              <p className="text-sm text-slate-400">
                {stat.description}
              </p>
            </div>
          ))}
        </div>

        {/* Trust Section */}
        <div className="mt-24 text-center">
          <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-8">
            Dipercaya oleh Perusahaan Terdepan
          </p>
          <div className="flex flex-wrap justify-center gap-8 lg:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Placeholder Logos - In production use real logos */}
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-8 w-32 bg-slate-700/50 rounded flex items-center justify-center text-slate-500 text-xs font-bold">
                PARTNER {i}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

