'use client';

import { useEffect, useRef, useState } from 'react';
import { 
  getCameraStream, 
  stopCameraStream, 
  performRealTimeTraining,
  TRAINING_STEPS,
  FaceTrainingStep 
} from '@/lib/utils/faceTraining';

interface FaceTrainingCameraProps {
  onComplete: (faceEncoding: string, matchScore: number) => void;
  onClose: () => void;
}

export default function FaceTrainingCamera({ onComplete, onClose }: FaceTrainingCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<FaceTrainingStep[]>([...TRAINING_STEPS]);
  const [capturedEncodings, setCapturedEncodings] = useState<string[]>([]);
  const [capturedScores, setCapturedScores] = useState<number[]>([]); // Store all step scores
  const [isTraining, setIsTraining] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentScore, setCurrentScore] = useState(0);
  
  // ⚡ Use ref to prevent duplicate calls from stale closure
  const encodingsRef = useRef<string[]>([]);
  const scoresRef = useRef<number[]>([]);
  const completedRef = useRef(false); // Flag to prevent duplicate completion

  useEffect(() => {
    // Wait for video element to be available
    const checkVideoElement = () => {
      console.log('🔍 Checking video element availability...');
      console.log('📺 videoRef.current exists:', !!videoRef.current);
      
      if (videoRef.current) {
        console.log('✅ Video element found, starting camera...');
        startCamera();
      } else {
        console.log('⏳ Video element not ready, retrying in 200ms...');
        setTimeout(checkVideoElement, 200);
      }
    };

    // Start checking after a small delay
    const timer = setTimeout(checkVideoElement, 50);

    return () => {
      clearTimeout(timer);
      if (stream) {
        console.log('🛑 Stopping camera stream on unmount');
        stopCameraStream(stream);
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      console.log('🎥 Starting face training camera...');
      console.log('📺 Video element check - exists:', !!videoRef.current);
      console.log('📺 Video element details:', {
        current: videoRef.current,
        nodeName: videoRef.current?.nodeName,
        readyState: videoRef.current?.readyState
      });
      
      setIsLoading(true);
      setError(null);

      // Double check video element
      if (!videoRef.current) {
        console.error('❌ Video element STILL not found after waiting!');
        setError('Video element tidak tersedia setelah menunggu');
        setIsLoading(false);
        return;
      }

      console.log('📷 Requesting camera stream...');
      const cameraStream = await getCameraStream();
      console.log('📷 Camera stream result:', !!cameraStream);
      
      if (!cameraStream) {
        throw new Error('Gagal mengakses kamera. Pastikan izin kamera sudah diberikan.');
      }

      console.log('📺 Setting video source...');
      videoRef.current.srcObject = cameraStream;
      setStream(cameraStream);
      
      // Try to play the video immediately
      try {
        await videoRef.current.play();
        console.log('▶️ Video playing immediately, camera ready!');
        setIsLoading(false);
        
        // ⚡ AUTO-START TRAINING IMMEDIATELY!
        setTimeout(() => {
          console.log('⚡ Auto-starting training for step 1...');
          startTrainingForStep(0); // Start from step 0!
        }, 500); // Small delay to ensure video is fully ready
      } catch (playError) {
        console.log('⚠️ Immediate play failed, waiting for metadata...', playError);
        // Fallback: wait for metadata
        videoRef.current.onloadedmetadata = async () => {
          console.log('✅ Video metadata loaded via JS event');
          try {
            await videoRef.current?.play();
            console.log('▶️ Video playing after metadata, camera ready!');
            setIsLoading(false);
            
            // ⚡ AUTO-START TRAINING AFTER METADATA LOADED
            setTimeout(() => {
              console.log('⚡ Auto-starting training for step 1...');
              startTrainingForStep(0); // Start from step 0!
            }, 500);
          } catch (playError2) {
            console.error('❌ Video play error after metadata:', playError2);
            setIsLoading(false);
          }
        };
        
        // Final timeout fallback
        setTimeout(() => {
          console.log('⏰ Video loading timeout, forcing ready state');
          setIsLoading(false);
          // Still try to auto-start
          setTimeout(() => {
            console.log('⚡ Auto-starting training (timeout fallback)...');
            startTrainingForStep(0); // Start from step 0!
          }, 500);
        }, 3000);
      }
    } catch (err: any) {
      console.error('❌ Camera error:', err);
      setError(err.message || 'Gagal menginisialisasi kamera');
      setIsLoading(false);
    }
  };

  // ⚡ NEW: Start training for a SPECIFIC step index
  const startTrainingForStep = async (stepIndex: number) => {
    if (!videoRef.current || isTraining || stepIndex >= steps.length) return;

    setIsTraining(true);
    setCurrentProgress(0);
    setCurrentScore(0);
    setError(null);

    const currentStepData = steps[stepIndex];
    console.log(`🎯 Starting training step ${stepIndex + 1}: ${currentStepData.instruction}`);

    try {
      await performRealTimeTraining(
        videoRef.current,
        currentStepData.instruction,
        // onProgress callback
        (confidence: number) => {
          setCurrentProgress(confidence);
          setCurrentScore(confidence);
        },
        // onComplete callback
        (encoding: string, finalScore: number) => {
          console.log(`✅ Step ${stepIndex + 1} completed with score: ${finalScore}%`);
          
          // Update captured encodings and scores (both state and ref!)
          setCapturedEncodings(prev => [...prev, encoding]);
          setCapturedScores(prev => [...prev, finalScore]);
          encodingsRef.current = [...encodingsRef.current, encoding];
          scoresRef.current = [...scoresRef.current, finalScore];

          // Mark current step as completed
          setSteps(prev => {
            const updated = [...prev];
            updated[stepIndex].completed = true;
            updated[stepIndex].imageData = `Score: ${finalScore}%`;
            return updated;
          });

          setIsTraining(false);
          setCurrentProgress(100);
          setCurrentScore(finalScore);

          // ⚡ INSTANT next step or complete training
          setTimeout(() => {
            const nextStepIndex = stepIndex + 1;
            if (nextStepIndex < steps.length) {
              // Move to next step
              console.log(`✅ Step ${stepIndex + 1} complete! Moving to step ${nextStepIndex + 1}...`);
              setCurrentStep(nextStepIndex);
              setCurrentProgress(0);
              setCurrentScore(0);
              
              // ⚡ AUTO-START next step IMMEDIATELY!
              setTimeout(() => {
                console.log(`⚡ Auto-starting step ${nextStepIndex + 1}...`);
                startTrainingForStep(nextStepIndex); // Recursive call!
              }, 300);
            } else {
              // All steps completed!
              // ⚡ PREVENT DUPLICATE CALLS with flag!
              if (completedRef.current) {
                console.warn('⚠️ completeTraining already called, skipping duplicate!');
                return;
              }
              
              completedRef.current = true; // Set flag FIRST!
              
              // ⚡ Use ref values (always up-to-date!)
              const allEncodings = encodingsRef.current;
              const allScores = scoresRef.current;
              
              console.log(`🎉 All training steps completed!`);
              console.log(`📊 Training steps count: ${allEncodings.length}`);
              console.log(`📊 Individual step scores:`, allScores);
              
              // ⚡ Call completeTraining ONCE!
              completeTraining(allEncodings, allScores);
            }
          }, 800); // Show success briefly before next step
        },
        // onError callback
        (errorMessage: string) => {
          // ⚠️ Use console.warn instead of console.error (less scary!)
          console.warn(`⚠️ Step ${stepIndex + 1} failed:`, errorMessage);
          
          // 🛑 STOP KAMERA DULU sebelum show error!
          console.log('🛑 [ERROR] Stopping camera before showing error...');
          
          // Get stream from video element
          const activeStream = videoRef.current?.srcObject as MediaStream | null;
          
          // Stop all tracks
          if (activeStream) {
            activeStream.getTracks().forEach(track => {
              console.log(`🛑 Stopping track: ${track.kind}`);
              track.stop();
            });
          }
          
          // Pause & clear video element
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.srcObject = null;
          }
          
          // Clear state
          setStream(null);
          setIsTraining(false);
          setCurrentProgress(0);
          
          // Show error modal AFTER camera stopped
          setTimeout(() => {
            console.log('✅ Camera stopped, showing error modal...');
            setError(errorMessage);
          }, 100);
        }
      );
    } catch (error: any) {
      console.warn('⚠️ Training error:', error);
      
      // 🛑 STOP KAMERA DULU sebelum show error!
      console.log('🛑 [CATCH ERROR] Stopping camera...');
      
      const activeStream = videoRef.current?.srcObject as MediaStream | null;
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      setStream(null);
      setIsTraining(false);
      
      // Show error AFTER camera stopped
      setTimeout(() => {
        setError(error.message || 'Gagal memulai training');
      }, 100);
    }
  };

  // Wrapper function for compatibility with retry button
  const startCurrentStep = () => {
    startTrainingForStep(currentStep);
  };

  const completeTraining = (encodings: string[], scores: number[]) => {
    try {
      // Import averaging function
      const { averageDescriptors, deserializeDescriptor, serializeDescriptor } = require('@/lib/utils/faceModels');
      
      // Deserialize all encodings
      const descriptors = encodings.map(enc => deserializeDescriptor(enc));
      
      // Average all descriptors into one robust descriptor
      const averagedDescriptor = averageDescriptors(descriptors);
      
      // Serialize averaged descriptor
      const finalEncoding = serializeDescriptor(averagedDescriptor);
      
      // Calculate average match score
      const averageScore = scores.reduce((acc, score) => acc + score, 0) / scores.length;
      const roundedScore = Math.round(averageScore * 100) / 100; // Round to 2 decimals
      
      console.log('🎉 All training steps completed!');
      console.log('📊 Training steps count:', encodings.length);
      console.log('📊 Individual step scores:', scores);
      console.log(`📊 Step details: ${scores.map((s, i) => `Step ${i+1}=${s}%`).join(', ')}`);
      console.log(`📊 Sum: ${scores.reduce((a, b) => a + b, 0)} / Count: ${scores.length}`);
      console.log('📊 Average match score:', roundedScore + '%');
      console.log('📊 Averaged descriptor created (128D)');
      
      // ⚡ STOP CAMERA COMPLETELY (like verification!)
      console.log('🛑 [COMPLETE] Stopping camera...');
      
      // Get stream directly from video element (most reliable!)
      const activeStream = videoRef.current?.srcObject as MediaStream | null;
      
      // Step 1: Stop all tracks FIRST
      if (activeStream) {
        const tracks = activeStream.getTracks();
        tracks.forEach(track => {
          console.log(`🛑 Stopping track: ${track.kind}`);
          track.stop();
        });
      }
      
      // Step 2: Remove srcObject from video element
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      
      // Step 3: Clear state
      setStream(null);
      
      // ⚡ Small delay to ensure camera is fully stopped before closing modal
      setTimeout(() => {
        console.log('✅ Camera stopped, calling onComplete...');
        onComplete(finalEncoding, roundedScore);
      }, 100);
    } catch (error) {
      console.error('❌ Error processing training data:', error);
      setError('Gagal memproses data wajah');
    }
  };

  const resetTraining = () => {
    setCurrentStep(0);
    setSteps(TRAINING_STEPS.map(step => ({ ...step, completed: false, imageData: undefined })));
    setCapturedEncodings([]);
    setCapturedScores([]);
    setIsTraining(false);
    setCurrentProgress(0);
    setCurrentScore(0);
  };

  // Always render the main modal, but show loading overlay when needed

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Pelatihan Wajah</h2>
          <button
            onClick={() => {
              console.log('🔴 Closing camera modal, stopping stream');
              if (stream) {
                stopCameraStream(stream);
              }
              onClose();
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Modal */}
        {error && (
          <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-2 border-red-200">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    ⚠️ Training Error
                  </h3>
                  <div className="text-sm text-gray-700 whitespace-pre-line mb-4">
                    {error}
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                    <p className="text-sm font-semibold text-red-800 mb-2">💡 Tips:</p>
                    <ul className="text-sm text-red-700 space-y-1">
                      <li>• Pastikan wajah terlihat jelas di kamera</li>
                      <li>• Gunakan pencahayaan yang cukup</li>
                      <li>• Ikuti instruksi langkah demi langkah</li>
                      <li>• Jaga jarak yang tepat dengan kamera</li>
                    </ul>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={async () => {
                        setError(null);
                        setCurrentProgress(0);
                        
                        // ⚡ RE-START CAMERA dulu sebelum retry!
                        console.log('🔄 Retrying... Re-starting camera...');
                        setIsLoading(true);
                        
                        try {
                          const cameraStream = await getCameraStream();
                          if (cameraStream && videoRef.current) {
                            videoRef.current.srcObject = cameraStream;
                            setStream(cameraStream);
                            
                            await videoRef.current.play();
                            setIsLoading(false);
                            
                            // Start training dari CURRENT step (not reset)
                            setTimeout(() => {
                              console.log('⚡ Camera ready, retrying training...');
                              startCurrentStep();
                            }, 500);
                          } else {
                            throw new Error('Gagal mengakses kamera');
                          }
                        } catch (err: any) {
                          console.error('❌ Retry camera error:', err);
                          setError(err.message || 'Gagal menginisialisasi kamera untuk retry');
                          setIsLoading(false);
                        }
                      }}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-2.5 px-4 rounded-xl shadow-lg transition-all"
                    >
                      Coba Lagi Step Ini
                    </button>
                    <button
                      onClick={() => {
                        setError(null);
                        onClose();
                      }}
                      className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-4 rounded-xl border-2 border-gray-200 transition-all"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Langkah {currentStep + 1} dari {steps.length}</span>
            <span>{steps.filter(s => s.completed).length} selesai</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Current Instruction */}
        <div className="text-center mb-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            {steps[currentStep]?.instruction}
          </h3>
          <p className="text-gray-600">
            {isTraining ? '⚡ Menganalisis wajah Anda...' : '✅ Siap untuk training otomatis'}
          </p>
          {isTraining && (
            <div className="mt-3">
              <p className="text-lg font-bold text-blue-600">
                Skor Real-time: {currentScore}%
              </p>
              <p className="text-sm text-gray-500">
                Target: 85% untuk melanjutkan
              </p>
            </div>
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
              maxHeight: '400px',
              transform: 'scaleX(-1)' // ⚡ FLIP untuk mengembalikan ke tampilan normal (non-mirror) seperti foto biasa!
            }}
            onLoadedMetadata={() => {
              console.log('📺 Video metadata loaded in JSX');
              setIsLoading(false);
            }}
          />
          
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-white text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                <p>Memuat kamera...</p>
                <p className="text-sm mt-2 opacity-75">Pastikan izin kamera sudah diberikan</p>
              </div>
            </div>
          )}
          
          {/* Real-time Progress Circle */}
          {isTraining && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                {/* Progress Circle */}
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
                  {/* Background Circle */}
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  {/* Progress Circle */}
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    stroke={currentProgress >= 85 ? "#10B981" : currentProgress >= 70 ? "#F59E0B" : "#EF4444"}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - currentProgress / 100)}`}
                    className="transition-all duration-300"
                  />
                </svg>
                {/* Center Text */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-2xl font-bold">{Math.round(currentProgress)}%</div>
                    <div className="text-xs">
                      {currentProgress >= 85 ? "BERHASIL!" : currentProgress >= 70 ? "HAMPIR!" : "DETEKSI..."}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Face guide */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-white rounded-lg" />
          </div>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`p-2 rounded-lg text-center text-sm ${
                index === currentStep
                  ? 'bg-blue-100 border-2 border-blue-500 text-blue-700'
                  : step.completed
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <div className="flex items-center justify-center mb-1">
                {step.completed ? (
                  <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : index === currentStep ? (
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                ) : (
                  <div className="w-2 h-2 bg-gray-300 rounded-full" />
                )}
              </div>
              <div className="text-xs">{step.instruction}</div>
              {step.completed && step.imageData && (
                <div className="text-xs text-green-600 font-semibold mt-1">
                  {step.imageData}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Controls - Simplified (NO MORE MANUAL BUTTONS!) */}
        <div className="flex gap-4">
          {isTraining ? (
            <div className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-6 rounded-lg text-center font-semibold shadow-lg">
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>⚡ Step {currentStep + 1} - Analyzing... {Math.round(currentProgress)}%</span>
              </div>
            </div>
          ) : (
            <div className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-3 px-6 rounded-lg text-center font-semibold shadow-lg">
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>✅ Step {currentStep + 1} Ready - Auto-starting...</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
