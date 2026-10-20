# Data model

The schema is defined once per database engine in [`src/server/db/schema/`](../../src/server/db/schema): `sqlite.ts` is the reference, while `mysql.ts` and `postgres.ts` mirror it with native types. Migrations are generated into [`database/migrations/<dialect>`](../../database/migrations). Every table is language-agnostic.

```
languages ─┬─< learners
           ├─< levels ──< courses ──< lessons ──< activities ──< activity_items >── content_items
           │                                │
           │                                └─< lesson_items >── content_items
           └─< assessments ──< assessment_attempts ── assessment_results

levels / courses / lessons / activities ──< *_translations (entity × locale)

learners ─┬─< learning_sessions
          ├─< learning_attempts ── writing_samples (0..1)
          ├─< mastery          (learner × item × skill)
          ├─< review_schedule  (learner × item × skill)
          └─< confusion_pairs  (learner × item × item)
```

## Tables

| Table                                                      | Purpose                                                                                                                                                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `languages`                                                | Installed languages (`ja`)                                                                                                                                                                                          |
| `learners`                                                 | Learners. v0.1 uses a single local learner (`id = "local"`). `ui_locale` stores the preferred interface language                                                                                                    |
| `levels`                                                   | Proficiency bands in a language (Foundation now; JLPT levels later)                                                                                                                                                 |
| `activities`, `activity_items`                             | Measurable learning actions: type, skill, difficulty, evaluation strategy, success criteria, pass score, target mastery, and the items they use. See [Activity system](activity-system.md)                          |
| `*_translations`                                           | Localized text per entity and locale: `level_translations`, `course_translations`, `lesson_translations`, `activity_translations` (title, objective, instruction, explanation). See [Localization](localization.md) |
| `confusion_pairs`                                          | Two items a learner keeps mixing up, with error count, correct answers since the last error, and remediation status                                                                                                 |
| `content_items`                                            | Any learnable unit. `type` (for example `ja.kana`) and `data` (JSON) are owned by the language module; `key` is a natural key unique per language                                                                   |
| `courses`, `lessons`, `lesson_items`                       | Curriculum structure, seeded from `data/<language>/curriculum`. Titles live in translation tables                                                                                                                   |
| `learning_attempts`                                        | **Every graded response.** The source of truth from which mastery is derived. Stores skill, activity, mode (practice, review, assessment), correctness, score, response and response time                           |
| `writing_samples`                                          | Raw normalised stroke data, guidance stage, self-assessment and automatic analysis for writing attempts                                                                                                             |
| `mastery`                                                  | Current mastery evidence and state per learner × item × skill                                                                                                                                                       |
| `review_schedule`                                          | Spaced-repetition state per learner × item × skill (stage, interval, due date, lapses)                                                                                                                              |
| `learning_sessions`                                        | Reserved for grouping attempts into sessions                                                                                                                                                                        |
| `assessments`, `assessment_attempts`, `assessment_results` | Assessment **definition**, **attempt** and **result**, kept separate (UI planned for v0.2)                                                                                                                          |

## Key design choices

- **Mastery is per skill.** Reading あ and writing あ are tracked independently, because they are different abilities.
- **Attempts are immutable evidence.** `mastery` and `review_schedule` are projections that could be rebuilt from `learning_attempts`. This allows the mastery policy or scheduler to change later.
- **Language-specific data in JSON.** `content_items.data` holds module-typed payloads (kana, romaji, stroke counts). The module validates the payload with Zod when seeding and narrows it with type guards when reading. A new language does not need a migration to add new content attributes.
- **Skills are strings declared by modules** (`ja.kana.reading`), not database enums, so modules can add skills without schema changes.
- **Timestamps** are UTC with millisecond precision: integer milliseconds on SQLite, `datetime(3)` on MySQL and `timestamptz(3)` on PostgreSQL.
- **MySQL tables use `utf8mb4_bin`**, so any Japanese text is stored safely and keys compare exactly (for example, あ and ぁ stay distinct).

- **No per-language columns.** Translatable text lives in `*_translations` tables keyed by locale, so adding a locale never changes the schema.

## Concepts not yet materialised

`Module` and `Topic` from the original concept list are not tables yet: lessons are the unit of curriculum for now. `Recommendation` is computed on demand. Beyond confusion pairs, other `ErrorPattern`s will be derived from `learning_attempts.response` when needed.

## Migrations

Migrations are append-only. The first release's database (`0000_init`) upgrades automatically: `0001` adds localization, activities and confusion pairs, and `0002` removes the untranslated title columns. Content is re-seeded on startup. `tests/integration/learning-flow.test.ts` covers this upgrade path on every engine.
