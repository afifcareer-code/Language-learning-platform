/**
 * The header of every practice session: what this is, what the learner
 * should be able to do afterwards, and how success is judged.
 */
export function PracticePrompt({
  context,
  eyebrow,
  title,
  objective,
  labels,
  criteria,
  explanation,
}: {
  /** Where the learner is, e.g. "Japanese · Foundation · Lesson 1 · Hiragana: Vowels". */
  context?: string;
  eyebrow: string;
  title: string;
  objective: string;
  labels: { objective: string; criteria: string; why: string };
  criteria?: string[];
  explanation?: string;
}) {
  return (
    <header className="mb-6">
      {context && <p className="text-sm leading-snug text-muted">{context}</p>}
      <p className="mt-1 text-sm font-medium text-muted">{eyebrow}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
      <div className="mt-3 rounded-xl bg-accent-soft px-4 py-3 text-accent">
        <p className="text-xs font-semibold tracking-wide uppercase">{labels.objective}</p>
        <p className="mt-1">{objective}</p>
      </div>
      {(criteria?.length || explanation) && (
        <details className="mt-2 text-sm text-muted">
          <summary className="cursor-pointer py-2">
            {labels.criteria}
            {explanation ? ` · ${labels.why}` : ""}
          </summary>
          {criteria && (
            <ul className="list-disc space-y-0.5 pl-5">
              {criteria.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          )}
          {explanation && <p className="mt-2">{explanation}</p>}
        </details>
      )}
    </header>
  );
}
