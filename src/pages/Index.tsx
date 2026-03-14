import { useState, useCallback, useRef, useEffect } from 'react';
import CameraPanel from '@/components/CameraPanel';
import WhiteboardCanvas, { WhiteboardHandle } from '@/components/WhiteboardCanvas';
import ToolbarPanel from '@/components/ToolbarPanel';
import { GestureType, GESTURE_LABELS, GESTURE_COLORS } from '@/lib/gestureClassifier';
import { Point, Stroke } from '@/lib/strokeSmoother';
import { Sparkles } from 'lucide-react';

const GESTURE_ACTION_COOLDOWN_MS = 1500;

const Index = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [gesture, setGesture] = useState<GestureType>('none');
  const [fingerPosition, setFingerPosition] = useState<Point | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentColor, setCurrentColor] = useState('#00ffff');
  const [brushSize, setBrushSize] = useState(3);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const whiteboardRef = useRef<WhiteboardHandle>(null);
  const lastActionRef = useRef<Record<string, number>>({});
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = useCallback((message: string) => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setActionFeedback(message);
    feedbackTimerRef.current = setTimeout(() => setActionFeedback(null), 2000);
  }, []);

  const canTriggerAction = useCallback((action: string): boolean => {
    const now = Date.now();
    const last = lastActionRef.current[action] ?? 0;
    if (now - last > GESTURE_ACTION_COOLDOWN_MS) {
      lastActionRef.current[action] = now;
      return true;
    }
    return false;
  }, []);

  const handleStrokeComplete = useCallback((stroke: Stroke) => {
    setStrokes((prev) => [...prev, stroke]);
  }, []);

  const handleErase = useCallback((point: Point) => {
    setStrokes((prev) =>
      prev.filter((stroke) =>
        !stroke.points.some((p) => Math.hypot(p.x - point.x, p.y - point.y) < 25)
      )
    );
  }, []);

  const handleUndo = useCallback(() => {
    setStrokes((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setStrokes([]);
    showFeedback('Board cleared');
  }, [showFeedback]);

  const handleSave = useCallback(() => {
    whiteboardRef.current?.saveAsImage();
    showFeedback('Image saved!');
  }, [showFeedback]);

  // Gesture-triggered one-shot actions with cooldown
  useEffect(() => {
    if (gesture === 'clear' && canTriggerAction('clear')) {
      setStrokes([]);
      showFeedback('👍 Board Cleared!');
    } else if (gesture === 'save' && canTriggerAction('save')) {
      whiteboardRef.current?.saveAsImage();
      showFeedback('🖖 Notes Saved!');
    }
  }, [gesture, canTriggerAction, showFeedback]);

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border glass-panel shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-mono font-bold text-foreground neon-text">
            GestureBoard
          </h1>
        </div>

        {/* Live gesture status — center */}
        {isTracking && (
          <div
            className="flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel text-sm font-mono font-semibold transition-all duration-200"
            style={{ color: GESTURE_COLORS[gesture] }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: GESTURE_COLORS[gesture] }}
            />
            {GESTURE_LABELS[gesture]}
          </div>
        )}

        <p className="text-xs text-muted-foreground font-mono hidden sm:block">
          Air Writing Educational Platform
        </p>
      </header>

      {/* Gesture action feedback toast */}
      {actionFeedback && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full glass-panel border border-primary/30 text-primary font-mono font-bold text-sm shadow-lg neon-glow animate-fade-in">
          {actionFeedback}
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Camera + Tools */}
        <aside className="w-72 shrink-0 border-r border-border p-4 overflow-y-auto flex flex-col gap-4 bg-card/50">
          <CameraPanel
            isTracking={isTracking}
            onToggleTracking={() => setIsTracking((p) => !p)}
            onGestureChange={setGesture}
            onFingerMove={setFingerPosition}
          />
          <ToolbarPanel
            currentColor={currentColor}
            brushSize={brushSize}
            onColorChange={setCurrentColor}
            onBrushSizeChange={setBrushSize}
            onUndo={handleUndo}
            onClear={handleClear}
            onSave={handleSave}
            canUndo={strokes.length > 0}
          />
        </aside>

        {/* Whiteboard */}
        <main className="flex-1 p-4 relative">
          <WhiteboardCanvas
            ref={whiteboardRef}
            strokes={strokes}
            currentColor={currentColor}
            brushSize={brushSize}
            gesture={gesture}
            fingerPosition={fingerPosition}
            onStrokeComplete={handleStrokeComplete}
            onErase={handleErase}
          />
        </main>
      </div>
    </div>
  );
};

export default Index;
