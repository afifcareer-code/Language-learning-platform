# Learning engine

`src/core` is the language-agnostic heart of the platform. It is plain TypeScript with no I/O, React, database or language-specific code, so every rule can be unit-tested in isolation.

## Modules

### `core/learning`

Shared vocabulary:

- `LearningStage`: recognition → understanding → recall → production → automaticity → retention.
- `Capability`: abilities a language may support (reading, writing, character-recognition, character-writing, …).
- `SkillDefinition`: a measurable ability (`id`, `label`, `stage`, `capability`).
- `ContentItem<TData>`: a learnable unit whose `type` and `data` belong to a language module.
- `LanguageModule`: the contract a language implements (see [Language system](language-system.md)).

### `core/review`

```ts
interface ReviewScheduler {
  next(previous: ReviewState | null, outcome: AttemptOutcome): ReviewState;
}
```

v0.1 ships `LeitnerScheduler` with boxes of `[10 min, 1, 3, 7, 14, 30, 90]` days:

- Correct **on or after** the due date: move up one box.
- Correct **before** the due date: keep the box and the due date (no credit for cramming).
- Incorrect: back to box 0, counted as a lapse if the item had progressed.

To adopt SM-2 or FSRS, implement `ReviewScheduler` and pass it to `recordAttempt`. `ReviewState.stage` is scheduler-specific, while `intervalDays` and `dueAt` are universal.

### `core/mastery`

`applyAttempt(record, outcome, review)` folds one attempt into the evidence (attempts, correct, consecutive correct, last attempt) and derives the state with `deriveMasteryState`. Thresholds live in `MasteryPolicy` (`DEFAULT_MASTERY_POLICY`). `currentMasteryState(record, review, now)` is used when reading: established items that are long overdue are shown as _Needs review_ without any new attempt.

Mastery uses the **review interval as its retention signal**. Because the scheduler only grows intervals after on-time correct recall, a long interval is evidence of retention across a real time gap.

### `core/assessment`

Assessments are split into three parts:

- `AssessmentDefinition`: what is measured (skill, item selector, question count, pass threshold).
- `AssessmentAttempt`: one sitting by a learner.
- `AssessmentResult`: the output of `scoreAssessment`, including `missedItemIds` for targeted practice.

### `core/recommendation`

`recommendNext({ dueReviews, weakItems, nextLesson })` returns an ordered list:
review → practise weak items → learn the next lesson. These deterministic rules are intentionally simple and explainable.

### `core/analytics`

Helpers such as `masteryDistribution` (counts per state, with no synthetic percentage) and `attemptAccuracy`.

## Write path

All learning evidence goes through one function, `server/services/learning.recordAttempt`, inside a single transaction:

```
attempt ─► learning_attempts (insert)
        ─► scheduler.next()   ─► review_schedule (upsert)
        ─► applyAttempt()     ─► mastery (upsert)
```

## Extending the engine

| Change                  | Where                                                  |
| ----------------------- | ------------------------------------------------------ |
| Tune thresholds         | `DEFAULT_MASTERY_POLICY`                               |
| New scheduler           | Implement `ReviewScheduler`                            |
| New recommendation rule | `recommendNext` (keep it explainable and tested)       |
| New skill               | Declare it in a language module; no core change needed |
