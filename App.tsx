
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { ChristmasTree } from './components/Tree';
import { PhotoGallery } from './components/PhotoGallery';
import { Snow } from './components/Snow';
import { CursorOverlay } from './components/CursorOverlay';
import { VisionService } from './services/visionService';
import { TreeMode, GestureType } from './types';
import { PHOTOS_DATA } from './constants';

// Increased smoothing for "Air Mouse" feel
const CURSOR_SMOOTHING = 0.90;

const lerp = (start: number, end: number, t: number) => {
  return start * (1 - t) + end * t;
};

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<TreeMode>(TreeMode.NORMAL);
  const [isVisionReady, setIsVisionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [photoDescription, setPhotoDescription] = useState<string | null>(null);
  
  const [cursorPosition, setCursorPosition] = useState<{x: number, y: number} | null>(null);
  const [cursorHistory, setCursorHistory] = useState<{x: number, y: number}[]>([]);
  const [currentGesture, setCurrentGesture] = useState<GestureType>(GestureType.NONE);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null); 
  const visionService = useRef(new VisionService());
  const requestRef = useRef<number | null>(null);
  
  const targetCursorRef = useRef<{x: number, y: number} | null>(null);
  const currentCursorRef = useRef<{x: number, y: number} | null>(null);

  useEffect(() => {
    visionService.current.initialize()
      .then(() => console.log("Vision Service Initialized"))
      .catch(err => console.error("Vision Init Error:", err));
    
    return () => {
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const startDetectionLoop = () => {
    const loop = () => {
      if (videoRef.current && videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
        try {
          const result = visionService.current.detect(videoRef.current);
          
          setCurrentGesture(result.gesture);

          if (result.gesture === GestureType.OPEN_PALM) {
            setMode(TreeMode.EXPLODED);
          } else if (result.gesture === GestureType.FIST) {
            setMode(TreeMode.NORMAL);
            setSelectedPhotoId(null);
          }

          // Show cursor for POINT, PINCH, or even generalized hand tracking (fallback POINT)
          const showCursor = result.tip && (result.gesture === GestureType.POINT || result.gesture === GestureType.PINCH || result.gesture === GestureType.OPEN_PALM);
          
          if (showCursor && result.tip) {
            const rawTarget = { x: 1 - result.tip.x, y: result.tip.y };
            targetCursorRef.current = rawTarget;
            
            if (!currentCursorRef.current) {
              currentCursorRef.current = rawTarget;
            }

            const cur = currentCursorRef.current;
            const target = targetCursorRef.current;
            
            // LERP for smooth movement
            const smoothX = lerp(cur.x, target.x, CURSOR_SMOOTHING);
            const smoothY = lerp(cur.y, target.y, CURSOR_SMOOTHING);
            
            currentCursorRef.current = { x: smoothX, y: smoothY };
            
            setCursorPosition({ x: smoothX, y: smoothY });
            
            setCursorHistory(prev => {
              if (!prev) return [{ x: smoothX, y: smoothY }]; 
              const newHist = [...prev, { x: smoothX, y: smoothY }];
              if (newHist.length > 25) newHist.shift(); 
              return newHist;
            });
          } else {
            // Only clear cursor if hand is totally gone or in a macro gesture mode that shouldn't have a cursor (like Fist)
            if (result.gesture === GestureType.FIST || result.gesture === GestureType.NONE) {
               targetCursorRef.current = null;
               currentCursorRef.current = null;
               setCursorPosition(null);
               setCursorHistory([]);
            }
          }
        } catch (e) {
          console.error("Detection Loop Error:", e);
        }
      }
      requestRef.current = requestAnimationFrame(loop);
    };
    loop();
  };

  const handleStart = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser.");
      }

      console.log("Requesting Camera Access...");
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 }, 
          facingMode: 'user' 
        } 
      });

      streamRef.current = stream;
      setHasStarted(true); 
    } catch (err: any) {
      console.error("Camera Setup Failed:", err);
      setIsLoading(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Camera permission denied. Please allow camera access in your browser settings (usually near the URL bar).");
      } else {
        setError(`Failed to access camera: ${err.message}. Please check if another app is using it.`);
      }
    }
  };

  useEffect(() => {
    if (hasStarted && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.onloadeddata = () => {
        console.log("Video playing...");
        if (videoRef.current) {
          videoRef.current.play().catch(e => console.error("Play error:", e));
          setIsVisionReady(true);
          startDetectionLoop();
        }
      };
    }
  }, [hasStarted]);

  const handlePhotoSelect = useCallback((id: string | null) => {
    if (id === selectedPhotoId) return;
    
    setSelectedPhotoId(id);
    setPhotoDescription(null); 

    if (id) {
        // Find static description instead of calling AI
        const photo = PHOTOS_DATA.find(p => p.id === id);
        if (photo) {
            setPhotoDescription(photo.description);
        }
    }
  }, [selectedPhotoId]);

  const isPinching = currentGesture === GestureType.PINCH;

  if (!hasStarted) {
    return (
      <div className="relative w-full h-screen bg-black flex flex-col items-center justify-center text-white overflow-hidden">
         <div className="absolute inset-0 z-0">
           <Canvas camera={{ position: [0, 0, 5] }}>
              <Stars radius={100} depth={50} count={2000} factor={4} fade />
              <Snow count={1000} />
           </Canvas>
         </div>
         
         <div className="z-10 text-center p-8 bg-black/50 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-700">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-br from-yellow-300 via-red-500 to-green-600 font-serif">
              Christmas Magic
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-md mx-auto">
              Experience an interactive 3D Christmas Tree controlled by your hand gestures.
            </p>

            {error && (
               <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-xl text-red-200 text-sm max-w-sm mx-auto">
                 <i className="fas fa-exclamation-circle mr-2"></i> 
                 <span>{error}</span>
               </div>
            )}
            
            <button 
              onClick={handleStart}
              disabled={isLoading}
              className="group relative px-8 py-4 bg-white text-black text-xl font-bold rounded-full overflow-hidden transition-transform transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
               <span className="relative z-10 flex items-center gap-2">
                 {isLoading ? (
                   <><span>Loading...</span><i className="fas fa-circle-notch fa-spin"></i></>
                 ) : (
                   <><span>Enter Experience</span><i className="fas fa-sparkles text-yellow-600"></i></>
                 )}
               </span>
               <div className="absolute inset-0 bg-gradient-to-r from-yellow-200 to-yellow-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
            
            <p className="mt-6 text-sm text-gray-500">
              <i className="fas fa-camera mr-2"></i> Camera access required
            </p>
         </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden cursor-none">
      
      <div className="absolute inset-0 z-0">
        <Canvas 
          shadows
          camera={{ position: [0, 0, 8], fov: 60 }} 
          gl={{ 
            antialias: true,
            powerPreference: "high-performance",
            alpha: false, 
            stencil: false,
            depth: true 
          }}
        >
          <ambientLight intensity={0.5} color="#ffdcb3" />
          <spotLight 
            position={[5, 10, 5]} 
            angle={0.5} 
            penumbra={1} 
            intensity={2} 
            color="#ffaa55" 
            castShadow 
          />
          <pointLight position={[-5, 5, -2]} intensity={1} color="#ffccaa" />

          <Snow count={5000} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          
          <ChristmasTree mode={mode} />

          <PhotoGallery 
             mode={mode}
             cursorPosition={cursorPosition}
             isClicking={isPinching}
             selectedPhotoId={selectedPhotoId}
             onPhotoSelect={handlePhotoSelect}
          />

          <OrbitControls 
             enableZoom={true} 
             maxDistance={20} 
             minDistance={2} 
             enablePan={false} 
             autoRotate={!selectedPhotoId} // Disable rotation when previewing to keep photo stable
             autoRotateSpeed={0.5} 
          />
        </Canvas>
      </div>

      <CursorOverlay history={cursorHistory} isClicking={isPinching} />

      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
        
        <div className="flex justify-between items-start pointer-events-auto">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-red-500 drop-shadow-lg" style={{ fontFamily: 'serif' }}>
              Christmas Magic
            </h1>
            <p className="text-gray-300 text-sm mt-1 max-w-md bg-black/30 p-2 rounded backdrop-blur-sm">
              <span className="font-bold text-green-400">👋 Open Hand</span> to Explode | <span className="font-bold text-red-400">✊ Fist</span> to Reset
              <br/>
              <span className="font-bold text-yellow-400">👆 Any Finger</span> to Move Wand | <span className="font-bold text-orange-400">👌 Pinch</span> to Select
            </p>
          </div>
          
          <div className="w-32 h-24 rounded-lg overflow-hidden border-2 border-white/20 relative bg-black shadow-lg">
            {!error && (
              <video 
                ref={videoRef} 
                className="w-full h-full object-cover transform scale-x-[-1]" 
                muted 
                playsInline 
              />
            )}
            <div className="absolute bottom-1 right-1 flex gap-1 items-center">
               <span className="text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full font-mono border border-white/10">{currentGesture}</span>
               <div className={`w-2 h-2 rounded-full ${isVisionReady ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'}`} />
            </div>
          </div>
        </div>
        
        {/* Caption Overlay */}
        {selectedPhotoId && photoDescription && (
            <div className="self-center mb-10 bg-black/60 backdrop-blur-md p-4 rounded-xl border-t border-b border-gold-500/50 max-w-lg text-center animate-in fade-in slide-in-from-bottom-8 duration-500">
                 <p className="text-white text-lg italic font-serif leading-relaxed opacity-90 text-shadow">
                    "{photoDescription}"
                 </p>
                 <div className="mt-2 text-xs text-white/40 uppercase tracking-widest">
                    Make a Fist ✊ or Open Hand 👋 to Close
                 </div>
            </div>
        )}

      </div>
    </div>
  );
}
