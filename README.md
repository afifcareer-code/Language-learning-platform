# Language Learning Platform

An open-source adaptive language learning platform focused on mastery, active recall, progressive practice, and personalized learning.

**Japanese is currently the first supported language.**

> **Status: early development (v0.1).** The core learning engine, the Japanese kana module and the handwriting foundation work end to end. Expect breaking changes. See the [roadmap](docs/product/roadmap.md).

## Why another learning app?

Most learning apps measure activity: lessons completed, minutes spent, streaks kept. This project measures what you can **remember, understand, produce, and retain**.

```
Recognition → Understanding → Recall → Production → Automaticity → Retention
```

Mastery here is earned through recall over time. It is never derived from lesson completion. An item counts as proficient only after you have recalled it correctly following a real gap of days, so cramming cannot fake it. Read more in [Learning philosophy](docs/product/learning-philosophy.md).

## Features

Working in v0.1:

- **Kana reading (active recall).** You see a character and type its reading. There is no multiple choice.
- **Handwriting practice.** Pen, touch and mouse input are captured through the Pointer Events API, with optional pressure. Guidance fades as mastery grows: Trace → Faded guide → Hint only → From memory.
- **Mastery engine.** Six states per item per skill: Not started, Learning, Practicing, Proficient, Mastered, Needs review.
- **Spaced review.** A Leitner scheduler with intervals of 10 minutes, then 1, 3, 7, 14, 30 and 90 days. It is pluggable, so SM-2 or FSRS can replace it later.
- **Recommendations.** A rule-based answer to "what should I do next?": due reviews first, then weak items, then the next lesson.
- **Progress.** Per-character mastery grids and your learning history.
- **Data-driven content.** All Japanese content lives in validated JSON files under [`data/`](data/japanese).
- **Responsive, tablet-first UI** with automatic light and dark themes.

## Current language

| Language          | Status      | Scope                                                |
| ----------------- | ----------- | ---------------------------------------------------- |
| Japanese (日本語) | In progress | Hiragana and katakana (46 + 46), reading and writing |

The core engine is language-agnostic. Japanese concepts such as kana, kanji and JLPT live only in the Japanese module. See [Language system](docs/architecture/language-system.md).

## Screenshots

_Screenshots will be added once the UI stabilises._

## Architecture overview

```
src/
├── core/            Language-agnostic learning engine (pure TypeScript)
│   ├── learning/    Shared types and the LanguageModule contract
│   ├── mastery/     Mastery states derived from evidence
│   ├── review/      Spaced-repetition scheduling
│   ├── assessment/  Definition / attempt / result model
│   ├── recommendation/
│   └── analytics/
├── languages/
│   └── japanese/    First language module (kana, skills, content schemas)
├── handwriting/     Stroke capture, features, analysis, scoring, guidance
├── audio/           Browser speech synthesis
├── server/          Database (Drizzle + SQLite/libSQL), repositories, services
├── features/        Feature UI (practice sessions, kana views)
├── components/      Shared UI primitives and app shell
└── app/             Next.js routes and server actions
```

The core engine has no dependency on Japanese, the database or React. Lint rules and an architecture test enforce this. Read more in [Architecture overview](docs/architecture/overview.md).

**Stack:** Next.js (App Router) · React · TypeScript · SQLite via libSQL + Drizzle ORM · Tailwind CSS · Vitest · Playwright.

## Getting started

Requirements: **Node.js 20.9+** (22 recommended) and npm.

```bash
git clone https://github.com/afifcareer-code/language-learning-platform.git
cd language-learning-platform
npm install
cp .env.example .env        # optional; defaults work out of the box
npm run db:setup            # create the SQLite database and load content
npm run dev                 # http://localhost:3000
```

There are no external services to run. The database is a single file in `.data/`.

## Development

| Command                              | Purpose                                        |
| ------------------------------------ | ---------------------------------------------- |
| `npm run dev`                        | Start the dev server                           |
| `npm run lint` / `npm run typecheck` | Static checks                                  |
| `npm test`                           | Unit and integration tests (Vitest)            |
| `npm run test:e2e`                   | End-to-end tests (Playwright)                  |
| `npm run content:validate`           | Validate content files                         |
| `npm run db:generate`                | Generate a migration after changing the schema |
| `npm run db:setup`                   | Apply migrations and seed content              |

See [Setup](docs/development/setup.md) and [Testing](docs/development/testing.md).

## Roadmap

Next up: a kana assessment, dakuten and combination kana, stroke-order data, then vocabulary and kanji. See the [full roadmap](docs/product/roadmap.md).

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md). To report a security problem, see [SECURITY.md](SECURITY.md).

## License

[Apache License 2.0](LICENSE). It is permissive and includes an explicit patent grant, which suits a project that may grow to include algorithms such as handwriting analysis and scheduling. See [Why Apache 2.0](CONTRIBUTING.md#license).

Suggested GitHub topics: `language-learning`, `language-education`, `adaptive-learning`, `mastery-learning`, `active-recall`, `spaced-repetition`, `edtech`, `open-source`, `learning-platform`, `handwriting`, `japanese-learning`.
