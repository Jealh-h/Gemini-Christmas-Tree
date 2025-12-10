import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { ChristmasTree } from './components/Tree';
import { Snow } from './components/Snow';
import { VisionService } from './services/visionService';
import { GeminiService } from './services/geminiService';
import { TreeMode, GestureType } from './types';
import { PHOTOS_DATA } from './constants';

const CURSOR_SMOOTHING = 0.85;

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
  const geminiService = useRef(new GeminiService());
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

  const startDetectionLoop = useCallback(() => {
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

          const showCursor = result.tip && (result.gesture === GestureType.POINT || result.gesture === GestureType.PINCH);
          
          if (showCursor && result.tip) {
            const rawTarget = { x: 1 - result.tip.x, y: result.tip.y };
            targetCursorRef.current = rawTarget;
            
            if (!currentCursorRef.current) {
              currentCursorRef.current = rawTarget;
            }

            const cur = currentCursorRef.current;
            const target = targetCursorRef.current;
            
            const smoothX = lerp(cur.x, target.x, CURSOR_SMOOTHING);
            const smoothY = lerp(cur.y, target.y, CURSOR_SMOOTHING);
            
            currentCursorRef.current = { x: smoothX, y: smoothY };
            
            setCursorPosition({ x: smoothX, y: smoothY });
            
            setCursorHistory(prev => {
              if (!prev) return [{ x: smoothX, y: smoothY }]; 
              const newHist = [...prev, { x: smoothX, y: smoothY }];
              if (newHist.length > 15) newHist.shift(); 
              return newHist;
            });
          } else {
            if (result.gesture !== GestureType.POINT && result.gesture !== GestureType.PINCH) {
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
  }, []);

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
  }, [hasStarted, startDetectionLoop]);

  const handlePhotoSelect = useCallback(async (id: string) => {
    if (id === selectedPhotoId) return;
    
    setSelectedPhotoId(id);
    setPhotoDescription("Gemini is reading this memory...");
    
    const desc = await geminiService.current.generateMemoryDescription(id);
    setPhotoDescription(desc);
  }, [selectedPhotoId]);

  const selectedPhoto = PHOTOS_DATA.find(p => p.id === selectedPhotoId);
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
            antialias: false, 
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
          
          <ChristmasTree 
            mode={mode} 
            onPhotoSelect={handlePhotoSelect} 
            selectedPhotoId={selectedPhotoId}
            cursorPosition={cursorPosition}
            isClicking={isPinching}
          />

          <EffectComposer enableNormalPass={false}>
            <Bloom luminanceThreshold={1} mipmapBlur intensity={1.5} />
          </EffectComposer>

          <OrbitControls enableZoom={true} maxDistance={20} minDistance={2} enablePan={false} autoRotate={true} autoRotateSpeed={0.5} />
        </Canvas>
      </div>

      {cursorPosition && cursorHistory && cursorHistory.length > 0 && (
        <>
          {cursorHistory.map((pos, i) => {
             const opacity = i / Math.max(cursorHistory.length, 1);
             const scale = 0.5 + (opacity * 0.5);
             return (
               <div 
                 key={i}
                 className="absolute z-40 rounded-full bg-yellow-200 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 blur-[1px]"
                 style={{
                   left: `${pos.x * 100}%`,
                   top: `${pos.y * 100}%`,
                   width: `${6 * scale}px`,
                   height: `${6 * scale}px`,
                   opacity: opacity * 0.6,
                   boxShadow: `0 0 ${10 * scale}px rgba(255, 215, 0, 0.5)`
                 }}
               />
             );
          })}
          
          <div 
            className="absolute z-50 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 transition-transform duration-75 ease-out"
            style={{ 
              left: `${cursorPosition.x * 100}%`, 
              top: `${cursorPosition.y * 100}%`,
              transform: `translate(-50%, -50%) scale(${isPinching ? 0.8 : 1})`
            }}
          >
             <div className="relative w-6 h-6 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,1)] flex items-center justify-center">
                <div className="absolute w-full h-full rounded-full border-2 border-yellow-300 animate-ping opacity-75"></div>
                <div className="absolute w-[150%] h-[150%] border border-orange-400 rounded-full animate-spin opacity-40 border-t-transparent"></div>
                <div className="absolute w-[200%] h-[200%] rounded-full bg-gradient-radial from-transparent to-yellow-500 opacity-20 animate-pulse"></div>
             </div>
          </div>
        </>
      )}

      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
        
        <div className="flex justify-between items-start pointer-events-auto">
          <div>
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-red-500 drop-shadow-lg" style={{ fontFamily: 'serif' }}>
              Christmas Magic
            </h1>
            <p className="text-gray-300 text-sm mt-1 max-w-md bg-black/30 p-2 rounded backdrop-blur-sm">
              <span className="font-bold text-green-400">👋 Open Hand</span> to Explode | <span className="font-bold text-red-400">✊ Fist</span> to Reset
              <br/>
              <span className="font-bold text-yellow-400">👆 Point</span> to Move Spark | <span className="font-bold text-orange-400">👌 Pinch</span> to Click
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

        {selectedPhoto && (
          <div className="self-center mb-10 pointer-events-auto bg-black/80 backdrop-blur-xl p-6 rounded-2xl border border-gold-500/30 max-w-md shadow-2xl transition-all transform animate-in fade-in slide-in-from-bottom-8 duration-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-yellow-200" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>✨ Christmas Memory #{selectedPhoto.id}</h3>
              <button 
                onClick={() => setSelectedPhotoId(null)} 
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="relative group">
               <img src={selectedPhoto.url} alt="Memory" className="w-full h-64 object-cover rounded-lg shadow-black/50 shadow-lg mb-4 border-2 border-white/5" />
               <div className="absolute inset-0 rounded-lg shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] pointer-events-none"></div>
            </div>
            <p className="text-white text-lg italic font-serif leading-relaxed text-center opacity-90">
              "{photoDescription || "..."}"
            </p>
            <div className="mt-4 text-center text-xs text-white/40 uppercase tracking-widest">
              Make a Fist ✊ to Close
            </div>
          </div>
        )}
      </div>
    </div>
  );
}