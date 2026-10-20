# Architecture overview

## Goals

- **Simple to run.** One Node.js process and one database: a local SQLite file by default, or the MySQL/PostgreSQL database a hosting panel provides. No queues, caches or microservices.
- **Japanese-first, language-agnostic.** The learning engine knows nothing about any specific language.
- **Testable.** Learning logic is made of pure functions with no I/O.
- **Approachable for contributors.** Mainstream, well-documented tools.

## Technology decision

| Concern           | Choice                                                          | Why                                                                                                                                                            |
| ----------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework         | **Next.js (App Router) + React + TypeScript**                   | UI, server rendering and server actions in one process; huge ecosystem; easy to self-host with `next start`                                                    |
| Database          | **MySQL/MariaDB, PostgreSQL or SQLite (libSQL)**, auto-detected | Hosting panels mostly offer MySQL and PaaS platforms mostly PostgreSQL, while SQLite needs no setup for development. See [Database support](#database-support) |
| ORM               | **Drizzle**                                                     | Type-safe, SQL-like, light runtime; generates plain SQL migrations                                                                                             |
| Styling           | **Tailwind CSS v4** with design tokens                          | Consistent responsive styling; light and dark themes through CSS variables                                                                                     |
| Validation        | **Zod**                                                         | Validates content files, environment and server-action inputs                                                                                                  |
| Handwriting input | **Pointer Events API**                                          | One API for mouse, touch and any stylus; pressure where available; no vendor SDK                                                                               |
| Tests             | **Vitest**, **Playwright**                                      | Fast unit/integration tests; e2e on tablet and mobile profiles                                                                                                 |

### Trade-offs

- **Next.js** is heavier than a plain Vite single-page app with a separate API, but it removes the need to run and deploy two processes. Server actions keep the client thin.
- **Three database engines** mean three Drizzle schema files and three migration folders that must stay in sync. A parity test (`tests/unit/schema-parity.test.ts`) and integration tests that run on every engine keep them honest.
- **SQLite** is single-writer: ideal for personal use, not for large multi-user deployments.
- **No authentication in v0.1.** A single local learner keeps the scope small. The schema already has a `learners` table.
- **TypeScript 5.9 / ESLint 9** are pinned instead of the newest majors so that the Next.js and typescript-eslint tooling stays compatible.

## Routes

```
/                       Language selection ("What do you want to learn?"); redirects to /dashboard once chosen
/languages              Learning-language switcher (languages in progress, available, coming soon)
/languages/<code>       Level selection ("Where are you starting?"); 404 for coming-soon languages
──────────── (learning) route group: requires a learning language and level ────────────
/dashboard  /learn  /learn/<lesson>  /activities/<id>  /practice  /practice/session  /review  /progress  /settings
```

The `(onboarding)` and `(learning)` route groups only select a layout; they do not appear in URLs. The learning layout resolves the learner's context (`src/server/learning-context.ts`) and redirects to `/` when there is none. Its shell shows the five learning sections, the **learning-language chip** (for example "日本語 · Foundation", linking to `/languages`), the **ID / EN interface switch**, and Settings.

## Layers

```
┌────────────────────────────────────────────────────────────┐
│ app/ (routes, server actions)  features/  components/      │  UI
├────────────────────────────────────────────────────────────┤
│ server/services   (orchestrate core + repositories)        │  Application
│ server/repositories, server/db (Drizzle schema, client)    │  Persistence
├──────────────────────────────┬─────────────────────────────┤
│ languages/japanese           │ handwriting/   audio/       │  Modules
├──────────────────────────────┴─────────────────────────────┤
│ core/ learning · mastery · review · assessment ·           │  Domain
│       recommendation · analytics   (pure, no I/O)          │
└────────────────────────────────────────────────────────────┘
```

Dependencies point **downward only**. `src/core` imports nothing from the layers above it. ESLint (`no-restricted-imports`) and `tests/unit/architecture.test.ts` enforce this, and the test also forbids Japanese-specific terms in core.

## Database support

```
environment ──► db/config.ts ──► { dialect, url }
  DATABASE_URL     resolveDatabaseConfig()        │
  DB_HOST, DB_*                                   ▼
  MYSQL_URL, PG*   db/client.ts createDatabase() ─► libsql | mysql2 | node-postgres
                                                  │
                   instrumentation.ts (server start)
                     └─ db/bootstrap.ts: lock → migrate (database/migrations/<dialect>) → seed
```

- **Schemas**: `src/server/db/schema/{sqlite,mysql,postgres}.ts` define the same tables and columns with each engine's native types (for example `json`/`jsonb`, `datetime(3)`/`timestamptz`, `boolean`).
- **Queries** are written once with Drizzle's query builder against `db.t` (the active engine's tables). The only statement that differs between engines, upsert (`ON CONFLICT` vs `ON DUPLICATE KEY UPDATE`), goes through `src/server/db/dialect.ts`.
- **Defaults** (timestamps, empty arrays) are applied by the application, not by SQL, so behaviour is identical everywhere.
- **Times** are stored in UTC with millisecond precision on every engine.

## Request flow: answering inside an activity

1. `app/activities/[activityId]/page.tsx` (a server component) resolves the locale and calls `services/practice.getPracticeSession`. That service picks the items and, for recognition, builds answer options with commonly confused items first.
2. `features/practice/session-page.tsx` renders the objective (`PracticePrompt`), then the client `PracticeSession`, which shows one exercise at a time: recognition, recall or writing.
3. The learner answers. The `submitAttempt` server action validates the input with Zod, checks the skill and activity, and grades the answer:
   - **choice**: correct when the chosen item is the target, otherwise a confusion with the chosen item;
   - **typed text**: graded by the item's **language module**, which also reports which other item a wrong answer belongs to;
   - **writing**: the server reruns the handwriting analyzer and combines it with the learner's self-assessment.
4. `services/learning.recordAttempt` runs in one transaction:
   - inserts the `learning_attempts` row (the raw evidence, linked to the activity),
   - calls `ReviewScheduler.next` (core) and upserts `review_schedule`,
   - calls `applyAttempt` (core) and upserts `mastery`,
   - updates `confusion_pairs`.
5. The action returns feedback: correctness, expected answer, mastery before → after, next review. At the end of the session, `summarizeSession` (core) produces the **learning outcome**.

## Directory map

| Path               | Contents                                                                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/core`         | Domain logic (see [Learning engine](learning-engine.md))                                                                                              |
| `src/languages`    | Language modules and the registry (see [Language system](language-system.md))                                                                         |
| `src/localization` | Locales, translator, locale negotiation (see [Localization](localization.md))                                                                         |
| `locales/`         | UI messages per locale and namespace                                                                                                                  |
| `src/handwriting`  | Stroke types, feature extraction, analyzers, scoring, guidance, canvas                                                                                |
| `src/audio`        | Speech synthesis hook and button                                                                                                                      |
| `src/server`       | Env, database client and schema, repositories, services                                                                                               |
| `src/features`     | Feature-level UI (practice sessions, kana views)                                                                                                      |
| `src/components`   | App shell, UI primitives, and learning components (`ProgressRing`, `LearningProgress`, `MasteryCard`, `ActivityCard`, `PracticePrompt`, `ReviewCard`) |
| `src/app`          | Next.js routes and server actions                                                                                                                     |
| `src/shared`       | Small framework-agnostic utilities                                                                                                                    |
| `data/`            | Content files (JSON), validated by Zod schemas                                                                                                        |
| `database/`        | Generated SQL migrations and seeders                                                                                                                  |
| `scripts/`         | Development and content scripts                                                                                                                       |
| `tests/`           | Unit, integration and e2e tests                                                                                                                       |

### Mapping from the original conceptual layout

The original proposal included a top-level `frontend/` folder. In Next.js, routes must live in `src/app`, so the UI is split across `src/app` (pages), `src/features` (feature UI) and `src/components` (shared UI and layout). The original `locales/` folder is kept at the root. Folders that would be empty in v0.1 (for example `languages/japanese/kanji`, `grammar` or `proficiency`) are not created yet. They will be added together with their first real code.
