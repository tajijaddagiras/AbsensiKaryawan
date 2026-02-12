'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

export default function CTA() {
  const { t } = useLanguage();

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="bg-slate-900 rounded-3xl p-10 md:p-20 text-center relative overflow-hidden shadow-2xl">
          
          {/* Subtle Glows */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px]" />

          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight relative z-10"
          >
            {t.cta.title}
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed relative z-10"
          >
            {t.cta.description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10"
          >
            <Link
              href="/admin"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg transition-all duration-300 transform hover:-translate-y-1 shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2"
            >
              {t.cta.primary}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="https://wa.me/6281265098103"
              target="_blank"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-800 text-white font-semibold text-lg hover:bg-slate-700 border border-slate-700 transition-all duration-300 flex items-center justify-center"
            >
              {t.cta.secondary}
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
