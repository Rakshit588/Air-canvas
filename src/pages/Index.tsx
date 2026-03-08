import { useState, useCallback, useRef } from 'react';
import CameraPanel from '@/components/CameraPanel';
import WhiteboardCanvas, { WhiteboardHandle } from '@/components/WhiteboardCanvas';
import ToolbarPanel from '@/components/ToolbarPanel';
import { GestureType } from '@/lib/gestureClassifier';
import { Point, Stroke } from '@/lib/strokeSmoother';
import { Sparkles } from 'lucide-react';

const Index = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [gesture, setGesture] = useState<GestureType>('none');
  const [fingerPosition, setFingerPosition] = useState<Point | null>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentColor, setCurrentColor] = useState('#00ffff');
  const [brushSize, setBrushSize] = useState(3);
  const whiteboardRef = useRef<WhiteboardHandle>(null);

  const handleStrokeComplete = useCallback((stroke: Stroke) => {
    setStrokes((prev) => [...prev, stroke]);
  }, []);

  const handleErase = useCallback((point: Point) => {
    setStrokes((prev) =>
      prev.filter((stroke) => {
        // Remove strokes that have any point within 25px of erase point
        return !stroke.points.some(
          (p) => Math.hypot(p.x - point.x, p.y - point.y) < 25
        );
      })
    );
  }, []);

  const handleUndo = useCallback(() => {
    setStrokes((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback(() => {
    setStrokes([]);
  }, []);

  const handleSave = useCallback(() => {
    whiteboardRef.current?.saveAsImage();
  }, []);

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
        <p className="text-xs text-muted-foreground font-mono hidden sm:block">
          Air Writing Educational Platform
        </p>
      </header>

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
        <main className="flex-1 p-4">
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
