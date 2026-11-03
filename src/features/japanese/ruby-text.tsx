import { parseRuby } from "@/languages/japanese/ruby";

/** Japanese text with furigana: readings written as 漢字《よみ》 are shown above their kanji. */
export function RubyText({ text }: { text: string }) {
  const segments = parseRuby(text);
  if (segments.every((s) => !s.reading)) return <>{text}</>;
  return (
    <>
      {segments.map((s, i) =>
        s.reading ? (
          <ruby key={i}>
            {s.text}
            <rp>(</rp>
            <rt>{s.reading}</rt>
            <rp>)</rp>
          </ruby>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </>
  );
}
