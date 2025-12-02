'use client';

export default function Features() {
  const features = [
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: 'Face Recognition AI',
      description: 'Teknologi pengenalan wajah biometrik dengan akurasi 99.9% dan anti-spoofing detection.',
      color: 'blue'
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      title: 'Real-time Analytics',
      description: 'Dashboard analitik komprehensif untuk memantau kehadiran dan produktivitas karyawan.',
      color: 'purple'
    },
    {
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      title: 'Geo-Fencing',
      description: 'Validasi lokasi berbasis GPS untuk memastikan karyawan absen di lokasi yang ditentukan.',
      color: 'emerald'
    },
  ];

  return (
    <section id="features" className="py-24 bg-slate-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent"></div>
      <div className="absolute -left-20 top-40 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px]"></div>
      <div className="absolute -right-20 bottom-40 w-96 h-96 bg-purple-500/10 rounded-full blur-[100px]"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Fitur Canggih untuk <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400">
              Manajemen Karyawan Modern
            </span>
          </h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Platform all-in-one yang menggabungkan keamanan biometrik dengan kemudahan penggunaan.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-8 rounded-3xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-all duration-300 hover:-translate-y-1"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-colors ${
                feature.color === 'blue' ? 'bg-blue-500/10 text-blue-400 group-hover:bg-blue-500 group-hover:text-white' :
                feature.color === 'purple' ? 'bg-purple-500/10 text-purple-400 group-hover:bg-purple-500 group-hover:text-white' :
                'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white'
              }`}>
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-slate-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Additional Features Grid */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: '📱', title: 'Mobile App', desc: 'Android & iOS' },
            { icon: '🔒', title: 'Enkripsi Data', desc: 'AES-256 Security' },
            { icon: '☁️', title: 'Cloud Base', desc: 'Akses Dimana Saja' },
            { icon: '💬', title: 'Support 24/7', desc: 'Bantuan Teknis' },
          ].map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-800/30 border border-slate-700/30 flex items-center gap-4 hover:bg-slate-800/50 transition-colors">
              <div className="text-2xl">{item.icon}</div>
              <div>
                <div className="font-semibold text-white text-sm">{item.title}</div>
                <div className="text-xs text-slate-500">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

