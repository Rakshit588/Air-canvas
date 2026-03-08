export interface Point {
  x: number;
  y: number;
}

export class StrokeSmoother {
  private buffer: Point[] = [];
  private windowSize: number;

  constructor(windowSize = 5) {
    this.windowSize = windowSize;
  }

  smooth(point: Point): Point {
    this.buffer.push(point);
    if (this.buffer.length > this.windowSize) {
      this.buffer.shift();
    }

    const avg = this.buffer.reduce(
      (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
      { x: 0, y: 0 }
    );

    return {
      x: avg.x / this.buffer.length,
      y: avg.y / this.buffer.length,
    };
  }

  reset() {
    this.buffer = [];
  }
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
}
