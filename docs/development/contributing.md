# Contribution workflow

This page adds practical detail to the top-level [CONTRIBUTING.md](../../CONTRIBUTING.md).

## Branches and commits

- Branch from `main`, for example `feat/kana-assessment` or `fix/romaji-normalisation`.
- Keep pull requests focused. One concern per pull request is easier to review.
- Conventional Commit prefixes are encouraged: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `content`.

## Checks

CI runs the following on every pull request:

```bash
npm run lint
npm run typecheck
npm run content:validate
npm test
npm run build
```

Run them locally before pushing. Run `npm run test:e2e` as well when you change UI flows.

## Where things go

| You are adding…                                | Put it in…                                                             |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| A learning rule that applies to every language | `src/core/*`, with unit tests                                          |
| Something Japanese-specific                    | `src/languages/japanese/*`                                             |
| Content (characters, lessons)                  | `data/japanese/*`, then run `npm run content:validate`                 |
| A handwriting analyzer                         | `src/handwriting/recognition`, implementing `HandwritingAnalyzer`      |
| A database change                              | All three files in `src/server/db/schema/`, then `npm run db:generate` |
| A page                                         | `src/app/<route>/page.tsx`, with feature UI in `src/features`          |
| A reusable UI primitive                        | `src/components/ui`                                                    |

## UI guidelines

- Tablet first: touch targets of at least 48px (`min-h-12`), with layouts that work from 360px wide upward.
- Use design tokens (`bg-surface`, `text-muted`, `text-accent`, …) instead of raw colours, so light and dark themes stay consistent.
- Keep Japanese influence subtle: typography and restraint, not motifs or flags.
- Do not show navigation or controls for features that do not work yet.

## Content guidelines

- Every content change must keep `npm run content:validate` green.
- Cite sources for linguistic data in the file's `source` field.
- Only add data you can license under Apache 2.0 (see the licensing note in CONTRIBUTING.md).
