import { useEffect, useRef, useState, useCallback } from 'react';
import { classifyGesture, GestureType, GESTURE_LABELS, GESTURE_COLORS } from '@/lib/gestureClassifier';
import { StrokeSmoother, Point } from '@/lib/strokeSmoother';
import { LandmarkSmoother } from '@/lib/landmarkSmoother';
import GestureVisualizer from '@/components/GestureVisualizer';
import { Video, VideoOff, Loader2 } from 'lucide-react';

interface Landmark { x: number; y: number; z: number; }

interface CameraPanelProps {
  isTracking: boolean;
  onToggleTracking: () => void;
  onGestureChange: (gesture: GestureType) => void;
  onFingerMove: (point: Point | null) => void;
}

const TARGET_FPS = 30;
const FRAME_MS = 1000 / TARGET_FPS;

const CameraPanel = ({ isTracking, onToggleTracking, onGestureChange, onFingerMove }: CameraPanelProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const fingerSmootherRef = useRef(new StrokeSmoother(4));
  const landmarkSmootherRef = useRef(new LandmarkSmoother(0.5));
  const lastFrameTimeRef = useRef(0);

  const [isLoading, setIsLoading] = useState(false);
  const [currentGesture, setCurrentGesture] = useState<GestureType>('none');
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [canvasDims, setCanvasDims] = useState({ width: 0, height: 0 });

  const handleResults = useCallback((results: HandResults) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = video.videoWidth || 640;
    const h = video.videoHeight || 480;

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      setCanvasDims({ width: w, height: h });
    }

    // Draw mirrored video only
    ctx.save();
    ctx.clearRect(0, 0, w, h);
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(results.image, 0, 0, w, h);
    ctx.restore();

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const rawLandmarks = results.multiHandLandmarks[0];
      const smoothed = landmarkSmootherRef.current.smooth(rawLandmarks);

      setLandmarks(smoothed);

      const gesture = classifyGesture(smoothed);
      setCurrentGesture(gesture);
      onGestureChange(gesture);

      const indexTip = smoothed[8];
      if (gesture === 'draw' || gesture === 'erase') {
        const smoothedPt = fingerSmootherRef.current.smooth({
          x: 1 - indexTip.x,
          y: indexTip.y,
        });
        onFingerMove(smoothedPt);
      } else {
        fingerSmootherRef.current.reset();
        onFingerMove(null);
      }
    } else {
      setLandmarks(null);
      landmarkSmootherRef.current.reset();
      setCurrentGesture('none');
      onGestureChange('none');
      onFingerMove(null);
      fingerSmootherRef.current.reset();
    }
  }, [onGestureChange, onFingerMove]);

  const startTracking = useCallback(async () => {
    if (!videoRef.current) return;
    setIsLoading(true);

    try {
      if (typeof (window as any).Hands === 'undefined') {
        await new Promise((resolve) => setTimeout(resolve, 2000));
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
          // Frame throttling: skip frames exceeding TARGET_FPS
          const now = performance.now();
          if (now - lastFrameTimeRef.current < FRAME_MS) return;
          lastFrameTimeRef.current = now;

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
    setLandmarks(null);
    landmarkSmootherRef.current.reset();
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

  const gestureColor = GESTURE_COLORS[currentGesture];

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-lg border border-border bg-secondary aspect-[4/3]">
        <video ref={videoRef} className="hidden" playsInline />
        <canvas ref={canvasRef} className="w-full h-full object-cover" />

        {/* Hand skeleton overlay */}
        <GestureVisualizer
          landmarks={landmarks}
          gesture={currentGesture}
          width={canvasDims.width}
          height={canvasDims.height}
        />

        {!isTracking && !isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-secondary">
            <VideoOff className="w-12 h-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground font-mono">Camera inactive</p>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-secondary/80 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-primary font-mono">Loading hand tracking…</p>
          </div>
        )}

        {/* Gesture mode label — bottom bar */}
        {isTracking && !isLoading && currentGesture !== 'none' && (
          <div
            className="absolute bottom-0 left-0 right-0 px-3 py-2 font-mono text-xs font-bold text-center tracking-widest uppercase backdrop-blur-sm"
            style={{
              backgroundColor: `${gestureColor}22`,
              color: gestureColor,
              borderTop: `1px solid ${gestureColor}44`,
              textShadow: `0 0 8px ${gestureColor}`,
            }}
          >
            {GESTURE_LABELS[currentGesture]}
          </div>
        )}

        {/* Small top badge for hand detected indicator */}
        {isTracking && !isLoading && (
          <div className="absolute top-2 right-2 flex items-center gap-1.5 px-2 py-1 rounded-full glass-panel">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: landmarks ? gestureColor : 'hsl(215, 15%, 45%)',
                boxShadow: landmarks ? `0 0 6px ${gestureColor}` : 'none',
              }}
            />
            <span className="text-[10px] font-mono text-muted-foreground">
              {landmarks ? 'HAND' : 'NO HAND'}
            </span>
          </div>
        )}
      </div>

      <button
        data-testid="button-toggle-camera"
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
