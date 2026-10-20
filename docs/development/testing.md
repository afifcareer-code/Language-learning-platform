# Testing

| Layer       | Tool                                    | Location            | Command            |
| ----------- | --------------------------------------- | ------------------- | ------------------ |
| Unit        | Vitest                                  | `tests/unit`        | `npm test`         |
| Integration | Vitest + temporary database per engine  | `tests/integration` | `npm test`         |
| End-to-end  | Playwright (tablet and mobile profiles) | `tests/e2e`         | `npm run test:e2e` |

## Unit tests

These cover the pure logic: the scheduler, mastery state transitions, recommendations, assessment scoring, romaji grading, stroke features, analyzers and writing scoring. They also include:

- **Content validation** (`tests/unit/languages/content.test.ts`): every content file parses and every lesson references existing items.
- **Database configuration** (`tests/unit/database-config.test.ts`): detection of hosting-panel variables, URL encoding, and passwords never being logged.
- **Schema parity** (`tests/unit/schema-parity.test.ts`): the three schemas define the same tables and columns, and MySQL tables are `utf8mb4`.
- **Architecture boundaries** (`tests/unit/architecture.test.ts`): `src/core` imports no language, persistence or UI code and mentions no Japanese-specific concepts.

## Integration tests

`tests/integration/learning-flow.test.ts` creates a fresh database, migrates and seeds it, then exercises the real write path: recording attempts, scheduling reviews, mastery updates, the dashboard overview and review sessions.

It always runs on SQLite. To also run it on MySQL/MariaDB and PostgreSQL, point it at servers where the user may create databases. A temporary database is created and dropped for each run:

```bash
TEST_MYSQL_URL=mysql://root:password@127.0.0.1:3306/ \
TEST_POSTGRES_URL=postgres://postgres:password@127.0.0.1:5432/postgres \
npm test
```

CI runs all three engines.

## End-to-end tests

Playwright builds the app, seeds a separate database (`.data/e2e.db`) and runs smoke tests on an iPad Pro landscape profile and a Pixel 7 profile. The tests include drawing on the handwriting canvas.

The first time, install a browser with `npx playwright install chromium`. To use an existing Chromium instead, set:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium npm run test:e2e
```

## Writing tests

- Put new domain logic in `src/core` or a module, and unit-test it there.
- Use fixed dates (`new Date("2026-01-01T09:00:00Z")`) and pass `at` or `now` explicitly; never depend on the wall clock.
- Prefer behaviour-level assertions ("cannot reach proficiency by cramming") over implementation details.
