# Data model

The schema is defined once per database engine in [`src/server/db/schema/`](../../src/server/db/schema): `sqlite.ts` is the reference, while `mysql.ts` and `postgres.ts` mirror it with native types. Migrations are generated into [`database/migrations/<dialect>`](../../database/migrations). Every table is language-agnostic.

```
languages ─┬─< learners
           ├─< content_items ──< lesson_items >── lessons >── courses
           └─< assessments ──< assessment_attempts ── assessment_results

learners ─┬─< learning_sessions
          ├─< learning_attempts ── writing_samples (0..1)
          ├─< mastery          (learner × item × skill)
          └─< review_schedule  (learner × item × skill)
```

## Tables

| Table                                                      | Purpose                                                                                                                                                                         |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `languages`                                                | Installed languages (`ja`)                                                                                                                                                      |
| `learners`                                                 | Learners. v0.1 uses a single local learner (`id = "local"`)                                                                                                                     |
| `content_items`                                            | Any learnable unit. `type` (for example `ja.kana`) and `data` (JSON) are owned by the language module; `key` is a natural key unique per language                               |
| `courses`, `lessons`, `lesson_items`                       | Curriculum structure, seeded from `data/<language>/curriculum`                                                                                                                  |
| `learning_attempts`                                        | **Every graded response.** The source of truth from which mastery is derived. Stores skill, mode (practice, review, assessment), correctness, score, response and response time |
| `writing_samples`                                          | Raw normalised stroke data, guidance stage, self-assessment and automatic analysis for writing attempts                                                                         |
| `mastery`                                                  | Current mastery evidence and state per learner × item × skill                                                                                                                   |
| `review_schedule`                                          | Spaced-repetition state per learner × item × skill (stage, interval, due date, lapses)                                                                                          |
| `learning_sessions`                                        | Reserved for grouping attempts into sessions                                                                                                                                    |
| `assessments`, `assessment_attempts`, `assessment_results` | Assessment **definition**, **attempt** and **result**, kept separate (UI planned for v0.2)                                                                                      |

## Key design choices

- **Mastery is per skill.** Reading あ and writing あ are tracked independently, because they are different abilities.
- **Attempts are immutable evidence.** `mastery` and `review_schedule` are projections that could be rebuilt from `learning_attempts`. This allows the mastery policy or scheduler to change later.
- **Language-specific data in JSON.** `content_items.data` holds module-typed payloads (kana, romaji, stroke counts). The module validates the payload with Zod when seeding and narrows it with type guards when reading. A new language does not need a migration to add new content attributes.
- **Skills are strings declared by modules** (`ja.kana.reading`), not database enums, so modules can add skills without schema changes.
- **Timestamps** are UTC with millisecond precision: integer milliseconds on SQLite, `datetime(3)` on MySQL and `timestamptz(3)` on PostgreSQL.
- **MySQL tables use `utf8mb4_bin`**, so any Japanese text is stored safely and keys compare exactly (for example, あ and ぁ stay distinct).

## Concepts not yet materialised

`Level`, `Module` and `Recommendation` from the original concept list are not tables yet. Proficiency levels (JLPT) will arrive with the Japanese proficiency framework, and recommendations are computed on demand. `ErrorPattern` will be derived from `learning_attempts.response` when error analytics land.
