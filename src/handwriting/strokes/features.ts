import type { Stroke, StrokePoint } from "./types";

export type CompassDirection = "E" | "SE" | "S" | "SW" | "W" | "NW" | "N" | "NE";

export interface StrokeFeatures {
  index: number;
  start: { x: number; y: number };
  end: { x: number; y: number };
  /** Overall direction from start to end, in radians (screen coordinates, y down). */
  angle: number;
  direction: CompassDirection;
  /** Path length in normalised units. */
  length: number;
  durationMs: number;
  /** Normalised units per second; 0 for instantaneous strokes. */
  averageVelocity: number;
  averagePressure: number | null;
}

const COMPASS: CompassDirection[] = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];

export function compassDirection(angle: number): CompassDirection {
  const octant = Math.round(angle / (Math.PI / 4));
  return COMPASS[((octant % 8) + 8) % 8]!;
}

function distance(a: StrokePoint, b: StrokePoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function strokeFeatures(stroke: Stroke): StrokeFeatures | null {
  const first = stroke.points[0];
  const last = stroke.points[stroke.points.length - 1];
  if (!first || !last) return null;

  let length = 0;
  for (let i = 1; i < stroke.points.length; i++) {
    length += distance(stroke.points[i - 1]!, stroke.points[i]!);
  }

  const angle = Math.atan2(last.y - first.y, last.x - first.x);
  const durationMs = Math.max(0, last.t - first.t);
  const pressures = stroke.points.map((p) => p.pressure).filter((p): p is number => p !== null);

  return {
    index: stroke.index,
    start: { x: first.x, y: first.y },
    end: { x: last.x, y: last.y },
    angle,
    direction: compassDirection(angle),
    length,
    durationMs,
    averageVelocity: durationMs > 0 ? length / (durationMs / 1000) : 0,
    averagePressure: pressures.length ? pressures.reduce((a, b) => a + b, 0) / pressures.length : null,
  };
}
