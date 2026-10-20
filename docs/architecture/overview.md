# Architecture overview

## Goals

- **Simple to run.** One Node.js process and one SQLite file. No queues, caches or microservices.
- **Japanese-first, language-agnostic.** The learning engine knows nothing about any specific language.
- **Testable.** Learning logic is made of pure functions with no I/O.
- **Approachable for contributors.** Mainstream, well-documented tools.

## Technology decision

| Concern           | Choice                                        | Why                                                                                                                             |
| ----------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Framework         | **Next.js (App Router) + React + TypeScript** | UI, server rendering and server actions in one process; huge ecosystem; easy to self-host with `next start`                     |
| Database          | **SQLite via libSQL**                         | Zero-infrastructure, single-file and fast; prebuilt binaries; the same driver can later point to a hosted libSQL/Turso database |
| ORM               | **Drizzle**                                   | Type-safe, SQL-like, light runtime; generates plain SQL migrations                                                              |
| Styling           | **Tailwind CSS v4** with design tokens        | Consistent responsive styling; light and dark themes through CSS variables                                                      |
| Validation        | **Zod**                                       | Validates content files, environment and server-action inputs                                                                   |
| Handwriting input | **Pointer Events API**                        | One API for mouse, touch and any stylus; pressure where available; no vendor SDK                                                |
| Tests             | **Vitest**, **Playwright**                    | Fast unit/integration tests; e2e on tablet and mobile profiles                                                                  |

### Trade-offs

- **Next.js** is heavier than a plain Vite single-page app with a separate API, but it removes the need to run and deploy two processes. Server actions keep the client thin.
- **SQLite** is single-writer and not suited to large multi-tenant deployments. It is ideal for personal or self-hosted use, and Drizzle keeps a migration path to Postgres open.
- **No authentication in v0.1.** A single local learner keeps the scope small. The schema already has a `learners` table.
- **TypeScript 5.9 / ESLint 9** are pinned instead of the newest majors so that the Next.js and typescript-eslint tooling stays compatible.

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

## Request flow: answering a reading question

1. `app/practice/reading/page.tsx` (a server component) calls `services/practice.getPracticeSet` to pick items.
2. `features/practice/reading-session.tsx` (a client component) shows a character and the learner types an answer.
3. The `submitReadingAnswer` server action validates the input with Zod and loads the item.
4. `services/learning.evaluateTypedResponse` asks the item's **language module** to grade the response.
5. `services/learning.recordAttempt` runs in one transaction:
   - inserts the `learning_attempts` row (the raw evidence),
   - calls `ReviewScheduler.next` (core) and upserts `review_schedule`,
   - calls `applyAttempt` (core) and upserts `mastery`.
6. The action returns the result and the new mastery state to the client.

Writing attempts follow the same path. The server reruns the handwriting analyzer, combines it with the learner's self-assessment, and stores the raw strokes in `writing_samples` for future re-analysis.

## Directory map

| Path              | Contents                                                                      |
| ----------------- | ----------------------------------------------------------------------------- |
| `src/core`        | Domain logic (see [Learning engine](learning-engine.md))                      |
| `src/languages`   | Language modules and the registry (see [Language system](language-system.md)) |
| `src/handwriting` | Stroke types, feature extraction, analyzers, scoring, guidance, canvas        |
| `src/audio`       | Speech synthesis hook and button                                              |
| `src/server`      | Env, database client and schema, repositories, services                       |
| `src/features`    | Feature-level UI (practice sessions, kana views)                              |
| `src/components`  | App shell and UI primitives                                                   |
| `src/app`         | Next.js routes and server actions                                             |
| `src/shared`      | Small framework-agnostic utilities                                            |
| `data/`           | Content files (JSON), validated by Zod schemas                                |
| `database/`       | Generated SQL migrations and seeders                                          |
| `scripts/`        | Development and content scripts                                               |
| `tests/`          | Unit, integration and e2e tests                                               |

### Mapping from the original conceptual layout

The original proposal included a top-level `frontend/` folder. In Next.js, routes must live in `src/app`, so the UI is split across `src/app` (pages), `src/features` (feature UI) and `src/components` (shared UI and layout). Folders that would be empty in v0.1 (for example `languages/japanese/kanji`, `grammar` or `proficiency`) are not created yet. They will be added together with their first real code.
