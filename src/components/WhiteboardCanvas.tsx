import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Point, Stroke } from '@/lib/strokeSmoother';
import { GestureType } from '@/lib/gestureClassifier';

interface WhiteboardCanvasProps {
  strokes: Stroke[];
  currentColor: string;
  brushSize: number;
  gesture: GestureType;
  fingerPosition: Point | null;
  onStrokeComplete: (stroke: Stroke) => void;
  onErase: (point: Point) => void;
}

export interface WhiteboardHandle {
  saveAsImage: () => void;
}

const ERASER_RADIUS = 25;

const WhiteboardCanvas = forwardRef<WhiteboardHandle, WhiteboardCanvasProps>(
  ({ strokes, currentColor, brushSize, gesture, fingerPosition, onStrokeComplete, onErase }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const currentStrokeRef = useRef<Point[]>([]);
    const isDrawingRef = useRef(false);
    const lastGestureRef = useRef<GestureType>('none');
    const cursorRef = useRef<Point | null>(null);

    useImperativeHandle(ref, () => ({
      saveAsImage: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `gestureboard-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      },
    }));

    const drawStroke = useCallback((ctx: CanvasRenderingContext2D, stroke: Stroke) => {
      if (stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.shadowBlur = Math.min(stroke.width * 4, 20);
      ctx.shadowColor = stroke.color;

      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        const prev = stroke.points[i - 1];
        const curr = stroke.points[i];
        const midX = (prev.x + curr.x) / 2;
        const midY = (prev.y + curr.y) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }, []);

    const drawCursor = useCallback(
      (ctx: CanvasRenderingContext2D, point: Point) => {
        if (gesture === 'pause' || gesture === 'none' || gesture === 'clear' || gesture === 'save') return;

        ctx.save();

        if (gesture === 'erase') {
          // Eraser: hollow circle with crosshair
          ctx.beginPath();
          ctx.arc(point.x, point.y, ERASER_RADIUS, 0, Math.PI * 2);
          ctx.strokeStyle = 'hsl(0, 100%, 60%)';
          ctx.lineWidth = 2;
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'hsl(0, 100%, 60%)';
          ctx.stroke();

          // Crosshair
          ctx.shadowBlur = 0;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(point.x - ERASER_RADIUS / 2, point.y);
          ctx.lineTo(point.x + ERASER_RADIUS / 2, point.y);
          ctx.moveTo(point.x, point.y - ERASER_RADIUS / 2);
          ctx.lineTo(point.x, point.y + ERASER_RADIUS / 2);
          ctx.stroke();
        } else {
          // Draw cursor: filled dot
          ctx.beginPath();
          ctx.arc(point.x, point.y, Math.max(brushSize / 2, 4), 0, Math.PI * 2);
          ctx.fillStyle = currentColor;
          ctx.shadowBlur = 15;
          ctx.shadowColor = currentColor;
          ctx.fill();

          // Outer ring
          ctx.beginPath();
          ctx.arc(point.x, point.y, Math.max(brushSize / 2, 4) + 4, 0, Math.PI * 2);
          ctx.strokeStyle = currentColor;
          ctx.lineWidth = 1;
          ctx.globalAlpha = 0.4;
          ctx.shadowBlur = 0;
          ctx.stroke();
        }

        ctx.restore();
      },
      [gesture, currentColor, brushSize]
    );

    const render = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background
      ctx.fillStyle = 'hsl(220, 20%, 7%)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Grid
      ctx.strokeStyle = 'hsl(220, 15%, 12%)';
      ctx.lineWidth = 0.5;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Committed strokes
      strokes.forEach((stroke) => drawStroke(ctx, stroke));

      // Current in-progress stroke
      if (currentStrokeRef.current.length > 1) {
        drawStroke(ctx, {
          points: currentStrokeRef.current,
          color: currentColor,
          width: brushSize,
        });
      }

      // Cursor
      if (cursorRef.current) {
        drawCursor(ctx, cursorRef.current);
      }
    }, [strokes, currentColor, brushSize, drawStroke, drawCursor]);

    // Handle finger position updates
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas || !fingerPosition) {
        if (isDrawingRef.current && currentStrokeRef.current.length > 1) {
          onStrokeComplete({
            points: [...currentStrokeRef.current],
            color: currentColor,
            width: brushSize,
          });
        }
        currentStrokeRef.current = [];
        isDrawingRef.current = false;
        cursorRef.current = null;
        render();
        return;
      }

      const canvasPoint: Point = {
        x: fingerPosition.x * canvas.width,
        y: fingerPosition.y * canvas.height,
      };
      cursorRef.current = canvasPoint;

      if (gesture === 'draw') {
        if (!isDrawingRef.current) {
          isDrawingRef.current = true;
          currentStrokeRef.current = [canvasPoint];
        } else {
          currentStrokeRef.current.push(canvasPoint);
        }
      } else if (gesture === 'erase') {
        onErase(canvasPoint);
        if (isDrawingRef.current && currentStrokeRef.current.length > 1) {
          onStrokeComplete({
            points: [...currentStrokeRef.current],
            color: currentColor,
            width: brushSize,
          });
        }
        currentStrokeRef.current = [];
        isDrawingRef.current = false;
      } else {
        if (isDrawingRef.current && currentStrokeRef.current.length > 1) {
          onStrokeComplete({
            points: [...currentStrokeRef.current],
            color: currentColor,
            width: brushSize,
          });
        }
        currentStrokeRef.current = [];
        isDrawingRef.current = false;
      }

      lastGestureRef.current = gesture;
      render();
    }, [fingerPosition, gesture, currentColor, brushSize, onStrokeComplete, onErase, render]);

    // Re-render when strokes change (undo/clear)
    useEffect(() => {
      render();
    }, [strokes, render]);

    // Handle canvas resize
    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const resizeObserver = new ResizeObserver(() => {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        render();
      });

      resizeObserver.observe(canvas);
      return () => resizeObserver.disconnect();
    }, [render]);

    return (
      <canvas
        ref={canvasRef}
        data-testid="whiteboard-canvas"
        className="w-full h-full rounded-lg border border-border cursor-crosshair"
      />
    );
  }
);

WhiteboardCanvas.displayName = 'WhiteboardCanvas';

export default WhiteboardCanvas;
