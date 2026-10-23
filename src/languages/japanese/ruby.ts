/**
 * Furigana in Aozora Bunko notation: `私《わたし》`, or `｜十米《メートル》` when the base is not
 * the whole run of kanji before the reading. Readings come from the source text, not from software.
 */
export interface RubySegment {
  text: string;
  /** The reading shown above `text`. */
  reading?: string;
}

const RUBY = /(?:｜([^《》｜\n]+)|([一-鿿々〆ヵヶ]+))《([^》\n]+)》/g;

export function parseRuby(input: string): RubySegment[] {
  const segments: RubySegment[] = [];
  let last = 0;
  for (const match of input.matchAll(RUBY)) {
    const [whole, marked, run, reading] = match;
    const base = marked ?? run!;
    if (match.index > last) segments.push({ text: input.slice(last, match.index) });
    segments.push({ text: base, reading });
    last = match.index + whole.length;
  }
  if (last < input.length) segments.push({ text: input.slice(last) });
  return segments.map((s) => ({ ...s, text: s.text.replaceAll("｜", "") })).filter((s) => s.text !== "");
}

/** The text without readings: what is spoken and what is compared. */
export function stripRuby(input: string): string {
  return parseRuby(input)
    .map((s) => s.text)
    .join("");
}
