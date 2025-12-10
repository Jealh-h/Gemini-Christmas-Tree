
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
    
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return { gesture: GestureType.NONE, tip: null };
    }
    
    if (video.currentTime !== this.lastVideoTime) {
      const startTimeMs = performance.now();
      try {
        const results = this.handLandmarker.detectForVideo(video, startTimeMs);
        this.lastVideoTime = video.currentTime;

        if (results && Array.isArray(results.landmarks) && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0];
          
          if (!landmarks || landmarks.length < 21) {
             return { gesture: GestureType.NONE, tip: null };
          }

          // --- KEYPOINTS ---
          const wrist = landmarks[0];
          const thumbTip = landmarks[4];
          const indexMCP = landmarks[5]; // Index knuckle
          const indexTip = landmarks[8];
          const middleTip = landmarks[12];
          const ringTip = landmarks[16];
          const pinkyTip = landmarks[20];
          
          // Joints for extension check (PIP = Proximal Interphalangeal Joint)
          const indexPip = landmarks[6];
          const middlePip = landmarks[10];
          const ringPip = landmarks[14];
          const pinkyPip = landmarks[18];

          // --- HELPER FUNCTIONS ---
          const dist = (a: any, b: any) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

          // Check if a finger is extended (Tip is significantly further from wrist than PIP)
          const isExtended = (tip: any, pip: any) => dist(wrist, tip) > dist(wrist, pip) * 1.1;

          // --- FINGER STATES ---
          const indexExt = isExtended(indexTip, indexPip);
          const middleExt = isExtended(middleTip, middlePip);
          const ringExt = isExtended(ringTip, ringPip);
          const pinkyExt = isExtended(pinkyTip, pinkyPip);
          
          // Thumb is extended if tip is far from Index MCP
          const thumbExt = dist(thumbTip, indexMCP) > 0.15; 

          // --- GESTURE LOGIC ---
          const tip = { x: indexTip.x, y: indexTip.y };

          // 1. PINCH (High Priority)
          // Criteria: Thumb tip close to Index tip
          const pinchDist = dist(thumbTip, indexTip);
          const isPinchValues = pinchDist < 0.1;

          if (isPinchValues) {
            // Intelligent Check: Avoid confusing a FIST with a PINCH.
            // In a fist, the index finger is curled, so Index Tip is close to Index MCP.
            // In a pinch, the index finger is usually curved but extended away from the palm base.
            const indexNotBuried = dist(indexTip, indexMCP) > 0.08; 
            
            if (indexNotBuried) {
               return { gesture: GestureType.PINCH, tip };
            }
          }

          // 2. POINT
          // Criteria: Index Extended, others Curled.
          // We allow the Thumb to be anywhere (relaxed).
          if (indexExt && !middleExt && !ringExt && !pinkyExt) {
            return { gesture: GestureType.POINT, tip };
          }

          // 3. FIST
          // Criteria: Index, Middle, Ring, Pinky Curled.
          if (!indexExt && !middleExt && !ringExt && !pinkyExt) {
             return { gesture: GestureType.FIST, tip };
          }

          // 4. OPEN PALM
          // Criteria: All non-thumb fingers extended.
          if (indexExt && middleExt && ringExt && pinkyExt) {
             // Usually thumb is out too for a full open palm, but 4 fingers is a strong enough signal
             return { gesture: GestureType.OPEN_PALM, tip };
          }

          return { gesture: GestureType.NONE, tip };
        }
      } catch (e) {
        return { gesture: GestureType.NONE, tip: null };
      }
    }
    
    return { gesture: GestureType.NONE, tip: null };
  }
}
