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
  exportAsPDF: () => void;
  startRecording: () => void;
  stopRecording: () => void;
  isRecording: () => boolean;
}

const ERASER_RADIUS = 25;

const WhiteboardCanvas = forwardRef<WhiteboardHandle, WhiteboardCanvasProps>(
  ({ strokes, currentColor, brushSize, gesture, fingerPosition, onStrokeComplete, onErase }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const currentStrokeRef = useRef<Point[]>([]);
    const isDrawingRef = useRef(false);
    const lastGestureRef = useRef<GestureType>('none');
    const cursorRef = useRef<Point | null>(null);

    // Recording
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);
    const recordingRef = useRef(false);

    useImperativeHandle(ref, () => ({
      saveAsImage: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `gestureboard-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      },

      exportAsPDF: () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const dataUrl = canvas.toDataURL('image/png');
        const win = window.open('', '_blank');
        if (!win) return;
        win.document.write(`
          <!doctype html>
          <html>
            <head>
              <title>GestureBoard Notes — ${new Date().toLocaleDateString()}</title>
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
                h2 { font-family: monospace; font-size: 14px; color: #555; margin-bottom: 12px; }
                img { max-width: 100%; border: 1px solid #ccc; box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
                @media print { button { display: none !important; } }
              </style>
            </head>
            <body>
              <h2>GestureBoard — Lecture Notes &nbsp;|&nbsp; ${new Date().toLocaleString()}</h2>
              <img src="${dataUrl}" />
              <br/>
              <button onclick="window.print()" style="margin-top:16px;padding:8px 20px;font-family:monospace;cursor:pointer;">
                Save as PDF
              </button>
              <script>setTimeout(() => window.print(), 300);<\/script>
            </body>
          </html>
        `);
        win.document.close();
      },

      startRecording: () => {
        const canvas = canvasRef.current;
        if (!canvas || recordingRef.current) return;
        try {
          const stream = (canvas as any).captureStream(30) as MediaStream;
          const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : 'video/webm';
          const recorder = new MediaRecorder(stream, { mimeType });
          recordedChunksRef.current = [];

          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) recordedChunksRef.current.push(e.data);
          };

          recorder.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `gestureboard-lecture-${Date.now()}.webm`;
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
            recordedChunksRef.current = [];
          };

          recorder.start(100);
          mediaRecorderRef.current = recorder;
          recordingRef.current = true;
        } catch (err) {
          console.error('Failed to start recording:', err);
        }
      },

      stopRecording: () => {
        if (!recordingRef.current || !mediaRecorderRef.current) return;
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
        recordingRef.current = false;
      },

      isRecording: () => recordingRef.current,
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
          ctx.beginPath();
          ctx.arc(point.x, point.y, ERASER_RADIUS, 0, Math.PI * 2);
          ctx.strokeStyle = 'hsl(0, 100%, 60%)';
          ctx.lineWidth = 2;
          ctx.shadowBlur = 10;
          ctx.shadowColor = 'hsl(0, 100%, 60%)';
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(point.x - ERASER_RADIUS / 2, point.y);
          ctx.lineTo(point.x + ERASER_RADIUS / 2, point.y);
          ctx.moveTo(point.x, point.y - ERASER_RADIUS / 2);
          ctx.lineTo(point.x, point.y + ERASER_RADIUS / 2);
          ctx.stroke();
        } else {
          const dotRadius = Math.max(brushSize / 2, 4);
          ctx.beginPath();
          ctx.arc(point.x, point.y, dotRadius, 0, Math.PI * 2);
          ctx.fillStyle = currentColor;
          ctx.shadowBlur = 15;
          ctx.shadowColor = currentColor;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(point.x, point.y, dotRadius + 4, 0, Math.PI * 2);
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

      ctx.fillStyle = 'hsl(220, 20%, 7%)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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

      strokes.forEach((stroke) => drawStroke(ctx, stroke));

      if (currentStrokeRef.current.length > 1) {
        drawStroke(ctx, {
          points: currentStrokeRef.current,
          color: currentColor,
          width: brushSize,
        });
      }

      if (cursorRef.current) {
        drawCursor(ctx, cursorRef.current);
      }
    }, [strokes, currentColor, brushSize, drawStroke, drawCursor]);

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

    useEffect(() => {
      render();
    }, [strokes, render]);

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
