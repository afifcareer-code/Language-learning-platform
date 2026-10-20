import hiraganaFile from "@data/japanese/characters/hiragana.json";
import katakanaFile from "@data/japanese/characters/katakana.json";
import confusionFile from "@data/japanese/confusion/kana.json";
import {
  KANA_SCRIPTS,
  kanaItemId,
  kanaItemKey,
  normalizeRomaji,
  type KanaCharacter,
  type KanaScript,
} from "./kana";

/**
 * In-memory lookups over the bundled kana data, used for grading and for
 * choosing practice distractors. The database remains the source for
 * learner-facing content; this mirrors the same files.
 */

const files: Record<KanaScript, { characters: KanaCharacter[] }> = {
  hiragana: hiraganaFile,
  katakana: katakanaFile,
};

/** romaji (canonical or alternate) → item id, per script. */
const idByRomaji = new Map<KanaScript, Map<string, string>>();
/** "hiragana:あ" → item id */
const idByKey = new Map<string, string>();

for (const script of KANA_SCRIPTS) {
  const map = new Map<string, string>();
  for (const c of files[script].characters) {
    const id = kanaItemId(script, c.romaji);
    for (const r of [c.romaji, ...(c.alternateRomaji ?? [])]) if (!map.has(r)) map.set(r, id);
    idByKey.set(kanaItemKey(script, c.kana), id);
  }
  idByRomaji.set(script, map);
}

const confusables = new Map<string, string[]>();
for (const [a, b] of confusionFile.pairs as [string, string][]) {
  const idA = idByKey.get(a);
  const idB = idByKey.get(b);
  if (!idA || !idB) continue;
  confusables.set(idA, [...(confusables.get(idA) ?? []), idB]);
  confusables.set(idB, [...(confusables.get(idB) ?? []), idA]);
}

/** The item in `script` whose reading is `answer`, if any. */
export function kanaIdForRomaji(script: KanaScript, answer: string): string | undefined {
  return idByRomaji.get(script)?.get(normalizeRomaji(answer));
}

/** Kana commonly confused with this item, from curated data. */
export function knownConfusables(itemId: string): string[] {
  return confusables.get(itemId) ?? [];
}
