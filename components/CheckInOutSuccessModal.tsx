'use client';

import { useEffect, useState } from 'react';

interface CheckInOutSuccessModalProps {
  isOpen: boolean;
  isCheckOut: boolean;
  verificationScore: number;
  threshold: number;
  location: {
    office: string;
    distance: string;
    maxRadius: number;
  };
  time: {
    timeStr: string;
    dateStr: string;
  };
  details?: {
    status: string;
    statusDetail: string;
    lateDuration: number;
  };
  onClose: () => void;
}

export default function CheckInOutSuccessModal({
  isOpen,
  isCheckOut,
  verificationScore,
  threshold,
  location,
  time,
  details,
  onClose
}: CheckInOutSuccessModalProps) {
  const [show, setShow] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Delay untuk smooth animation
      setTimeout(() => setShow(true), 100);
      // Trigger icon animation after modal appears
      setTimeout(() => setShowCheckmark(true), 400);
    } else {
      setShow(false);
      setShowCheckmark(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    setShow(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 transition-all duration-300 ${
        show ? 'bg-black/70 backdrop-blur-sm' : 'bg-black/0'
      }`}
      onClick={handleClose}
    >
      <div 
        className={`relative bg-white rounded-3xl shadow-2xl max-w-xs sm:max-w-md w-full overflow-hidden transition-all duration-500 transform ${
          show ? 'scale-100 opacity-100 translate-y-0' : 'scale-95 opacity-0 translate-y-4'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated Checkmark Icon */}
        <div className="relative pt-6 pb-4 px-6">
          <div className="flex justify-center mb-4">
            <div className={`relative transition-all duration-700 transform ${
              showCheckmark ? 'scale-100 rotate-0 opacity-100' : 'scale-0 rotate-180 opacity-0'
            }`}>
              {/* Animated Circle with Checkmark */}
              <div className="relative">
                {/* Outer Ring Animation */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 animate-ping opacity-75"></div>
                
                {/* Main Circle */}
                <div className="relative bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 rounded-full p-3 sm:p-3.5 shadow-xl">
                  {/* Animated Checkmark SVG */}
                  <svg 
                    className="w-10 h-10 sm:w-12 sm:h-12 text-white" 
                    viewBox="0 0 52 52"
                  >
                    <circle 
                      className="checkmark-circle"
                      cx="26" cy="26" r="25" 
                      fill="none" 
                      stroke="white" 
                      strokeWidth="3"
                      style={{
                        strokeDasharray: '166',
                        strokeDashoffset: showCheckmark ? '0' : '166',
                        transition: 'stroke-dashoffset 0.6s ease-in-out 0.3s'
                      }}
                    />
                    <path 
                      className="checkmark-check"
                      fill="none" 
                      stroke="white" 
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.1 27.2l7.1 7.2 16.7-16.8"
                      style={{
                        strokeDasharray: '48',
                        strokeDashoffset: showCheckmark ? '0' : '48',
                        transition: 'stroke-dashoffset 0.4s ease-in-out 0.6s'
                      }}
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Success Title */}
          <div className="text-center mb-1">
            <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 bg-clip-text text-transparent mb-1">
              {isCheckOut ? 'Check-out Berhasil!' : 'Check-in Berhasil!'}
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm font-medium">
              Absensi telah tercatat
            </p>
          </div>
        </div>

        {/* Info Cards - Compact Design */}
        <div className="px-6 pb-4">
          <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-2xl p-4 border-2 border-blue-100 shadow-inner space-y-3">
            {/* Skor Verifikasi Card */}
            <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-xs font-semibold text-slate-600">Skor Verifikasi</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {verificationScore}%
              </p>
            </div>

            {/* Threshold Card */}
            <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span className="text-xs font-semibold text-slate-600">Threshold</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {threshold}%
              </p>
            </div>

            {/* Lokasi Card */}
            <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs font-semibold text-slate-600">Lokasi</span>
              </div>
              <p className="text-sm font-bold text-slate-800 mb-0.5">
                {location.office}
              </p>
              <p className="text-xs text-slate-600">
                📍 {location.distance}m / Max: {location.maxRadius}m
              </p>
            </div>

            {/* Waktu Card */}
            <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-semibold text-slate-600">Waktu</span>
              </div>
              <p className="text-sm font-bold text-slate-800">
                {time.timeStr}
              </p>
              <p className="text-xs text-slate-600">
                {time.dateStr}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="px-6 pb-4">
          <button
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold rounded-xl p-3 shadow-sm hover:shadow-md active:scale-98 transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <span>Tutup</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

