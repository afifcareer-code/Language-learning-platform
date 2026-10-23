import { SpeakButton } from "@/audio/speak-button";
import type { ContentItem } from "@/core/learning";
import { Card, CardTitle } from "@/components/ui/card";
import { PlayableKanaGrid } from "@/features/kana/playable-kana-grid";
import { toKanaViews } from "@/features/kana/kana-view";
import { isGrammarData, type GrammarTranslation } from "@/languages/japanese/grammar/schema";
import {
  isVocabularyData,
  vocabularyDisplay,
  type VocabularyTranslation,
} from "@/languages/japanese/vocabulary/schema";

/**
 * The "Learn" part of a Japanese lesson: the content to read and listen to
 * before any activity. Kana lessons show their characters; vocabulary lessons
 * show words with a romaji scaffold, and grammar points with examples.
 */
export function JapaneseLessonContent({
  items,
  translations,
  labels,
}: {
  items: readonly ContentItem[];
  translations: ReadonlyMap<string, unknown>;
  labels: {
    characters: string;
    vocabulary: string;
    grammar: string;
    examples: string;
    commonErrors: string;
    romajiNote: string;
  };
}) {
  const kana = toKanaViews(items);
  const words = items.filter((i) => isVocabularyData(i.data));
  const grammar = items.filter((i) => isGrammarData(i.data));

  return (
    <div className="grid gap-4 md:gap-6">
      {kana.length > 0 && (
        <Card>
          <CardTitle className="mb-4">{labels.characters}</CardTitle>
          <div className="max-w-md">
            <PlayableKanaGrid items={kana} />
          </div>
        </Card>
      )}

      {words.length > 0 && (
        <Card>
          <CardTitle>{labels.vocabulary}</CardTitle>
          <p className="mt-1 text-sm text-muted">{labels.romajiNote}</p>
          <ul className="mt-4 grid gap-x-6 sm:grid-cols-2">
            {words.map((item) => {
              if (!isVocabularyData(item.data)) return null;
              const word = item.data;
              const meaning = (translations.get(item.id) as VocabularyTranslation | undefined)?.meaning;
              const shown = vocabularyDisplay(word);
              return (
                <li key={item.id} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
                  <SpeakButton text={word.kana} lang="ja" className="size-10 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span lang="ja" className="font-jp text-xl">
                        {shown}
                      </span>
                      {word.kanji && (
                        <span lang="ja" className="font-jp text-muted">
                          {word.kanji}
                        </span>
                      )}
                      <span className="text-sm text-muted italic">{word.romaji}</span>
                    </span>
                    {meaning && <span className="block text-sm">{meaning}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {grammar.length > 0 && (
        <section className="grid gap-4">
          <h3 className="text-lg font-semibold">{labels.grammar}</h3>
          {grammar.map((item) => {
            if (!isGrammarData(item.data)) return null;
            const point = item.data;
            const text = translations.get(item.id) as GrammarTranslation | undefined;
            return (
              <Card key={item.id}>
                <p lang="ja" className="font-jp text-xl font-semibold">
                  {point.pattern}
                </p>
                {text?.meaning && <p className="mt-1 font-medium">{text.meaning}</p>}
                {text?.explanation && <p className="mt-2 text-muted">{text.explanation}</p>}
                <p className="mt-4 text-xs font-semibold tracking-wide text-muted uppercase">
                  {labels.examples}
                </p>
                <ul className="mt-2 grid gap-3">
                  {point.examples.map((example, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <SpeakButton text={example.ja} lang="ja" className="size-10 shrink-0" />
                      <span>
                        <span lang="ja" className="block font-jp text-lg">
                          {example.ja}
                        </span>
                        {example.romaji && (
                          <span className="block text-sm text-muted italic">{example.romaji}</span>
                        )}
                        {text?.examples[i] && <span className="block text-sm">{text.examples[i]}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
                {text?.commonErrors.length ? (
                  <>
                    <p className="mt-4 text-xs font-semibold tracking-wide text-muted uppercase">
                      {labels.commonErrors}
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                      {text.commonErrors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </Card>
            );
          })}
        </section>
      )}
    </div>
  );
}
