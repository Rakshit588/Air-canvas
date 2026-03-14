import { useEffect, useRef } from 'react';
import { GestureType, GESTURE_COLORS } from '@/lib/gestureClassifier';

interface Landmark {
  x: number;
  y: number;
  z: number;
}

interface GestureVisualizerProps {
  landmarks: Landmark[] | null;
  gesture: GestureType;
  width: number;
  height: number;
}

const CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
];

const FINGERTIPS = new Set([4, 8, 12, 16, 20]);

const GestureVisualizer = ({ landmarks, gesture, width, height }: GestureVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    if (!landmarks || landmarks.length < 21 || width === 0 || height === 0) return;

    const color = GESTURE_COLORS[gesture];

    // Draw bone connections
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;

    for (const [a, b] of CONNECTIONS) {
      const la = landmarks[a];
      const lb = landmarks[b];
      ctx.beginPath();
      ctx.moveTo((1 - la.x) * width, la.y * height);
      ctx.lineTo((1 - lb.x) * width, lb.y * height);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;

    // Draw landmark dots
    for (let i = 0; i < landmarks.length; i++) {
      const l = landmarks[i];
      const x = (1 - l.x) * width;
      const y = l.y * height;
      const isTip = FINGERTIPS.has(i);
      const radius = isTip ? 5 : 3;

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isTip ? '#ffffff' : color;
      ctx.shadowBlur = isTip ? 12 : 6;
      ctx.shadowColor = isTip ? '#ffffff' : color;
      ctx.fill();
    }

    ctx.shadowBlur = 0;
  }, [landmarks, gesture, width, height]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="gesture-visualizer"
      className="absolute inset-0 w-full h-full pointer-events-none opacity-90"
    />
  );
};

export default GestureVisualizer;
