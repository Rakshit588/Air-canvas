interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
}

export class LandmarkSmoother {
  private smoothed: LandmarkPoint[] | null = null;
  private alpha: number;

  constructor(alpha = 0.5) {
    this.alpha = alpha;
  }

  smooth(landmarks: LandmarkPoint[]): LandmarkPoint[] {
    if (!this.smoothed || this.smoothed.length !== landmarks.length) {
      this.smoothed = landmarks.map((l) => ({ ...l }));
      return this.smoothed;
    }

    this.smoothed = landmarks.map((l, i) => ({
      x: this.alpha * l.x + (1 - this.alpha) * this.smoothed![i].x,
      y: this.alpha * l.y + (1 - this.alpha) * this.smoothed![i].y,
      z: this.alpha * l.z + (1 - this.alpha) * this.smoothed![i].z,
    }));

    return this.smoothed;
  }

  reset() {
    this.smoothed = null;
  }
}
