import { useState, useCallback, useRef, useEffect } from 'react';
import CameraPanel from '@/components/CameraPanel';
import WhiteboardCanvas, { WhiteboardHandle } from '@/components/WhiteboardCanvas';
import ToolbarPanel from '@/components/ToolbarPanel';
import { GestureType, GESTURE_LABELS, GESTURE_COLORS } from '@/lib/gestureClassifier';
import { Point, Stroke } from '@/lib/strokeSmoother';
import { useTheme } from '@/lib/themeContext';
import { Sparkles, Moon, Sun, Circle, Square } from 'lucide-react';

const GESTURE_ACTION_COOLDOWN_MS = 1500;

const Index = () => {
  const { theme, toggleTheme } = useTheme();
  const [isTracking, setIsTracking] = useState(false);
  const [gesture, setGesture] = useState<GestureType>('none');
  const [fingerPosition, setFingerPosition] = useState<Point | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentColor, setCurrentColor] = useState('#00ffff');
  const [brushSize, setBrushSize] = useState(3);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);

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

  const handleExportPDF = useCallback(() => {
    whiteboardRef.current?.exportAsPDF();
    showFeedback('Opening PDF export…');
  }, [showFeedback]);

  const handleToggleRecording = useCallback(() => {
    if (!isRecording) {
      whiteboardRef.current?.startRecording();
      setIsRecording(true);
      showFeedback('🔴 Recording started');
    } else {
      whiteboardRef.current?.stopRecording();
      setIsRecording(false);
      showFeedback('⏹ Recording saved');
    }
  }, [isRecording, showFeedback]);

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

  const gestureColor = GESTURE_COLORS[gesture];

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-border glass-panel shrink-0 gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-mono font-bold text-foreground neon-text">
            GestureBoard
          </h1>
        </div>

        {/* Live gesture status pill */}
        {isTracking ? (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-panel text-xs font-mono font-bold tracking-wider transition-all duration-200"
            style={{ color: gestureColor, borderColor: `${gestureColor}33` }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse shrink-0"
              style={{ backgroundColor: gestureColor }}
            />
            {GESTURE_LABELS[gesture]}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground font-mono hidden sm:block">
            Air Writing Educational Platform
          </p>
        )}

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Recording button */}
          <button
            data-testid="button-toggle-recording"
            onClick={handleToggleRecording}
            title={isRecording ? 'Stop recording' : 'Start recording lecture'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs font-semibold transition-all ${
              isRecording
                ? 'border-red-500/50 bg-red-500/15 text-red-400 animate-pulse'
                : 'border-border bg-secondary hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            {isRecording ? (
              <Square className="w-3 h-3 fill-current" />
            ) : (
              <Circle className="w-3 h-3" />
            )}
            {isRecording ? 'Stop REC' : 'Record'}
          </button>

          {/* Theme toggle */}
          <button
            data-testid="button-toggle-theme"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-1.5 rounded-lg border border-border bg-secondary hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Gesture action feedback toast */}
      {actionFeedback && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full glass-panel border border-primary/30 text-primary font-mono font-bold text-sm shadow-lg neon-glow animate-fade-in pointer-events-none">
          {actionFeedback}
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
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
            onExportPDF={handleExportPDF}
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
