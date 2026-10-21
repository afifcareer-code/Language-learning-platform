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

### `core/activities`

The activity model (type, skill, objective, success criteria, evaluation strategy, pass score, target mastery), activity status derived from mastery, `summarizeSession` for the learning outcome, and `buildChoices` for choice-based activities. See [Activity system](activity-system.md).

### `core/recommendation`

`recommendNext({ dueReviews, confusionPairs, weakItems, nextActivity })` returns an ordered list: review → confused pair → recent mistakes → next activity. Each recommendation carries a **reason code** (`due_for_review`, `confused_pair`, `recent_mistakes`, `next_in_curriculum`) that the UI explains in the learner's language. The rules are deterministic and explainable by design.

### `core/analytics`

- **Three progress concepts**, never merged into one number:
  - `courseProgress`: activities worked through (every item attempted),
  - `skillMastery`: share of items **proficient or better** on a skill,
  - `learningReadiness` / `readinessOfPairs`: whether at least 80% of the current lesson's (item, skill) pairs are at **practicing or better**. Pairs come from the lesson's activities, so a word is measured on the skills that train it, not on kana writing.
  - Skill mastery is likewise computed per skill over the items that skill's activities train; skills with no activity in scope are not shown.
- **Confusion pairs**: `recordConfusion`, `recordPairSuccess`, `needsRemediation`. A pair needs practice after 2 confusions and is resolved after 4 correct answers on its items.
- `masteryDistribution` (counts per state) and `attemptAccuracy`.

The dashboard computes these measures for the learner's **current level** (`getLearningOverview(…, levelId)`), so each language and level has its own progress. The engine itself has no notion of a specific framework such as JLPT.

## Write path

All learning evidence goes through one function, `server/services/learning.recordAttempt`, inside a single transaction:

```
attempt ─► learning_attempts (insert, linked to its activity)
        ─► scheduler.next()   ─► review_schedule (upsert)
        ─► applyAttempt()     ─► mastery (upsert)
        ─► recordConfusion() / recordPairSuccess() ─► confusion_pairs
```

## Extending the engine

| Change                  | Where                                                  |
| ----------------------- | ------------------------------------------------------ |
| Tune thresholds         | `DEFAULT_MASTERY_POLICY`                               |
| New scheduler           | Implement `ReviewScheduler`                            |
| New recommendation rule | `recommendNext` (keep it explainable and tested)       |
| New skill               | Declare it in a language module; no core change needed |
