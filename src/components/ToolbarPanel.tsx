import { Undo2, Trash2, Download, Minus, Plus } from 'lucide-react';

const NEON_COLORS = [
  { name: 'Cyan', value: '#00ffff' },
  { name: 'Magenta', value: '#ff00ff' },
  { name: 'Green', value: '#39ff14' },
  { name: 'Yellow', value: '#ffff00' },
  { name: 'Orange', value: '#ff6600' },
  { name: 'Red', value: '#ff3333' },
  { name: 'White', value: '#ffffff' },
];

interface ToolbarPanelProps {
  currentColor: string;
  brushSize: number;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  onUndo: () => void;
  onClear: () => void;
  onSave: () => void;
  canUndo: boolean;
}

const ToolbarPanel = ({
  currentColor,
  brushSize,
  onColorChange,
  onBrushSizeChange,
  onUndo,
  onClear,
  onSave,
  canUndo,
}: ToolbarPanelProps) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Colors */}
      <div>
        <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">Color</p>
        <div className="flex flex-wrap gap-2">
          {NEON_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => onColorChange(c.value)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                currentColor === c.value
                  ? 'border-foreground scale-110'
                  : 'border-border hover:border-muted-foreground'
              }`}
              style={{
                backgroundColor: c.value,
                boxShadow: currentColor === c.value ? `0 0 12px ${c.value}` : 'none',
              }}
              title={c.name}
            />
          ))}
        </div>
      </div>

      {/* Brush Size */}
      <div>
        <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">
          Brush: {brushSize}px
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onBrushSizeChange(Math.max(1, brushSize - 1))}
            className="p-1.5 rounded-md border border-border bg-secondary hover:bg-muted transition-colors text-foreground"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min={1}
            max={12}
            value={brushSize}
            onChange={(e) => onBrushSizeChange(Number(e.target.value))}
            className="flex-1 accent-primary"
          />
          <button
            onClick={() => onBrushSizeChange(Math.min(12, brushSize + 1))}
            className="p-1.5 rounded-md border border-border bg-secondary hover:bg-muted transition-colors text-foreground"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary hover:bg-muted transition-colors text-sm font-mono text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Undo2 className="w-4 h-4" />
          Undo
        </button>
        <button
          onClick={onClear}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 transition-colors text-sm font-mono text-destructive"
        >
          <Trash2 className="w-4 h-4" />
          Clear Board
        </button>
        <button
          onClick={onSave}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-colors text-sm font-mono text-primary"
        >
          <Download className="w-4 h-4" />
          Save Image
        </button>
      </div>

      {/* Gesture Guide */}
      <div className="border-t border-border pt-4">
        <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">Gestures</p>
        <div className="space-y-1.5 text-xs text-muted-foreground">
          <p>☝️ <span className="text-foreground">Index finger</span> → Draw</p>
          <p>✊ <span className="text-foreground">Closed fist</span> → Erase</p>
          <p>✌️ <span className="text-foreground">Two fingers</span> → Navigate</p>
          <p>🖐️ <span className="text-foreground">Open palm</span> → Pause</p>
        </div>
      </div>
    </div>
  );
};

export default ToolbarPanel;
