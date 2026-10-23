import type { ReferencePoint } from "./shape";

const SIZE = 64;

/** Ink of `text` drawn at `SIZE`px, as a grid of booleans. Null without a 2D canvas. */
function inkMask(text: string, fontFamily: string): boolean[] | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${Math.round(SIZE * 0.72)}px ${fontFamily}`;
  ctx.fillText(text, SIZE / 2, SIZE / 2);
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
  const mask: boolean[] = [];
  for (let i = 3; i < data.length; i += 4) mask.push(data[i]! > 127);
  return mask;
}

/**
 * The ink of a character as points, for comparing a drawing with it. The
 * glyph comes from the learner's own fonts, the same ones that draw the guide
 * behind the writing area.
 *
 * Returns null when it cannot be trusted: no canvas, nothing drawn, or the
 * font has no glyph for the character (the browser would draw its "missing
 * character" box, which every unknown character shares).
 */
export function glyphReference(text: string, fontFamily: string): ReferencePoint[] | null {
  const mask = inkMask(text, fontFamily);
  if (!mask) return null;
  const ink = mask.filter(Boolean).length;
  if (ink < SIZE) return null;

  // A private-use character no font covers: whatever it draws is the "missing glyph".
  const missing = inkMask("\u{10FFFE}", fontFamily);
  if (missing) {
    const same = mask.filter((on, i) => on && missing[i]).length;
    const missingInk = missing.filter(Boolean).length;
    if (missingInk > 0 && same / Math.max(ink, missingInk) > 0.9) return null;
  }

  const points: ReferencePoint[] = [];
  for (let y = 0; y < SIZE; y += 2) {
    for (let x = 0; x < SIZE; x += 2) {
      if (mask[y * SIZE + x]) points.push({ x: x / SIZE, y: y / SIZE });
    }
  }
  return points;
}
