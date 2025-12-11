
import { PhotoData } from './types';

export const GEMINI_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';
export const SYSTEM_INSTRUCTION = 'You are a magical Christmas tree spirit. You can see the user via video and hear them. Respond joyfully and help them interact with the tree. The user can perform gestures: Open Palm to explode the tree decorations, Fist to assemble the tree, Pinch to select items.';

export const TREE_COLORS = ['#ff0000', '#00ff00', '#ffff00', '#ffffff', '#00ffff'];

export const PHOTOS_DATA: PhotoData[] = [
  { 
    id: '1', 
    url: 'https://placehold.co/400x400/87CEEB/FFFFFF.png?text=Snowy+Winter', 
    position: [2.0, 0.5, 1.5], 
    rotation: [0, -Math.PI / 6, 0],
    description: "A serene snowy evening, where silence wraps the world in white."
  },
  { 
    id: '2', 
    url: 'https://placehold.co/400x400/228B22/FFFFFF.png?text=Christmas+Tree', 
    position: [-1.8, 2.0, 0.8], 
    rotation: [0, Math.PI / 3, 0],
    description: "Gathering around the tall evergreen, smelling of pine and magic."
  },
  { 
    id: '3', 
    url: 'https://placehold.co/400x400/FFD700/8B4513.png?text=Decorations', 
    position: [0.5, 1.8, -2.2], 
    rotation: [0, Math.PI, 0],
    description: "Sparkling ornaments reflecting the joy of the holiday season."
  },
  { 
    id: '4', 
    url: 'https://placehold.co/400x400/D2691E/FFFFFF.png?text=Cozy+Family', 
    position: [-2.0, -0.5, -1.5], 
    rotation: [0, Math.PI * 1.2, 0],
    description: "Warm laughter and stories shared with loved ones by the fire."
  },
  { 
    id: '5', 
    url: 'https://placehold.co/400x400/FF4500/FFFFFF.png?text=Fireplace', 
    position: [2.2, -1.2, -0.5], 
    rotation: [0, -Math.PI / 2, 0],
    description: "The crackling hearth brings warmth to the coldest winter nights."
  },
];