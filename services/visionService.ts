import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { GestureType, HandGesture } from "../types";

export class VisionService {
  private handLandmarker: HandLandmarker | null = null;
  private lastVideoTime = -1;

  // Stability Buffer
  private gestureHistory: GestureType[] = [];
  private historySize = 5;

  // Hysteresis State
  private lastStableGesture: GestureType = GestureType.NONE;

  async initialize() {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );

      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numHands: 1,
      });
    } catch (e) {
      console.error("Failed to initialize Vision Service:", e);
    }
  }

  detect(video: HTMLVideoElement): HandGesture {
    // Default safe return
    const fallback: HandGesture = { gesture: GestureType.NONE, tip: null };

    if (!this.handLandmarker) return fallback;

    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return fallback;
    }

    try {
      if (video.currentTime !== this.lastVideoTime) {
        const startTimeMs = performance.now();
        const results = this.handLandmarker.detectForVideo(video, startTimeMs);
        this.lastVideoTime = video.currentTime;

        if (
          results &&
          Array.isArray(results.landmarks) &&
          results.landmarks.length > 0
        ) {
          const landmarks = results.landmarks[0];

          if (!landmarks || landmarks.length < 21) {
            return fallback;
          }

          // --- HELPER FUNCTIONS ---
          const dist = (a: any, b: any) =>
            Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));

          const wrist = landmarks[0];
          const thumbTip = landmarks[4];
          const thumbIp = landmarks[3];
          const indexMcp = landmarks[5];
          const indexPip = landmarks[6];
          const indexTip = landmarks[8];
          const middlePip = landmarks[10];
          const middleTip = landmarks[12];
          const ringPip = landmarks[14];
          const ringTip = landmarks[16];
          const pinkyPip = landmarks[18];
          const pinkyTip = landmarks[20];

          // Use Palm Size (Wrist to Middle Knuckle) as a relative scale
          const handScale = dist(wrist, landmarks[9]);

          // --- GEOMETRY CHECKS ---

          // 1. Extension Check
          // Tip must be significantly further from wrist than PIP
          // Hysteresis: If we were already OPEN, we are more lenient (0.9x threshold)
          const isOpenThreshold =
            this.lastStableGesture === GestureType.OPEN_PALM ? 0.9 : 1.0;

          const isFingerExtended = (tip: any, pip: any) =>
            dist(wrist, tip) > dist(wrist, pip) * isOpenThreshold;
          const isFingerCurled = (tip: any, pip: any) =>
            dist(wrist, tip) < dist(wrist, pip);

          const indexOpen = isFingerExtended(indexTip, indexPip);
          const middleOpen = isFingerExtended(middleTip, middlePip);
          const ringOpen = isFingerExtended(ringTip, ringPip);
          const pinkyOpen = isFingerExtended(pinkyTip, pinkyPip);

          // Thumb is tricky. Check if tip is far from index knuckle (MCP)
          const thumbOpen = dist(thumbTip, landmarks[5]) > handScale * 0.5;

          const openCount =
            (indexOpen ? 1 : 0) +
            (middleOpen ? 1 : 0) +
            (ringOpen ? 1 : 0) +
            (pinkyOpen ? 1 : 0);

          // 2. Pinch Distance
          const pinchDist = dist(thumbTip, indexTip);

          // --- LOGIC ---
          let rawGesture = GestureType.POINT; // Default fallback to ensure cursor works

          // A. PINCH (OK)
          // High Priority: Thumb close to Index.
          // Safety: Check distance from Index Tip to Index MCP (Knuckle).
          // In a Fist, the tip is buried in the palm (close to MCP). In a Pinch, it's further out.
          // Threshold: 0.3 * handScale seems safe.
          const isIndexScrunched = dist(indexTip, indexMcp) < handScale * 0.25;

          // Hysteresis: If already pinching, allow larger distance
          const pinchThreshold =
            this.lastStableGesture === GestureType.PINCH ? 0.3 : 0.2;

          if (pinchDist < handScale * pinchThreshold && !isIndexScrunched) {
            rawGesture = GestureType.PINCH;
          }
          // B. FIST (Reset)
          // All fingers strictly curled.
          else if (!indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
            rawGesture = GestureType.FIST;
          }
          // C. OPEN PALM (Explode)
          // At least 4 fingers extended (Thumb optional, or 3 fingers + thumb)
          // Preventing flicker: If 3 fingers are open, it's likely an open palm, just relaxed.
          else if (openCount >= 3) {
            rawGesture = GestureType.OPEN_PALM;
          }
          // D. POINT (Cursor)
          // Default state if nothing else matches.
          else {
            rawGesture = GestureType.POINT;
          }

          // --- STABILITY BUFFER (DEBOUNCING) ---
          this.gestureHistory.push(rawGesture);
          if (this.gestureHistory.length > this.historySize) {
            this.gestureHistory.shift();
          }

          // Simple Voting
          const counts: Record<string, number> = {};
          for (const g of this.gestureHistory) {
            counts[g] = (counts[g] || 0) + 1;
          }

          let stableGesture = this.lastStableGesture;
          // Only switch if > 60% of history agrees
          for (const g of Object.keys(counts)) {
            if (counts[g] > this.historySize * 0.6) {
              stableGesture = g as GestureType;
              break;
            }
          }

          this.lastStableGesture = stableGesture;

          // Always return tip for cursor, regardless of gesture
          return {
            gesture: stableGesture,
            tip: { x: indexTip.x, y: indexTip.y },
          };
        }
      }
    } catch (e) {
      // Ignore
    }

    // Fallback: If tracking fails but we had a gesture, maybe hold it for a split second?
    // For now, return NONE but keep tip null.
    return fallback;
  }
}
