
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { GestureType, HandGesture } from "../types";

export class VisionService {
  private handLandmarker: HandLandmarker | null = null;
  private lastVideoTime = -1;

  async initialize() {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );
      
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU"
        },
        runningMode: "VIDEO",
        numHands: 1
      });
    } catch (e) {
      console.error("Failed to initialize Vision Service:", e);
    }
  }

  detect(video: HTMLVideoElement): HandGesture {
    if (!this.handLandmarker) return { gesture: GestureType.NONE, tip: null };
    
    // STRICT CHECK: Video must have dimensions to be processed
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return { gesture: GestureType.NONE, tip: null };
    }
    
    if (video.currentTime !== this.lastVideoTime) {
      const startTimeMs = performance.now();
      try {
        const results = this.handLandmarker.detectForVideo(video, startTimeMs);
        this.lastVideoTime = video.currentTime;

        // Safety check: ensure results exists and has landmarks array
        if (results && Array.isArray(results.landmarks) && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          
          // Ensure we have a valid landmarks array for the hand
          if (!landmarks || !Array.isArray(landmarks) || landmarks.length < 21) {
             return { gesture: GestureType.NONE, tip: null };
          }

          const tip = { x: landmarks[8].x, y: landmarks[8].y };

          // 1. Check Pinch (Thumb Tip #4 close to Index Tip #8)
          if (this.checkPinch(landmarks)) {
            return { gesture: GestureType.PINCH, tip };
          }

          // 2. Check Open Palm (All fingers extended)
          if (this.checkPalmOpen(landmarks)) {
            return { gesture: GestureType.OPEN_PALM, tip };
          }

          // 3. Check Fist (All fingers curled)
          if (this.checkFist(landmarks)) {
            return { gesture: GestureType.FIST, tip };
          }

          // 4. Check Pointing (Index extended)
          if (this.checkPointing(landmarks)) {
            return { gesture: GestureType.POINT, tip };
          }

          return { gesture: GestureType.NONE, tip };
        }
      } catch (e) {
        // Suppress sporadic media pipe errors during video initialization
        return { gesture: GestureType.NONE, tip: null };
      }
    }
    
    return { gesture: GestureType.NONE, tip: null };
  }

  private checkPinch(landmarks: any[]): boolean {
    if (!landmarks || landmarks.length < 9) return false;
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const distance = this.dist(thumbTip, indexTip);
    // Relaxed threshold for easier clicking (0.12 -> 0.15)
    return distance < 0.15; 
  }

  private checkPointing(landmarks: any[]): boolean {
    if (!landmarks || landmarks.length < 13) return false;
    const wrist = landmarks[0];
    const indexTip = landmarks[8];
    const indexPip = landmarks[6];
    const middleTip = landmarks[12];
    const middlePip = landmarks[10];

    const isIndexExtended = this.dist(wrist, indexTip) > this.dist(wrist, indexPip);
    if (!isIndexExtended) return false;

    const distIndex = this.dist(wrist, indexTip);
    const distMiddle = this.dist(wrist, middleTip);

    // Relaxed constraint: Middle finger can be very extended (0.85 -> 0.8)
    // allowing for lazy pointing.
    if (distMiddle > distIndex * 0.8) return false;

    return true; 
  }

  private checkPalmOpen(landmarks: any[]): boolean {
    if (!landmarks || landmarks.length < 21) return false;
    const wrist = landmarks[0];
    const tipIds = [8, 12, 16, 20];
    const pipIds = [6, 10, 14, 18];
    
    let extendedCount = 0;
    for(let i=0; i<4; i++) {
        const dTip = this.dist(wrist, landmarks[tipIds[i]]);
        const dPip = this.dist(wrist, landmarks[pipIds[i]]);
        if (dTip > dPip * 1.1) extendedCount++;
    }
    
    return extendedCount >= 3; 
  }

  private checkFist(landmarks: any[]): boolean {
    if (!landmarks || landmarks.length < 21) return false;
    const wrist = landmarks[0];
    const tipIds = [8, 12, 16, 20];
    const pipIds = [6, 10, 14, 18];
    
    let curledCount = 0;
    for(let i=0; i<4; i++) {
        const dTip = this.dist(wrist, landmarks[tipIds[i]]);
        const dPip = this.dist(wrist, landmarks[pipIds[i]]);
        if (dTip < dPip) curledCount++;
    }
    
    return curledCount >= 3;
  }

  private dist(a: {x: number, y: number}, b: {x: number, y: number}) {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
  }
}