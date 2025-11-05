'use client';

/**
 * Skeleton Card Component untuk loading state
 * Digunakan untuk menampilkan placeholder saat data sedang dimuat
 * Menciptakan pengalaman yang lebih profesional dan konsisten
 */

interface SkeletonCardProps {
  variant?: 'employee' | 'attendance' | 'leave' | 'default';
  count?: number;
}

export default function SkeletonCard({ variant = 'default', count = 1 }: SkeletonCardProps) {
  const cards = Array.from({ length: count }, (_, i) => i);

  if (variant === 'employee') {
    return (
      <>
        {cards.map((i) => (
          <div key={i} className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-pulse">
            <div className="bg-gradient-to-br from-slate-200 to-slate-300 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-lg bg-slate-300 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-4 bg-slate-300 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-300 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="h-6 w-16 bg-slate-300 rounded-md flex-shrink-0"></div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="h-3 bg-slate-200 rounded w-full"></div>
              <div className="h-3 bg-slate-200 rounded w-5/6"></div>
              <div className="flex gap-2 mt-4">
                <div className="h-8 bg-slate-200 rounded-lg flex-1"></div>
                <div className="h-8 bg-slate-200 rounded-lg w-8"></div>
                <div className="h-8 bg-slate-200 rounded-lg w-8"></div>
              </div>
            </div>
          </div>
        ))}
      </>
    );
  }

  if (variant === 'attendance') {
    return (
      <>
        {cards.map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-slate-200 p-3 sm:p-4 animate-pulse">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg bg-slate-300 flex-shrink-0"></div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="h-4 bg-slate-300 rounded w-2/3"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                <div className="h-3 bg-slate-200 rounded w-1/3"></div>
              </div>
              <div className="h-6 w-20 bg-slate-300 rounded-md flex-shrink-0"></div>
            </div>
          </div>
        ))}
      </>
    );
  }

  if (variant === 'leave') {
    return (
      <>
        {cards.map((i) => (
          <div key={i} className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-pulse">
            <div className="bg-gradient-to-br from-slate-200 to-slate-300 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-lg bg-slate-300 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-4 bg-slate-300 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-300 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="h-6 w-20 bg-slate-300 rounded-md flex-shrink-0"></div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="h-3 bg-slate-200 rounded w-full"></div>
              <div className="h-3 bg-slate-200 rounded w-4/5"></div>
              <div className="flex gap-2 mt-4">
                <div className="h-3 bg-slate-200 rounded w-24"></div>
                <div className="h-3 bg-slate-200 rounded w-32"></div>
              </div>
            </div>
          </div>
        ))}
      </>
    );
  }

  // Default variant
  return (
    <>
      {cards.map((i) => (
        <div key={i} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 animate-pulse">
          <div className="space-y-3">
            <div className="h-4 bg-slate-300 rounded w-3/4"></div>
            <div className="h-3 bg-slate-200 rounded w-full"></div>
            <div className="h-3 bg-slate-200 rounded w-5/6"></div>
          </div>
        </div>
      ))}
    </>
  );
}

