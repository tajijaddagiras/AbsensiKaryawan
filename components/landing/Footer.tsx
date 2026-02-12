'use client';

import Link from 'next/link';
import { Facebook, Twitter, Instagram, Linkedin, Camera, Mail, Phone, MapPin } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-white pt-20 pb-10 border-t border-slate-100 font-sans text-slate-600">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Brand Column */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-6 group">
               <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 shadow-md group-hover:bg-blue-700 transition-colors duration-300">
                <Camera className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">AbsensiFR</span>
            </Link>
            <p className="mb-8 leading-relaxed text-sm font-medium">
              {t.footer.about}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-slate-900 font-bold mb-6">{t.footer.quickLinks}</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><Link href="#" className="hover:text-blue-600 transition-colors">{t.footer.links.home}</Link></li>
              <li><Link href="#features" className="hover:text-blue-600 transition-colors">{t.nav.features}</Link></li>
              <li><Link href="#how-it-works" className="hover:text-blue-600 transition-colors">{t.nav.howItWorks}</Link></li>
              <li><Link href="#pricing" className="hover:text-blue-600 transition-colors">{t.nav.pricing}</Link></li>
              <li><Link href="/login" className="hover:text-blue-600 transition-colors">{t.nav.login}</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-slate-900 font-bold mb-6">{t.footer.support}</h4>
             <ul className="space-y-4 text-sm font-medium">
              <li><Link href="#" className="hover:text-blue-600 transition-colors">{t.footer.links.help}</Link></li>
              <li><Link href="#" className="hover:text-blue-600 transition-colors">{t.footer.links.terms}</Link></li>
              <li><Link href="#" className="hover:text-blue-600 transition-colors">{t.footer.links.privacy}</Link></li>
              <li><Link href="#" className="hover:text-blue-600 transition-colors">{t.footer.links.faq}</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-slate-900 font-bold mb-6">{t.footer.contact}</h4>
             <ul className="space-y-4 text-sm font-medium">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-blue-600 shrink-0" />
                <span>Dendang, Stabat, Sumatra Utara, Indonesia</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-blue-600 shrink-0" />
                <span>081265098103</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-blue-600 shrink-0" />
                <span>tajijaddagirassntosa@gmail.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium">
          <p>{t.footer.copyright}</p>
          <div className="flex gap-8">
            <Link href="#" className="hover:text-blue-600 transition-colors">{t.footer.links.privacy}</Link>
            <Link href="#" className="hover:text-blue-600 transition-colors">{t.footer.links.terms}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
