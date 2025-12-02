'use client';

import Link from 'next/link';

export default function CTA() {
  return (
    <section id="cta" className="py-24 bg-slate-950 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="relative rounded-[2.5rem] overflow-hidden bg-gradient-to-br from-primary-600 to-secondary-700 shadow-2xl shadow-primary-900/50">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-black/10 rounded-full blur-3xl"></div>

          <div className="relative z-10 px-8 py-20 text-center">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight">
              Siap Transformasi <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-300">
                Sistem Absensi Anda?
              </span>
            </h2>
            <p className="text-lg sm:text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
              Bergabunglah dengan ribuan perusahaan yang telah beralih ke sistem absensi modern berbasis AI.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/admin"
                className="px-8 py-4 bg-white text-primary-600 text-lg font-bold rounded-2xl shadow-xl hover:shadow-2xl hover:bg-slate-50 transition-all hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                Mulai Sekarang Gratis
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="px-8 py-4 bg-primary-700/50 backdrop-blur-sm border border-primary-500/50 text-white text-lg font-bold rounded-2xl hover:bg-primary-700/70 transition-all hover:-translate-y-1"
              >
                Hubungi Sales
              </button>
            </div>
          </div>
        </div>

        {/* Contact Grid */}
        <div className="mt-20 grid md:grid-cols-3 gap-8">
          {[
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              ),
              title: 'Email Support',
              value: 'support@absensipintar.id',
              link: 'mailto:support@absensipintar.id'
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              ),
              title: 'Call Center',
              value: '+62 21 5000-1234',
              link: 'tel:+622150001234'
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              ),
              title: 'Live Chat',
              value: 'Chat WhatsApp',
              link: 'https://wa.me/6281122334455'
            }
          ].map((item, idx) => (
            <a
              key={idx}
              href={item.link}
              className="flex items-center gap-4 p-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-primary-500/50 hover:bg-slate-800 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-primary-500 group-hover:bg-primary-500 group-hover:text-white transition-colors">
                {item.icon}
              </div>
              <div>
                <div className="text-slate-400 text-sm font-medium mb-1">{item.title}</div>
                <div className="text-white font-bold">{item.value}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
