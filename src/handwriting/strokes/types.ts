/**
 * Device-independent handwriting data.
 *
 * Coordinates are normalised to [0, 1] relative to the writing area so
 * samples captured on different screens are comparable.
 */

export interface StrokePoint {
  x: number;
  y: number;
  /** Milliseconds since the sample started. */
  t: number;
  /** Pen pressure in [0, 1]; null when the device does not report it. */
  pressure: number | null;
}

export type PointerKind = "pen" | "touch" | "mouse" | "unknown";

export interface Stroke {
  /** Order in which the stroke was drawn, from 0. */
  index: number;
  pointerType: PointerKind;
  points: StrokePoint[];
}

export interface WritingSample {
  strokes: Stroke[];
  /** Pixel size of the writing area at capture time (for reference only). */
  width: number;
  height: number;
  capturedAt: string;
}
