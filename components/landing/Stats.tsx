'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/LanguageContext';

export default function Stats() {
  const { t } = useLanguage();

  return (
    <section id="stats" className="py-24 bg-blue-600 relative overflow-hidden">
       {/* Abstract Pattern */}
       <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-800/10 skew-x-12 transform origin-top" />
       <div className="absolute bottom-0 left-0 w-1/2 h-full bg-blue-500/10 -skew-x-12 transform origin-bottom" />

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 divide-y md:divide-y-0 md:divide-x divide-blue-500/30 max-w-5xl mx-auto">
          {t.stats.items.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center pt-8 md:pt-0 px-4"
            >
              <h3 className="text-4xl md:text-5xl font-extrabold text-white mb-2 tracking-tight">
                {stat.value}
              </h3>
              <p className="text-blue-100 font-medium text-lg">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
