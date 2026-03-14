import { Undo2, Trash2, Download, Minus, Plus, Pipette } from 'lucide-react';
import { useState } from 'react';

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
  const [customHex, setCustomHex] = useState('');

  const handleHexSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = customHex.startsWith('#') ? customHex : `#${customHex}`;
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      onColorChange(val);
      setCustomHex('');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Colors */}
      <div>
        <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">Color</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {NEON_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => onColorChange(c.value)}
              data-testid={`color-swatch-${c.name.toLowerCase()}`}
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

          {/* Native color picker */}
          <label
            className="w-8 h-8 rounded-full border-2 border-border hover:border-muted-foreground flex items-center justify-center cursor-pointer transition-all overflow-hidden"
            title="Custom color"
          >
            <input
              type="color"
              value={currentColor}
              onChange={(e) => onColorChange(e.target.value)}
              className="opacity-0 absolute w-0 h-0"
              data-testid="input-color-native"
            />
            <Pipette className="w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          </label>
        </div>

        {/* Hex input */}
        <form onSubmit={handleHexSubmit} className="flex gap-1.5">
          <input
            type="text"
            value={customHex}
            onChange={(e) => setCustomHex(e.target.value)}
            placeholder="#hex"
            maxLength={7}
            data-testid="input-custom-hex"
            className="flex-1 min-w-0 px-2 py-1.5 rounded-md border border-border bg-secondary text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60"
          />
          <button
            type="submit"
            data-testid="button-apply-hex"
            className="px-2 py-1.5 rounded-md border border-border bg-secondary hover:bg-muted text-xs font-mono text-foreground transition-colors"
          >
            Apply
          </button>
        </form>

        {/* Current color preview */}
        <div
          className="mt-2 h-1.5 w-full rounded-full"
          style={{ backgroundColor: currentColor, boxShadow: `0 0 8px ${currentColor}` }}
        />
      </div>

      {/* Brush Size */}
      <div>
        <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">
          Brush: {brushSize}px
        </p>
        <div className="flex items-center gap-2">
          <button
            data-testid="button-brush-decrease"
            onClick={() => onBrushSizeChange(Math.max(1, brushSize - 1))}
            className="p-1.5 rounded-md border border-border bg-secondary hover:bg-muted transition-colors text-foreground"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <input
            type="range"
            min={1}
            max={20}
            value={brushSize}
            onChange={(e) => onBrushSizeChange(Number(e.target.value))}
            className="flex-1 accent-primary"
            data-testid="input-brush-size"
          />
          <button
            data-testid="button-brush-increase"
            onClick={() => onBrushSizeChange(Math.min(20, brushSize + 1))}
            className="p-1.5 rounded-md border border-border bg-secondary hover:bg-muted transition-colors text-foreground"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Brush preview dot */}
        <div className="flex justify-center mt-2">
          <div
            className="rounded-full"
            style={{
              width: brushSize,
              height: brushSize,
              backgroundColor: currentColor,
              boxShadow: `0 0 ${brushSize * 2}px ${currentColor}`,
              minWidth: 2,
              minHeight: 2,
            }}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <button
          data-testid="button-undo"
          onClick={onUndo}
          disabled={!canUndo}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary hover:bg-muted transition-colors text-sm font-mono text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Undo2 className="w-4 h-4" />
          Undo
        </button>
        <button
          data-testid="button-clear"
          onClick={onClear}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-destructive/30 bg-destructive/10 hover:bg-destructive/20 transition-colors text-sm font-mono text-destructive"
        >
          <Trash2 className="w-4 h-4" />
          Clear Board
        </button>
        <button
          data-testid="button-save"
          onClick={onSave}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 transition-colors text-sm font-mono text-primary"
        >
          <Download className="w-4 h-4" />
          Save Image
        </button>
      </div>

      {/* Gesture Guide */}
      <div className="border-t border-border pt-4">
        <p className="text-xs font-mono text-muted-foreground mb-2 uppercase tracking-wider">Gesture Guide</p>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-base">☝️</span>
            <span className="text-muted-foreground">Index finger</span>
            <span className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">DRAW</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">✊</span>
            <span className="text-muted-foreground">Closed fist</span>
            <span className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20">ERASE</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">✌️</span>
            <span className="text-muted-foreground">Two fingers</span>
            <span className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">NAV</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">🖐️</span>
            <span className="text-muted-foreground">Open palm</span>
            <span className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20">PAUSE</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">👍</span>
            <span className="text-muted-foreground">Thumbs up</span>
            <span className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">CLEAR</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">🖖</span>
            <span className="text-muted-foreground">4 fingers</span>
            <span className="ml-auto font-mono text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">SAVE</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToolbarPanel;
