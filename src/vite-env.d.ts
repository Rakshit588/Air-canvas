/// <reference types="vite/client" />

interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

interface HandResults {
  multiHandLandmarks?: HandLandmark[][];
  multiHandedness?: { label: string; score: number }[];
  image: HTMLVideoElement;
}

interface HandsOptions {
  maxNumHands?: number;
  modelComplexity?: number;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
}

declare class Hands {
  constructor(config: { locateFile: (file: string) => string });
  setOptions(options: HandsOptions): void;
  onResults(callback: (results: HandResults) => void): void;
  send(input: { image: HTMLVideoElement }): Promise<void>;
  close(): void;
}

declare class Camera {
  constructor(
    videoElement: HTMLVideoElement,
    config: {
      onFrame: () => Promise<void>;
      width?: number;
      height?: number;
    }
  );
  start(): Promise<void>;
  stop(): void;
}

declare function drawConnectors(
  ctx: CanvasRenderingContext2D,
  landmarks: HandLandmark[],
  connections: [number, number][],
  style: { color?: string; lineWidth?: number }
): void;

declare function drawLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: HandLandmark[],
  style: { color?: string; lineWidth?: number; radius?: number }
): void;

declare const HAND_CONNECTIONS: [number, number][];
