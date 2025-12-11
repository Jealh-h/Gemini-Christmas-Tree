
export enum TreeMode {
  NORMAL = 'NORMAL',
  EXPLODED = 'EXPLODED'
}

export enum GestureType {
  NONE = 'NONE',
  OPEN_PALM = 'OPEN_PALM',
  FIST = 'FIST',
  POINT = 'POINT',
  PINCH = 'PINCH'
}

export interface PhotoData {
  id: string;
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  description: string; // Static description
}

export interface HandGesture {
  gesture: GestureType;
  tip: { x: number; y: number } | null; // Normalized 0-1
}
