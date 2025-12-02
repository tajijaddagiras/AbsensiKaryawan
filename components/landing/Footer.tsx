'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center text-white font-bold text-xl">
                A
              </div>
              <span className="text-xl font-bold text-white">Absensi<span className="text-primary-500">Pintar</span></span>
            </Link>
            <p className="text-slate-500 mb-6 max-w-sm leading-relaxed">
              Platform absensi wajah berbasis AI yang membantu perusahaan meningkatkan efisiensi dan keamanan data kehadiran karyawan.
            </p>
            <div className="flex gap-4">
              {['twitter', 'github', 'linkedin', 'instagram'].map((social) => (
                <a key={social} href={`#${social}`} className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center hover:bg-primary-500 hover:text-white transition-all">
                  <span className="sr-only">{social}</span>
                  <div className="w-4 h-4 bg-current rounded-sm"></div>
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-white font-bold mb-6">Produk</h3>
            <ul className="space-y-4">
              <li><Link href="#features" className="hover:text-primary-400 transition-colors">Fitur Utama</Link></li>
              <li><Link href="#how-it-works" className="hover:text-primary-400 transition-colors">Cara Kerja</Link></li>
              <li><Link href="#pricing" className="hover:text-primary-400 transition-colors">Harga</Link></li>
              <li><Link href="#faq" className="hover:text-primary-400 transition-colors">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-bold mb-6">Perusahaan</h3>
            <ul className="space-y-4">
              <li><Link href="/about" className="hover:text-primary-400 transition-colors">Tentang Kami</Link></li>
              <li><Link href="/blog" className="hover:text-primary-400 transition-colors">Blog</Link></li>
              <li><Link href="/careers" className="hover:text-primary-400 transition-colors">Karir</Link></li>
              <li><Link href="/contact" className="hover:text-primary-400 transition-colors">Kontak</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm">© {new Date().getFullYear()} Absensi Pintar. All rights reserved.</p>
          <div className="flex gap-8 text-sm">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

