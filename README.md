# Language Learning Platform

An open-source adaptive language learning platform focused on mastery, active recall, progressive practice, and personalized learning.

**Japanese is currently the first supported language.** The platform is built so that more languages can be added as modules later, without rewriting the core. The interface is available in **Bahasa Indonesia** and **English**.

> **Status: early development (v0.1).** The core learning engine, the activity system, localization, the Japanese kana module and the handwriting foundation work end to end. Expect breaking changes. See the [roadmap](docs/product/roadmap.md).

## Why another learning app?

Most learning apps measure activity: lessons completed, minutes spent, streaks kept. This project measures what you can **remember, understand, produce, and retain**.

```
Recognition → Understanding → Recall → Production → Automaticity → Retention
```

Mastery here is earned through recall over time. It is never derived from lesson completion. An item counts as proficient only after you have recalled it correctly following a real gap of days, so cramming cannot fake it.

Every activity has a **measurable objective** ("Write か き く け こ from memory with the correct shape and number of strokes") and is tied to the curriculum, a skill, its evaluation, mastery and review. The learner always knows what they are learning, why, how they did and what to practise next. The loop is:

```
Learn → Practice → Measure → Review → Improve
```

Read more in [Learning philosophy](docs/product/learning-philosophy.md) and [Activity system](docs/architecture/activity-system.md).

## Features

Working in v0.1:

- **Activities with objectives.** Each lesson runs the learning loop: **recognize** (pick the sound), **recall** (type it with no options), **write** (by hand). Each activity has a localized, measurable objective, explicit success criteria, and a learning outcome at the end.
- **Handwriting practice.** Pen, touch and mouse input are captured through the Pointer Events API, with optional pressure. Guidance fades as mastery grows: Trace → Faded guide → Hint only → From memory.
- **Mastery engine.** Six states per item per skill: Not started, Learning, Practicing, Proficient, Mastered, Needs review.
- **Spaced review.** A Leitner scheduler with intervals of 10 minutes, then 1, 3, 7, 14, 30 and 90 days. It is pluggable, so SM-2 or FSRS can replace it later.
- **Three separate progress measures.** **Course progress** (what you have worked through), **skill mastery** (what you can reliably recall over time) and **learning readiness** (whether you are ready for the next lesson), each with its explanation.
- **Confusion pairs.** Mixing up two characters (シ/ツ, さ/ち) is detected from your answers, tracked, and practised in targeted sessions until resolved.
- **Explainable recommendations.** Every suggestion says why: due for review, recent mistakes, confused pair, or next in your curriculum.
- **Progress.** Per-character mastery grids, commonly confused pairs, and your learning history.
- **Localization.** Interface in Indonesian and English (switchable in Settings), and localized learning content. The UI language, content translations and the language being learned are three separate concerns ([Localization](docs/architecture/localization.md)).
- **Data-driven content.** All Japanese content lives in validated JSON files under [`data/`](data/japanese).
- **Responsive, tablet-first UI** with automatic light and dark themes.

## Current language

| Language          | Status      | Scope                                                          |
| ----------------- | ----------- | -------------------------------------------------------------- |
| Japanese (日本語) | In progress | Hiragana and katakana (46 + 46): recognition, reading, writing |

The core engine is language-agnostic. Japanese concepts such as kana, kanji and JLPT live only in the Japanese module. See [Language system](docs/architecture/language-system.md).

## Screenshots

_Screenshots will be added once the UI stabilises._

## Architecture overview

```
src/
├── core/            Language-agnostic learning engine (pure TypeScript)
│   ├── learning/    Shared types and the LanguageModule contract
│   ├── activities/  Activities, objectives, success criteria, outcomes
│   ├── mastery/     Mastery states derived from evidence
│   ├── review/      Spaced-repetition scheduling
│   ├── assessment/  Definition / attempt / result model
│   ├── recommendation/
│   └── analytics/   Progress, readiness, confusion pairs
├── languages/
│   └── japanese/    First language module (kana, skills, messages, content schemas)
├── localization/    Locales, translator, locale negotiation
├── handwriting/     Stroke capture, features, analysis, scoring, guidance
├── audio/           Browser speech synthesis
├── server/          Database (Drizzle; MySQL, PostgreSQL or SQLite), repositories, services
├── features/        Feature UI (practice sessions, kana views)
├── components/      Shared UI primitives and app shell
└── app/             Next.js routes and server actions
locales/             UI messages per locale (id, en)
data/                Learning content (characters, curriculum, activity templates)
```

The core engine has no dependency on Japanese, the database or React. Lint rules and an architecture test enforce this. Read more in [Architecture overview](docs/architecture/overview.md).

**Stack:** Next.js (App Router) · React · TypeScript · Drizzle ORM with MySQL/MariaDB, PostgreSQL or SQLite · Tailwind CSS · Vitest · Playwright.

## Getting started

Requirements: **Node.js 20.9+** (22 recommended) and npm.

```bash
git clone https://github.com/afifcareer-code/language-learning-platform.git
cd language-learning-platform
npm install
cp .env.example .env        # optional; defaults work out of the box
npm run db:setup            # create the database and load content
npm run dev                 # http://localhost:3000
```

With no database settings, the app uses a local SQLite file in `.data/`, so no external services are needed.

### Deploying with MySQL, PostgreSQL or a hosting panel

The app **detects the database automatically** from the variables your hosting panel provides: `DB_HOST`/`DB_DATABASE`/`DB_USERNAME`/`DB_PASSWORD` (cPanel, Plesk, aaPanel), `DATABASE_URL`, `MYSQL_URL`, `POSTGRES_URL` and others. It **migrates and seeds the database on startup**. On cPanel, set `server.js` as the application startup file. Run `npm run db:check` to see what was detected.

Step-by-step guides are in [Deployment](docs/development/deployment.md).

## Development

| Command                              | Purpose                                                         |
| ------------------------------------ | --------------------------------------------------------------- |
| `npm run dev`                        | Start the dev server                                            |
| `npm run lint` / `npm run typecheck` | Static checks                                                   |
| `npm test`                           | Unit and integration tests (Vitest)                             |
| `npm run test:e2e`                   | End-to-end tests (Playwright)                                   |
| `npm run content:validate`           | Validate content files                                          |
| `npm run db:generate`                | Generate migrations for all databases after changing the schema |
| `npm run db:setup`                   | Apply migrations and seed content                               |
| `npm run db:check`                   | Show the detected database and test the connection              |

See [Setup](docs/development/setup.md) and [Testing](docs/development/testing.md).

## Roadmap

Next up: a kana assessment, dakuten and combination kana, stroke-order data, then vocabulary and kanji. See the [full roadmap](docs/product/roadmap.md).

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md). To report a security problem, see [SECURITY.md](SECURITY.md).

## License

[Apache License 2.0](LICENSE). It is permissive and includes an explicit patent grant, which suits a project that may grow to include algorithms such as handwriting analysis and scheduling. See [Why Apache 2.0](CONTRIBUTING.md#license).

Suggested GitHub topics: `language-learning`, `language-education`, `adaptive-learning`, `mastery-learning`, `active-recall`, `spaced-repetition`, `edtech`, `open-source`, `learning-platform`, `handwriting`, `japanese-learning`.
