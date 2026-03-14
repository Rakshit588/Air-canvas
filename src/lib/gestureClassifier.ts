export type GestureType = 'draw' | 'erase' | 'navigate' | 'pause' | 'clear' | 'save' | 'none';

interface Landmark {
  x: number;
  y: number;
  z: number;
}

function isFingerExtended(landmarks: Landmark[], tip: number, pip: number): boolean {
  return landmarks[tip].y < landmarks[pip].y;
}

function isThumbExtended(landmarks: Landmark[]): boolean {
  return Math.abs(landmarks[4].x - landmarks[2].x) > Math.abs(landmarks[3].x - landmarks[2].x) * 0.8;
}

function isThumbUp(landmarks: Landmark[]): boolean {
  const thumbExtended = isThumbExtended(landmarks);
  const indexCurled = !isFingerExtended(landmarks, 8, 6);
  const middleCurled = !isFingerExtended(landmarks, 12, 10);
  const ringCurled = !isFingerExtended(landmarks, 16, 14);
  const pinkyCurled = !isFingerExtended(landmarks, 20, 18);
  return thumbExtended && indexCurled && middleCurled && ringCurled && pinkyCurled;
}

export function classifyGesture(landmarks: Landmark[]): GestureType {
  if (!landmarks || landmarks.length < 21) return 'none';

  const indexUp = isFingerExtended(landmarks, 8, 6);
  const middleUp = isFingerExtended(landmarks, 12, 10);
  const ringUp = isFingerExtended(landmarks, 16, 14);
  const pinkyUp = isFingerExtended(landmarks, 20, 18);
  const thumbUp = isThumbExtended(landmarks);

  const extendedCount = [indexUp, middleUp, ringUp, pinkyUp, thumbUp].filter(Boolean).length;

  // Thumbs up → clear board
  if (isThumbUp(landmarks)) return 'clear';

  // Open palm (4+ fingers) → pause
  if (extendedCount >= 4) return 'pause';

  // Four fingers (index+middle+ring+pinky, no thumb) → save
  if (indexUp && middleUp && ringUp && pinkyUp && !thumbUp) return 'save';

  // Fist → erase
  if (extendedCount === 0) return 'erase';

  // Two fingers (index + middle) → navigate
  if (indexUp && middleUp && !ringUp && !pinkyUp) return 'navigate';

  // Index only → draw
  if (indexUp && !middleUp && !ringUp && !pinkyUp) return 'draw';

  return 'none';
}

export const GESTURE_LABELS: Record<GestureType, string> = {
  draw: '✏️ Drawing',
  erase: '🧹 Erasing',
  navigate: '🖱️ Navigate',
  pause: '✋ Paused',
  clear: '👍 Clear Board',
  save: '🖖 Save Notes',
  none: '—',
};

export const GESTURE_COLORS: Record<GestureType, string> = {
  draw: 'hsl(180, 100%, 50%)',
  erase: 'hsl(0, 100%, 60%)',
  navigate: 'hsl(60, 100%, 50%)',
  pause: 'hsl(110, 100%, 55%)',
  clear: 'hsl(25, 100%, 50%)',
  save: 'hsl(300, 100%, 60%)',
  none: 'hsl(215, 15%, 55%)',
};
