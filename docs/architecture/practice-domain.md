# Practice domain

`src/core/practice` is the language-agnostic engine; it knows nothing about Japanese.

- **Types**: `PracticeSkillSpec` (a skill and its ordered stages), `PracticeStageSpec` (focus, availability, requirement, and the session the stage uses), `StageAttempt`.
- **Engine**: `computePracticeProgress(skill, attempts)` returns the status of each stage, the stage to practise next, and a `reason` code (`start`, `continue`, `advance`, `regress`, `retry`, `mastered`). `validatePracticeSkill` checks a framework's structure.
- **Language data**: a language module may declare `practice`. Japanese loads `data/japanese/practice/framework.json` in `src/languages/japanese/practice.ts` (zod-validated, then `validatePracticeSkill`). A stage's `session` names the learning skill, the exercise type, the content type and an optional filter on item data (for example `partOfSpeech: expression` for phrases).

## Evidence, no new progress table

Practice attempts are normal attempts (`learning_attempts`) with a new nullable column `practice_stage` ("`<skill>.<stage>`", for example `writing.word`). Learn and review attempts leave it null. Migration `0006_practice_stage` (all three dialects) only adds the column, so existing data is untouched.

- Per-item mastery and the review schedule still update through the same `recordAttempt` path, so what is learned in Practice counts toward retention.
- Stage progress reads only attempts with a `practice_stage`, so it is independent of the course.
- `submitAttempt` validates the stage against the language's framework and requires the attempt's skill to be the stage's skill.

## Sessions

`getPracticeSession(..., { kind: "stage", skillId, stageId })` builds a session without a lesson or activity. Planned or unknown stages return `null` (404). The exercise is the stage's declared type; word, phrase and sentence writing use the `production` type with the self-rated text-writing exercise.

## UI

`SkillGymCard` (generic) shows a skill's ladder; `SkillGym` maps the overview to it; `PracticeSummary` is the dashboard block. Routes: `/practice` (hub) and `/practice/session?kind=stage&practiceSkill=…&stage=…`.
