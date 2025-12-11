
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

          // --- HELPER FUNCTIONS ---
          const dist = (a: any, b: any) => Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

          // --- KEYPOINTS ---
          const wrist = landmarks[0];
          const thumbTip = landmarks[4];
          const indexMCP = landmarks[5];
          const indexPip = landmarks[6];
          const indexTip = landmarks[8];
          const middlePip = landmarks[10];
          const middleTip = landmarks[12];
          const ringPip = landmarks[14];
          const ringTip = landmarks[16];
          const pinkyPip = landmarks[18];
          const pinkyTip = landmarks[20];

          // Reference Scale: Distance from Wrist to Middle MCP (Knuckle)
          const handScale = dist(wrist, landmarks[9]); 
          if (handScale < 0.01) return { gesture: GestureType.NONE, tip: null };

          // --- FINGER STATES ---
          // A finger is "Curled" if the Tip is closer to the wrist than the PIP joint
          const isCurled = (tip: any, pip: any) => dist(wrist, tip) < dist(wrist, pip);
          
          // Check extensions
          const indexExt = !isCurled(indexTip, indexPip);
          const middleExt = !isCurled(middleTip, middlePip);
          const ringExt = !isCurled(ringTip, ringPip);
          const pinkyExt = !isCurled(pinkyTip, pinkyPip);

          const allCurled = !indexExt && !middleExt && !ringExt && !pinkyExt;
          const allExtended = indexExt && middleExt && ringExt && pinkyExt;

          // Standardize Tip: Always use Index Finger Tip for consistency
          const tip = { x: indexTip.x, y: indexTip.y };

          // --- PRIORITY LOGIC ---
          // 1. FIST (Reset) - Highest Priority
          // Strict check: All 4 fingers must be curled tight.
          if (allCurled) {
             return { gesture: GestureType.FIST, tip };
          }

          // 2. OPEN PALM (Explode)
          // Strict check: All 4 fingers must be extended.
          if (allExtended) {
             // Ensure fingers are somewhat spread or clearly away from wrist
             return { gesture: GestureType.OPEN_PALM, tip };
          }

          // 3. PINCH (Click/Select)
          // Logic: Thumb tip is close to Index tip.
          // We allow this even if other fingers are loose.
          const pinchDist = dist(thumbTip, indexTip);
          
          // Threshold: 15% of hand scale is a good pinch zone
          if (pinchDist < handScale * 0.15) {
             return { gesture: GestureType.PINCH, tip };
          }

          // 4. POINT / CURSOR (Default Fallback)
          // If the hand is visible, but NOT a Fist, NOT Open Palm, and NOT Pinching...
          // We treat it as a "Point" or "Hover".
          // This ensures the cursor NEVER disappears as long as the hand is tracked.
          return { gesture: GestureType.POINT, tip };
          
        }
      } catch (e) {
        return { gesture: GestureType.NONE, tip: null };
      }
    }
    
    return { gesture: GestureType.NONE, tip: null };
  }
}
