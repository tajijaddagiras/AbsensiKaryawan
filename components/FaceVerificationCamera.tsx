'use client';

import { useEffect, useRef, useState } from 'react';
import { 
  getCameraStream, 
  stopCameraStream, 
  performInstantVerification
} from '@/lib/utils/faceTraining';

interface FaceVerificationCameraProps {
  storedFaceEncoding: string;
  trainingScore?: number; // Training score from employee data
  onVerificationComplete: (result: { 
    success: boolean; 
    score: number; 
    trainingScore?: number;
    threshold?: number;
    image?: string; 
    error?: string 
  }) => void;
  onClose: () => void;
}

export default function FaceVerificationCamera({ 
  storedFaceEncoding,
  trainingScore,
  onVerificationComplete, 
  onClose 
}: FaceVerificationCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [threshold, setThreshold] = useState<number>(80); // Default threshold

  // Fetch system settings (threshold) fresh every time component mounts (when modal opens)
  // This ensures threshold is always up-to-date when admin changes settings
  useEffect(() => {
    const fetchSystemSettings = async () => {
      try {
        const response = await fetch('/api/system-settings', {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        const data = await response.json();
        
        if (data.success) {
          const faceThreshold = parseInt(data.data.face_recognition_threshold?.value || '80');
          setThreshold(faceThreshold);
          console.log('🔧 [VERIFICATION] Loaded threshold from DB (fresh):', faceThreshold);
        }
      } catch (error) {
        console.error('Error fetching system settings:', error);
        // Keep default threshold of 80
      }
    };

    // Fetch threshold immediately when component mounts (modal opens)
    fetchSystemSettings();
  }, []); // Empty dependency - fetch every time component mounts

  // Effect 1: Initialize camera on mount (run ONCE only!)
  useEffect(() => {
    // Wait for video element to be available
    const checkVideoElement = () => {
      console.log('🔍 [VERIFICATION] Checking video element availability...');
      console.log('📺 [VERIFICATION] videoRef.current exists:', !!videoRef.current);
      
      if (videoRef.current) {
        console.log('✅ [VERIFICATION] Video element found, starting camera...');
        startCamera();
      } else {
        console.log('⏳ [VERIFICATION] Video element not ready, retrying in 200ms...');
        setTimeout(checkVideoElement, 200);
      }
    };

    // Start checking after a small delay
    const timer = setTimeout(checkVideoElement, 50);

    return () => {
      clearTimeout(timer);
    };
  }, []); // ← Empty dependency - run once on mount!

  // Effect 2: Cleanup stream on unmount ONLY
  useEffect(() => {
    return () => {
      console.log('🛑 [UNMOUNT CLEANUP] Component unmounting, stopping camera...');
      
      // Get current stream from video element srcObject (not from state!)
      const currentStream = videoRef.current?.srcObject as MediaStream | null;
      
      // Step 1: Remove srcObject from video element
      if (videoRef.current && currentStream) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      
      // Step 2: Stop all tracks
      if (currentStream) {
        currentStream.getTracks().forEach(track => {
          console.log(`🛑 Stopping track on unmount: ${track.kind}`);
          track.stop();
        });
      }
      console.log('✅ Unmount cleanup complete!');
    };
  }, []); // ← Empty array = cleanup ONLY on unmount!

  const startCamera = async () => {
    try {
      console.log('🎥 [VERIFICATION] Starting face verification camera...');
      console.log('📺 [VERIFICATION] Video element check - exists:', !!videoRef.current);
      console.log('📺 [VERIFICATION] Video element details:', {
        current: videoRef.current,
        nodeName: videoRef.current?.nodeName,
        readyState: videoRef.current?.readyState
      });
      
      setIsLoading(true);
      setError(null);

      // Double check video element (same as FaceTrainingCamera)
      if (!videoRef.current) {
        console.error('❌ [VERIFICATION] Video element STILL not found after waiting!');
        setError('Video element tidak tersedia setelah menunggu');
        setIsLoading(false);
        return;
      }

      console.log('📷 [VERIFICATION] Requesting camera stream...');
      const cameraStream = await getCameraStream();
      console.log('📷 [VERIFICATION] Camera stream result:', !!cameraStream);
      
      if (!cameraStream) {
        throw new Error('Gagal mengakses kamera. Pastikan izin kamera sudah diberikan.');
      }

      console.log('📺 [VERIFICATION] Setting video source...');
      videoRef.current.srcObject = cameraStream;
      setStream(cameraStream);
      
      // Try to play the video immediately (same as FaceTrainingCamera)
      try {
        await videoRef.current.play();
        console.log('▶️ [VERIFICATION] Video playing immediately, camera ready!');
        setIsLoading(false);
        
        // 🔥 AUTO-START VERIFICATION (seperti Face ID!)
        setTimeout(() => {
          console.log('🚀 [AUTO-START] Starting verification automatically...');
          startRealTimeVerification();
        }, 500); // Small delay to ensure video is fully ready
        
      } catch (playError) {
        console.log('⚠️ [VERIFICATION] Immediate play failed, waiting for metadata...', playError);
        // Fallback: wait for metadata
        videoRef.current.onloadedmetadata = async () => {
          console.log('✅ [VERIFICATION] Video metadata loaded via JS event');
          try {
            await videoRef.current?.play();
            console.log('▶️ [VERIFICATION] Video playing after metadata, camera ready!');
            setIsLoading(false);
            
            // 🔥 AUTO-START VERIFICATION after metadata loaded
            setTimeout(() => {
              console.log('🚀 [AUTO-START] Starting verification automatically after metadata...');
              startRealTimeVerification();
            }, 500);
            
          } catch (playError2) {
            console.error('❌ [VERIFICATION] Video play error after metadata:', playError2);
            setIsLoading(false);
          }
        };
        
        // Final timeout fallback
        setTimeout(() => {
          console.log('⏰ [VERIFICATION] Video loading timeout, forcing ready state');
          setIsLoading(false);
          
          // 🔥 AUTO-START even after timeout
          setTimeout(() => {
            console.log('🚀 [AUTO-START] Starting verification after timeout fallback...');
            startRealTimeVerification();
          }, 500);
        }, 3000);
      }
    } catch (err: any) {
      console.error('❌ [VERIFICATION] Camera error:', err);
      setError(err.message || 'Gagal menginisialisasi kamera');
      setIsLoading(false);
    }
  };

  const startRealTimeVerification = async () => {
    if (!videoRef.current) {
      console.error('❌ Video element not found');
      setError('Video element tidak tersedia');
      return;
    }
    
    if (isVerifying) {
      console.warn('⚠️ Verification already in progress');
      return;
    }

    // 🔥 CRITICAL: Fetch threshold fresh RIGHT BEFORE verification starts
    // This ensures we always use the latest threshold even if admin changed it
    try {
      const response = await fetch('/api/system-settings', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const data = await response.json();
      
      if (data.success) {
        const freshThreshold = parseInt(data.data.face_recognition_threshold?.value || '80');
        setThreshold(freshThreshold);
        console.log('🔧 [VERIFICATION] Refreshed threshold before verification:', freshThreshold);
      }
    } catch (error) {
      console.warn('⚠️ Failed to refresh threshold, using cached value:', threshold);
      // Continue with cached threshold if refresh fails
    }

    console.log('⚡ [INSTANT VERIFICATION] Starting...');
    setIsVerifying(true);
    setCurrentConfidence(0);
    setStatusMessage('⚡ Menginisialisasi...');
    setError(null);

    try {
      await performInstantVerification(
        videoRef.current,
        storedFaceEncoding,
        // onProgress callback - Update status message
        (status: string, confidence: number) => {
          console.log(`📊 ${status} (confidence: ${confidence}%)`);
          setStatusMessage(status);
          setCurrentConfidence(Math.round(confidence));
        },
        // onComplete callback - ADAPTIVE result!
        (success: boolean, similarity: number, confidence: number) => {
          console.log(`⚡ ADAPTIVE RESULT: ${success ? 'SUCCESS' : 'FAILED'}`);
          console.log(`📊 Similarity: ${similarity}%, Confidence: ${confidence}%, Threshold: ${threshold}%`);
          
          setIsVerifying(false);
          
          // 🔴 FORCE STOP camera immediately!
          console.log('🔴 [FORCE STOP] Stopping camera stream...');
          
          // Get stream directly from video element (most reliable!)
          const activeStream = videoRef.current?.srcObject as MediaStream | null;
          console.log('🔍 Active stream from video element:', !!activeStream);
          console.log('🔍 Stream state:', stream ? 'exists' : 'null');
          
          // Step 1: Stop all tracks FIRST (before removing srcObject!)
          if (activeStream) {
            const tracks = activeStream.getTracks();
            console.log(`🔴 Found ${tracks.length} tracks to stop`);
            tracks.forEach(track => {
              console.log(`🔴 Stopping track: ${track.kind} (state: ${track.readyState})`);
              track.stop();
              console.log(`✅ Track stopped: ${track.kind} (new state: ${track.readyState})`);
            });
          } else {
            console.warn('⚠️ No active stream found in video element!');
          }
          
          // Step 2: Remove srcObject from video element
          if (videoRef.current) {
            console.log('🔴 Pausing and clearing video element...');
            videoRef.current.pause();
            videoRef.current.srcObject = null;
          }
          
          // Step 3: Clear state
          setStream(null);
          console.log('✅ Camera stream fully stopped!');
          
          // Small delay to ensure camera is fully stopped before closing modal
          setTimeout(() => {
            // Pass result to parent (this will close the modal)
            onVerificationComplete({
              success: similarity >= threshold,
              score: Math.round(similarity),
              trainingScore: trainingScore,
              threshold: threshold,
              error: similarity < threshold ? `Skor verifikasi (${Math.round(similarity)}%) di bawah threshold (${threshold}%)` : undefined
            });
          }, 100); // 100ms delay to ensure camera LED turns off
        },
        trainingScore, // ⚡ NEW: Pass training score for OPTION 3 adaptive verification!
        threshold // 🔥 CRITICAL: Pass fresh threshold from component (fetched right before verification)
      );
    } catch (error: any) {
      console.error('❌ Verification error:', error);
      setIsVerifying(false);
      
      // 🔴 FORCE STOP camera on error!
      console.log('🔴 [ERROR - FORCE STOP] Stopping camera stream...');
      
      // Get stream directly from video element
      const activeStream = videoRef.current?.srcObject as MediaStream | null;
      
      // Step 1: Stop all tracks
      if (activeStream) {
        activeStream.getTracks().forEach(track => {
          console.log(`🔴 Stopping track on error: ${track.kind}`);
          track.stop();
        });
      }
      
      // Step 2: Clear video element
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      
      // Step 3: Clear state
      setStream(null);
      console.log('✅ Camera stream stopped (after error)!');
      
      setTimeout(() => {
        onVerificationComplete({
          success: false,
          score: 0,
          trainingScore: trainingScore,
          threshold: threshold,
          error: `Error: ${error.message || 'Verification failed'}`
        });
      }, 100);
    }
  };

  // Always render the main modal, but show loading overlay when needed (same as FaceTrainingCamera)

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Verifikasi Wajah</h2>
          <button
            onClick={() => {
              console.log('🔴 [MANUAL CLOSE] User closed modal, stopping stream...');
              
              // Get stream directly from video element
              const activeStream = videoRef.current?.srcObject as MediaStream | null;
              
              // Step 1: Stop all tracks
              if (activeStream) {
                activeStream.getTracks().forEach(track => {
                  console.log(`🔴 Stopping track on manual close: ${track.kind}`);
                  track.stop();
                });
              }
              
              // Step 2: Clear video element
              if (videoRef.current) {
                videoRef.current.pause();
                videoRef.current.srcObject = null;
              }
              
              // Step 3: Clear state
              setStream(null);
              console.log('✅ Camera stream stopped (manual close)!');
              onClose();
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            {isVerifying ? '🔍 Memindai Wajah...' : '📸 Siap Memindai'}
          </h3>
          {isVerifying ? (
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border-2 border-blue-200">
                <div className="text-center mb-2">
                  <p className="text-lg font-bold text-blue-800">{statusMessage}</p>
                </div>
                {currentConfidence > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                      <span>Kualitas Deteksi:</span>
                      <span className="font-bold text-blue-600">{currentConfidence}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          currentConfidence >= 85 ? 'bg-green-500' : 
                          currentConfidence >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${currentConfidence}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 text-center">
                ⚡ Verifikasi instant • Hasil dalam 1-3 detik
              </p>
            </div>
          ) : (
            <p className="text-gray-600 text-sm">
              Arahkan wajah Anda ke dalam kotak. Pastikan pencahayaan cukup.
            </p>
          )}
        </div>

        {/* Camera */}
        <div className="relative bg-black rounded-lg overflow-hidden mb-6">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full"
            style={{ 
              maxHeight: '300px',
              transform: 'scaleX(-1)' // ⚡ FLIP untuk mengembalikan ke tampilan normal (non-mirror) seperti foto biasa!
            }}
            onLoadedMetadata={() => {
              console.log('📺 [VERIFICATION] Video metadata loaded in JSX');
              setIsLoading(false);
            }}
          />
          
          {/* Loading overlay (same as FaceTrainingCamera) */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p>Memuat kamera...</p>
                <p className="text-sm mt-2 opacity-75">Pastikan izin kamera sudah diberikan</p>
              </div>
            </div>
          )}
          
          {/* Scanning Indicator - Simple & Fast */}
          {isVerifying && currentConfidence >= 70 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative">
                {/* Pulsing Circle */}
                <div className="w-32 h-32 rounded-full bg-green-500/30 animate-ping absolute"></div>
                <div className="w-32 h-32 rounded-full bg-green-500/50 flex items-center justify-center relative">
                  <div className="text-center text-white drop-shadow-lg">
                    <div className="text-3xl font-bold">✓</div>
                    <div className="text-xs mt-1">Menganalisis...</div>
                  </div>
                </div>
              </div>
            </div>
          )}


          {/* Face guide */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-52 border-2 border-white rounded-lg" />
          </div>
        </div>

        {/* Status Info - No button needed (auto-start!) */}
        {isVerifying ? (
          <div className="bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl text-center shadow-lg">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span className="text-sm font-bold">⚡ Memindai...</span>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 text-green-800 py-3 px-4 rounded-xl text-center shadow">
            <div className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-sm font-bold">Verifikasi Instant • Seperti Face ID</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
