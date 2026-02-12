'use client';

import { motion } from 'framer-motion';
import { useLanguage } from '@/lib/LanguageContext';
import { cn } from '@/lib/cn';

const images = [
  "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?q=80&w=1965", // Scan Wajah (Facial Recognition Tech Concept)
  "https://images.unsplash.com/photo-1555255707-c07966088b7b?q=80&w=2000", // AI Matching (Data Processing / Tech)
  "https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?ixlib=rb-4.0.3&auto=format&fit=crop&w=2662&q=80", // GPS / Map Location (KEEP)
  "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=2000", // Success (Verified / Checklist)
];

export default function HowItWorks() {
  const { t } = useLanguage();

  return (
    <section id="how-it-works" className="py-32 bg-slate-900 relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-20">
           <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-3 py-1 rounded-full bg-blue-900/30 border border-blue-500/30 text-blue-400 text-xs font-bold tracking-widest uppercase mb-4"
          >
            {t.howItWorks.badge}
          </motion.span>
          <motion.h2
             initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
             transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold text-white mt-2 mb-6 tracking-tight"
          >
            {t.howItWorks.title}
          </motion.h2>
          <motion.p
             initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
             transition={{ delay: 0.2 }}
            className="text-slate-400 text-lg leading-relaxed"
          >
            {t.howItWorks.description}
          </motion.p>
        </div>

        <div className="flex flex-col gap-24">
          {t.howItWorks.steps.map((step, index) => (
            <div 
              key={index} 
              className={cn(
                "flex flex-col lg:flex-row items-center gap-12 lg:gap-20",
                index % 2 === 1 ? "lg:flex-row-reverse" : ""
              )}
            >
              {/* Text Side */}
              <motion.div 
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="flex-1 space-y-6"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-blue-600/30">
                    {index + 1}
                  </div>
                  <div className="h-px flex-1 bg-slate-800" />
                </div>
                <h3 className="text-3xl font-bold text-white leading-tight">
                  {step.title}
                </h3>
                <p className="text-lg text-slate-400 leading-relaxed font-medium">
                  {step.desc}
                </p>
              </motion.div>

              {/* Image Side */}
              <motion.div 
                initial={{ opacity: 0, x: index % 2 === 0 ? 50 : -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="flex-1 relative group"
              >
                 <div className="absolute inset-0 bg-blue-600 rounded-2xl transform translate-x-3 translate-y-3 group-hover:translate-x-2 group-hover:translate-y-2 transition-transform duration-300" />
                 <div className="relative rounded-2xl overflow-hidden aspect-video shadow-2xl">
                    <img 
                      src={images[index]} 
                      alt={step.title} 
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-transparent transition-colors duration-300" />
                 </div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
