# Testing

| Layer       | Tool                                    | Location            | Command            |
| ----------- | --------------------------------------- | ------------------- | ------------------ |
| Unit        | Vitest                                  | `tests/unit`        | `npm test`         |
| Integration | Vitest + temporary database per engine  | `tests/integration` | `npm test`         |
| End-to-end  | Playwright (tablet and mobile profiles) | `tests/e2e`         | `npm run test:e2e` |

## Unit tests

These cover the pure logic: the scheduler, mastery state transitions, recommendations, assessment scoring, romaji grading, stroke features, analyzers and writing scoring. They also include:

- **Content validation** (`tests/unit/languages/content.test.ts`): every content file parses and every lesson references existing items.
- **Language catalog** (`tests/unit/languages/catalog.test.ts`): a language can be "available" only with an installed module, and every module is in the catalog.
- **Database configuration** (`tests/unit/database-config.test.ts`): detection of hosting-panel variables, URL encoding, and passwords never being logged.
- **Schema parity** (`tests/unit/schema-parity.test.ts`): the three schemas define the same tables and columns, and MySQL tables are `utf8mb4`.
- **Localization** (`tests/unit/localization.test.ts`): the translator (plurals, fallback, formatting), locale negotiation, and that every locale file has the same keys and placeholders as English.
- **Activities, progress and confusion pairs** (`tests/unit/core/`): activity status, learning outcomes, answer options, the three progress measures, confusion remediation.
- **Architecture boundaries** (`tests/unit/architecture.test.ts`): `src/core` imports no language, persistence or UI code and mentions no Japanese-specific concepts.

## Integration tests

`tests/integration/learning-flow.test.ts` creates a fresh database, migrates and seeds it, then exercises the real write path: recording attempts, scheduling reviews, mastery updates, the dashboard overview and review sessions.

It always runs on SQLite. To also run it on MySQL/MariaDB and PostgreSQL, point it at servers where the user may create databases. A temporary database is created and dropped for each run:

```bash
TEST_MYSQL_URL=mysql://root:password@127.0.0.1:3306/ \
TEST_POSTGRES_URL=postgres://postgres:password@127.0.0.1:5432/postgres \
npm test
```

Further scenarios on every engine: choosing a learning language and level (coming-soon languages and levels without curriculum are rejected), and upgrading databases from the first and the previous release while keeping a learner's attempts and placing them at Foundation without onboarding.

CI runs all three engines.

## End-to-end tests

Playwright builds the app, seeds a separate database (`.data/e2e.db`) and runs on an iPad Pro landscape profile and a Pixel 7 profile, one test at a time because tests share that database.

- `onboarding.spec.ts` runs first (tablet only), against the fresh database. It covers language selection, coming-soon languages (shown, not startable, 404), level selection (only levels with curriculum), persistence, the learning path link, and the global interface-language menu (including Escape to close).
- `smoke.spec.ts` covers the learning flows: the learning path and level statuses, kana and N5 lesson pages, sound-first recognition (what is played, replay, feedback, and the no-voice fallback), recall (kana and words), sentence building, and drawing on the handwriting canvas. Headless browsers have no speech voices, so audio tests install a fake Japanese voice (`fakeJapaneseVoice` in `helpers.ts`) that records what the page asks it to say. Its tests complete onboarding themselves if needed (`helpers.ts`).

The first time, install a browser with `npx playwright install chromium`. To use an existing Chromium instead, set:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium npm run test:e2e
```

## Writing tests

- Put new domain logic in `src/core` or a module, and unit-test it there.
- Use fixed dates (`new Date("2026-01-01T09:00:00Z")`) and pass `at` or `now` explicitly; never depend on the wall clock.
- Prefer behaviour-level assertions ("cannot reach proficiency by cramming") over implementation details.
