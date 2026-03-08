import { useEffect, useRef, useState, useCallback } from 'react';
import { classifyGesture, GestureType, GESTURE_LABELS, GESTURE_COLORS } from '@/lib/gestureClassifier';
import { StrokeSmoother, Point } from '@/lib/strokeSmoother';
import { Video, VideoOff, Loader2 } from 'lucide-react';

interface CameraPanelProps {
  isTracking: boolean;
  onToggleTracking: () => void;
  onGestureChange: (gesture: GestureType) => void;
  onFingerMove: (point: Point | null) => void;
}

const CameraPanel = ({ isTracking, onToggleTracking, onGestureChange, onFingerMove }: CameraPanelProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const smootherRef = useRef(new StrokeSmoother(4));
  const [isLoading, setIsLoading] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<GestureType>('none');

  const handleResults = useCallback((results: HandResults) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw mirrored video
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];

      // Draw landmarks (mirrored)
      ctx.save();
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);

      if (typeof drawConnectors === 'function' && typeof HAND_CONNECTIONS !== 'undefined') {
        drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: 'hsl(180, 100%, 50%)', lineWidth: 2 });
      }
      if (typeof drawLandmarks === 'function') {
        drawLandmarks(ctx, landmarks, { color: 'hsl(300, 100%, 50%)', lineWidth: 1, radius: 3 });
      }
      ctx.restore();

      const gesture = classifyGesture(landmarks);
      setCurrentGesture(gesture);
      onGestureChange(gesture);

      // Get index finger tip position (mirrored)
      const indexTip = landmarks[8];
      if (gesture === 'draw' || gesture === 'erase') {
        const smoothed = smootherRef.current.smooth({
          x: 1 - indexTip.x, // mirror
          y: indexTip.y,
        });
        onFingerMove(smoothed);
      } else {
        smootherRef.current.reset();
        onFingerMove(null);
      }
    } else {
      setCurrentGesture('none');
      onGestureChange('none');
      onFingerMove(null);
      smootherRef.current.reset();
    }
  }, [onGestureChange, onFingerMove]);

  const startTracking = useCallback(async () => {
    if (!videoRef.current) return;
    setIsLoading(true);

    try {
      if (typeof window.Hands === 'undefined') {
        // Wait for CDN scripts
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const hands = new Hands({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      });

      hands.onResults(handleResults);
      handsRef.current = hands;

      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (handsRef.current && videoRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });

      await camera.start();
      cameraRef.current = camera;
      setIsLoading(false);
    } catch (err) {
      console.error('Failed to start hand tracking:', err);
      setIsLoading(false);
    }
  }, [handleResults]);

  const stopTracking = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (handsRef.current) {
      handsRef.current.close();
      handsRef.current = null;
    }
    setCurrentGesture('none');
    onGestureChange('none');
    onFingerMove(null);
  }, [onGestureChange, onFingerMove]);

  useEffect(() => {
    if (isTracking) {
      startTracking();
    } else {
      stopTracking();
    }
    return () => stopTracking();
  }, [isTracking]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-lg border border-border bg-secondary aspect-[4/3]">
        <video ref={videoRef} className="hidden" playsInline />
        <canvas ref={canvasRef} className="w-full h-full object-cover" />

        {!isTracking && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-secondary">
            <VideoOff className="w-12 h-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Camera inactive</p>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-secondary/80 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-primary">Loading hand tracking model…</p>
          </div>
        )}

        {/* Gesture badge */}
        {isTracking && !isLoading && (
          <div
            className="absolute top-3 left-3 px-3 py-1.5 rounded-full text-xs font-mono font-semibold glass-panel"
            style={{ color: GESTURE_COLORS[currentGesture] }}
          >
            {GESTURE_LABELS[currentGesture]}
          </div>
        )}
      </div>

      <button
        onClick={onToggleTracking}
        disabled={isLoading}
        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-mono text-sm font-semibold transition-all ${
          isTracking
            ? 'bg-destructive/20 text-destructive border border-destructive/30 hover:bg-destructive/30'
            : 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 neon-glow'
        } disabled:opacity-50`}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isTracking ? (
          <VideoOff className="w-4 h-4" />
        ) : (
          <Video className="w-4 h-4" />
        )}
        {isLoading ? 'Loading…' : isTracking ? 'Stop Camera' : 'Start Camera'}
      </button>
    </div>
  );
};

export default CameraPanel;
