'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Camera } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useLanguage } from '@/lib/LanguageContext';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { t, language, setLanguage } = useLanguage();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: t.nav.features, href: '#features' },
    { name: t.nav.howItWorks, href: '#how-it-works' },
    { name: t.nav.stats, href: '#stats' },
  ];

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-white/90 backdrop-blur-md border-b border-slate-200 py-4 shadow-sm'
          : 'bg-transparent py-6'
      )}
    >
      <div className="container mx-auto px-6 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 shadow-lg shadow-blue-600/20 group-hover:scale-105 transition-transform duration-300">
            <Camera className="w-5 h-5 text-white" />
          </div>
          <span className={cn("text-xl font-bold transition-colors", isScrolled ? "text-slate-900" : "text-white")}>
            AbsensiFR
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <div className="flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className={cn(
                  "text-sm font-semibold transition-colors relative group",
                  isScrolled ? "text-slate-600 hover:text-blue-600" : "text-white/80 hover:text-white"
                )}
              >
                {link.name}
              </Link>
            ))}
          </div>

          <div className="h-6 w-px bg-slate-200/20 mx-2" />

          {/* Language Switcher */}
          <div className="flex items-center gap-2 bg-slate-100/10 rounded-full p-1 border border-white/10">
            <button
              onClick={() => setLanguage('id')}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                language === 'id' 
                  ? "bg-white text-blue-600 shadow-sm" 
                  : isScrolled ? "text-slate-500 hover:text-slate-900" : "text-white/60 hover:text-white"
              )}
            >
              ID
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                language === 'en' 
                  ? "bg-white text-blue-600 shadow-sm" 
                  : isScrolled ? "text-slate-500 hover:text-slate-900" : "text-white/60 hover:text-white"
              )}
            >
              EN
            </button>
          </div>

          <Link
            href="/admin"
            className={cn(
              "px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300",
              isScrolled 
                ? "bg-slate-900 text-white hover:bg-slate-800" 
                : "bg-white text-slate-900 hover:bg-slate-100"
            )}
          >
            {t.nav.login}
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn("md:hidden transition-colors", isScrolled ? "text-slate-900" : "text-white")}
        >
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-b border-slate-200 overflow-hidden shadow-xl"
          >
            <div className="container mx-auto px-6 py-4 flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="text-slate-600 hover:text-blue-600 font-medium py-2"
                >
                  {link.name}
                </Link>
              ))}
              
              <div className="flex gap-4 py-2 border-t border-slate-100 mt-2">
                <button 
                  onClick={() => { setLanguage('id'); setIsOpen(false); }}
                  className={cn("flex-1 py-2 rounded-lg text-sm font-bold", language === 'id' ? "bg-blue-50 text-blue-600" : "text-slate-500")}
                >
                  Indonesia
                </button>
                <button 
                  onClick={() => { setLanguage('en'); setIsOpen(false); }}
                  className={cn("flex-1 py-2 rounded-lg text-sm font-bold", language === 'en' ? "bg-blue-50 text-blue-600" : "text-slate-500")}
                >
                  English
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center py-3 rounded-xl text-slate-600 border border-slate-200 hover:bg-slate-50 font-bold"
                >
                  {t.nav.login}
                </Link>
                <Link
                  href="/admin"
                  onClick={() => setIsOpen(false)}
                  className="w-full text-center py-3 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-600/20"
                >
                  {t.nav.register}
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
