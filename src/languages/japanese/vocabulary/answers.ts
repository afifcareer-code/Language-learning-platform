import { normalizeRomaji } from "../scripts/kana";
import type { VocabularyItemData } from "./schema";

/** Kana answers ignore spaces, the 〜 affix marker and full-width spaces. */
function normalizeKana(input: string): string {
  return input.normalize("NFKC").replace(/[\s〜~・]/g, "");
}

/** Romaji answers ignore case, spaces, hyphens and apostrophes ("yoroshiku onegaishimasu" = "yoroshikuonegaishimasu"). */
function normalizeRomajiWord(input: string): string {
  return normalizeRomaji(input).replace(/[-']/g, "");
}

/** Accepts the word in kana (as written), in its kanji spelling, or in romaji. */
export function checkVocabularyAnswer(
  word: Pick<VocabularyItemData, "kana" | "kanji" | "romaji" | "alternateRomaji">,
  answer: string,
): boolean {
  const kana = normalizeKana(answer);
  if (kana && [word.kana, word.kanji].some((w) => w !== undefined && normalizeKana(w) === kana)) return true;
  const romaji = normalizeRomajiWord(answer);
  return (
    romaji.length > 0 &&
    [word.romaji, ...(word.alternateRomaji ?? [])].some((r) => normalizeRomajiWord(r) === romaji)
  );
}
