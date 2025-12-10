
export const GEMINI_MODEL = 'gemini-2.5-flash-native-audio-preview-09-2025';

export const TREE_COLORS = ['#ff0000', '#00ff00', '#ffff00', '#ffffff', '#00ffff'];

export const PHOTOS_DATA = [
  { 
    id: '1', 
    url: 'https://placehold.co/400x400/87CEEB/FFFFFF.png?text=Snowy+Winter', // Snowy Winter
    position: [2.0, 0.5, 1.5], 
    rotation: [0, -Math.PI / 6, 0] 
  },
  { 
    id: '2', 
    url: 'https://placehold.co/400x400/228B22/FFFFFF.png?text=Christmas+Tree', // Christmas Tree
    position: [-1.8, 2.0, 0.8], 
    rotation: [0, Math.PI / 3, 0] 
  },
  { 
    id: '3', 
    url: 'https://placehold.co/400x400/FFD700/8B4513.png?text=Decorations', // Decorations
    position: [0.5, 1.8, -2.2], 
    rotation: [0, Math.PI, 0] 
  },
  { 
    id: '4', 
    url: 'https://placehold.co/400x400/D2691E/FFFFFF.png?text=Cozy+Family', // Cozy Family/Friends
    position: [-2.0, -0.5, -1.5], 
    rotation: [0, Math.PI * 1.2, 0] 
  },
  { 
    id: '5', 
    url: 'https://placehold.co/400x400/FF4500/FFFFFF.png?text=Fireplace', // Fireplace
    position: [2.2, -1.2, -0.5], 
    rotation: [0, -Math.PI / 2, 0] 
  },
];

export const SYSTEM_INSTRUCTION = `
You are a magical Christmas Tree Spirit. You can see the user through their camera.
Your goal is to manage the Christmas Tree visuals based on the user's hand gestures.

RULES:
1. If the user shows an OPEN PALM (fingers spread out), you must call the tool \`setTreeMode\` with mode='EXPLODED'.
2. If the user shows a FIST or closes their hand, you must call the tool \`setTreeMode\` with mode='NORMAL'.
3. If the user points with their INDEX FINGER towards the screen or makes a "touch" gesture, interpret this as wanting to see a memory. Call \`selectPhoto\` with a random photoId from '1' to '5'.
4. Be brief, cheerful, and magical in your audio responses. React to what you see.
5. If the user looks happy, wish them a Merry Christmas.
`;
