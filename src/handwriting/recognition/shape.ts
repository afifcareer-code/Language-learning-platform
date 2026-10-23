import type { WritingSample } from "../strokes/types";

/**
 * Shape similarity between what was drawn and a reference glyph.
 *
 * This measures how closely a drawing follows a reference glyph: precision.
 * It is NOT a handwriting recogniser. Measured on kana, a sloppy copy of the
 * right character does not reliably score higher than a neat copy of another
 * one, so it must never decide which character was written. It does not judge
 * stroke order or direction either. Both the drawing and the reference are
 * scaled to their own bounding box, so the result does not depend on where on
 * the canvas the learner wrote or how large; it compares overall form only.
 */

export interface ReferencePoint {
  x: number;
  y: number;
}

/** The check id reported for localized feedback. */
export const SHAPE_CHECK = "shape";

/** Distance, as a share of the character's size, within which a drawn point counts as on the glyph. */
const ON_GLYPH = 0.09;
/** Distance within which a part of the glyph counts as covered by the drawing. */
const COVERED = 0.14;
/** Spacing of the points the drawing is resampled to, so long strokes do not outweigh short ones. */
const STEP = 0.02;
/** Coverage is measured on a coarse grid over the glyph, so thick reference ink is not over-counted. */
const CELLS = 12;

function boundsOf(points: readonly ReferencePoint[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX, minY, width: Math.max(maxX - minX, 1e-6), height: Math.max(maxY - minY, 1e-6) };
}

/** Scale points to the unit square, keeping the aspect ratio so tall and wide characters stay different. */
export function normalizePoints(points: readonly ReferencePoint[]): ReferencePoint[] {
  if (points.length === 0) return [];
  const b = boundsOf(points);
  const size = Math.max(b.width, b.height);
  const offsetX = (size - b.width) / 2;
  const offsetY = (size - b.height) / 2;
  return points.map((p) => ({ x: (p.x - b.minX + offsetX) / size, y: (p.y - b.minY + offsetY) / size }));
}

/** Points along every stroke at an even spacing (in the stroke's own coordinates). */
function resample(sample: WritingSample): ReferencePoint[] {
  const out: ReferencePoint[] = [];
  for (const stroke of sample.strokes) {
    const pts = stroke.points;
    if (pts.length === 0) continue;
    out.push({ x: pts[0]!.x, y: pts[0]!.y });
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const n = Math.max(1, Math.round(d / STEP));
      for (let k = 1; k <= n; k++)
        out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
    }
  }
  return out;
}

function nearest(p: ReferencePoint, set: readonly ReferencePoint[]): number {
  let best = Infinity;
  for (const q of set) {
    const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/**
 * How closely the drawing follows the reference glyph, from 0 to 1:
 * the share of the drawing that lies on the glyph, combined with the share of
 * the glyph that the drawing covers (so a single scribble over part of it, or
 * a drawing far larger than the glyph, both score low).
 *
 * `reference` is the glyph's ink as points in any common scale. Returns null
 * when either side has too little to compare.
 */
export function shapeSimilarity(sample: WritingSample, reference: readonly ReferencePoint[]): number | null {
  const drawn = normalizePoints(resample(sample));
  const glyph = normalizePoints(reference);
  if (drawn.length < 2 || glyph.length < 2) return null;

  const onGlyph = drawn.filter((p) => nearest(p, glyph) <= ON_GLYPH).length / drawn.length;

  const cells = new Map<number, ReferencePoint>();
  for (const p of glyph) {
    const cx = Math.min(CELLS - 1, Math.floor(p.x * CELLS));
    const cy = Math.min(CELLS - 1, Math.floor(p.y * CELLS));
    cells.set(cy * CELLS + cx, { x: (cx + 0.5) / CELLS, y: (cy + 0.5) / CELLS });
  }
  const centres = [...cells.values()];
  const covered = centres.filter((c) => nearest(c, drawn) <= COVERED).length / centres.length;

  if (onGlyph + covered === 0) return 0;
  return (2 * onGlyph * covered) / (onGlyph + covered);
}
