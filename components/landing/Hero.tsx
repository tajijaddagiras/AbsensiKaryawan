'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-900 pt-20">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Modern Gradient Background */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0B1120] to-black"></div>
        
        {/* Animated Mesh Gradients */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-500/10 blur-[100px] animate-blob"></div>
        <div className="absolute top-[20%] right-[-10%] w-[35%] h-[35%] rounded-full bg-secondary-500/10 blur-[100px] animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[100px] animate-blob animation-delay-4000"></div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          
          {/* Left Content */}
          <div className={`flex-1 text-center lg:text-left transition-all duration-1000 transform ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 border border-slate-700 backdrop-blur-sm mb-8 hover:bg-slate-800/70 transition-colors cursor-default">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-sm font-medium text-slate-300">Teknologi Face Recognition Terbaru</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 leading-[1.1] tracking-tight">
              Absensi Karyawan <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-blue-400 to-secondary-400">
                Lebih Cerdas
              </span>
            </h1>

            {/* Description */}
            <p className="text-lg sm:text-xl text-slate-400 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Tingkatkan efisiensi operasional dengan sistem absensi berbasis AI. 
              Akurasi tinggi, anti-fraud, dan laporan real-time dalam satu dashboard terintegrasi.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link
                href="/admin"
                className="group px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white text-lg font-semibold rounded-2xl transition-all duration-300 shadow-lg shadow-primary-600/25 hover:shadow-primary-600/40 hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                Mulai Sekarang
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <button
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-4 bg-slate-800/50 hover:bg-slate-800 text-white text-lg font-semibold rounded-2xl border border-slate-700 transition-all duration-300 hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                Pelajari Lebih Lanjut
              </button>
            </div>

            {/* Trust Metrics */}
            <div className="mt-12 pt-8 border-t border-slate-800/50 grid grid-cols-3 gap-8">
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">99.9%</div>
                <div className="text-sm text-slate-500">Akurasi Wajah</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">&lt;1s</div>
                <div className="text-sm text-slate-500">Kecepatan Scan</div>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-bold text-white mb-1">24/7</div>
                <div className="text-sm text-slate-500">Real-time Data</div>
              </div>
            </div>
          </div>

          {/* Right Content - 3D Dashboard Preview */}
          <div className={`flex-1 relative perspective-1000 transition-all duration-1000 delay-300 transform ${mounted ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'}`}>
            <div className="relative transform rotate-y-[-5deg] rotate-x-[5deg] hover:rotate-0 transition-transform duration-500 ease-out preserve-3d">
              {/* Main Dashboard Card */}
              <div className="relative bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden">
                {/* Header Bar */}
                <div className="h-12 bg-slate-800/50 border-b border-slate-700/50 flex items-center px-4 gap-2">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                  </div>
                  <div className="ml-4 px-3 py-1 bg-slate-950/50 rounded-full text-xs text-slate-500 flex-1 text-center font-mono">
                    absensi-dashboard.app
                  </div>
                </div>

                {/* Dashboard Content */}
                <div className="p-6 space-y-6">
                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/30">
                      <div className="text-slate-400 text-xs mb-1">Total Kehadiran</div>
                      <div className="text-2xl font-bold text-white">1,248</div>
                      <div className="text-green-400 text-xs mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        +12% vs kemarin
                      </div>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/30">
                      <div className="text-slate-400 text-xs mb-1">Tepat Waktu</div>
                      <div className="text-2xl font-bold text-white">98.5%</div>
                      <div className="text-primary-400 text-xs mt-1 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        Excellent
                      </div>
                    </div>
                  </div>

                  {/* Chart Area */}
                  <div className="bg-slate-800/30 p-4 rounded-2xl border border-slate-700/30 h-48 relative overflow-hidden group">
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-sm font-semibold text-white">Aktivitas Mingguan</div>
                      <div className="text-xs text-slate-500">Last 7 days</div>
                    </div>
                    <div className="flex items-end justify-between h-32 gap-2 px-2">
                      {[40, 70, 45, 90, 65, 85, 95].map((height, i) => (
                        <div key={i} className="w-full bg-slate-700/30 rounded-t-lg relative group-hover:bg-slate-700/40 transition-colors overflow-hidden">
                          <div 
                            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary-600 to-primary-400 rounded-t-lg transition-all duration-1000 ease-out"
                            style={{ height: `${mounted ? height : 0}%` }}
                          ></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Live Verification Feed */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-white">Live Verification Feed</div>
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-xs text-green-400 font-medium">Live System</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {[
                        { user: 'Andi D.', action: 'Face Verified', status: 'Success (99.9%)', time: 'Just now', icon: 'face', color: 'green' },
                        { user: 'Andi D.', action: 'Location Check', status: 'Valid (Office)', time: 'Just now', icon: 'location', color: 'blue' },
                        { user: 'Rina K.', action: 'Face Verified', status: 'Success (99.8%)', time: '2m ago', icon: 'face', color: 'green' },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center gap-3 bg-slate-800/30 p-3 rounded-xl border border-slate-700/30 hover:bg-slate-800/50 transition-colors">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            item.color === 'green' ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'
                          }`}>
                            {item.icon === 'face' ? (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <div className="text-sm font-medium text-white truncate">{item.action}</div>
                              <div className="text-xs text-slate-500">{item.time}</div>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-400">{item.user}</span>
                              <span className="text-slate-600">•</span>
                              <span className={item.color === 'green' ? 'text-green-400' : 'text-blue-400'}>{item.status}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

