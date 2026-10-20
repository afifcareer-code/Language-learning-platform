# Activity system

An **activity** is a measurable learning action, not a screen. Every activity answers the learner's questions:

1. What am I learning? → **title** and content
2. Why? → **explanation**
3. What should I be able to do afterwards? → **objective**
4. How will I be judged? → **success criteria** and **evaluation strategy**
5. How did I do, and what next? → **learning outcome**, mastery change, next review

```
Curriculum (Level → Course → Lesson)
   ↓
Activity ── objective, success criteria, evaluation, pass score, target mastery
   ↓
Skill (e.g. ja.kana.writing)
   ↓
Attempt ── evaluated per item
   ↓
Mastery update + review schedule (per item × skill)
   ↓
Learning outcome (session) and recommendation (what next)
```

No activity exists on its own: each belongs to a lesson, trains one skill, and feeds the same mastery and review records that every other activity on that skill uses.

## Model

Defined in [`src/core/activities`](../../src/core/activities); it is language-agnostic.

| Field             | Meaning                                                                                                                                                                                                          |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`            | Capability-oriented: `recognition`, `recall`, `multiple_choice`, `matching`, `writing`, `listening`, `reading`, `translation`, `sentence_building`, `grammar_application`, `speaking`, `shadowing`, `production` |
| `skill`           | The skill it trains, declared by a language module                                                                                                                                                               |
| `difficulty`      | 1–5                                                                                                                                                                                                              |
| `evaluation`      | `choice`, `typed_response` or `self_assessment_with_checks`                                                                                                                                                      |
| `successCriteria` | Reusable criteria such as `recognition`, `sound_recall`, `stroke_count`, `shape_accuracy`, `recall`, `contextual_usage`. An activity lists only the criteria it actually evaluates today                         |
| `passScore`       | Session accuracy that counts as "objective met for this session"                                                                                                                                                 |
| `targetMastery`   | The mastery state every item should reach for the **outcome** to be achieved                                                                                                                                     |
| content           | The items it uses (`activity_items`)                                                                                                                                                                             |
| text              | Localized `title`, `objective`, `instruction`, `explanation` (`activity_translations`)                                                                                                                           |

### Status

Activity status is derived from mastery evidence, never from opening a page:

| Status             | Rule                                                                   |
| ------------------ | ---------------------------------------------------------------------- |
| `not_started`      | No item has been attempted for this skill                              |
| `in_progress`      | Some items attempted                                                   |
| `completed`        | Every item attempted at least once (counts toward **course progress**) |
| `outcome_achieved` | Every item has reached `targetMastery`                                 |

### Learning outcome

At the end of a session, `summarizeSession` produces the outcome shown to the learner: score against `passScore`, items that improved or declined, the mastery distribution afterwards, and the earliest next review.

## Writing objectives

Objectives must be measurable and stated as what the learner can do:

- ✗ "Learn hiragana."
- ✓ "Write か き く け こ from memory with the correct shape and number of strokes, without relying on a visual reference."

Only promise what the activity evaluates. The writing activity says "correct shape and number of strokes" because stroke count is checked automatically and shape is self-assessed. It does not yet promise stroke order, because that is not measured yet.

## Activity templates

Writing every activity by hand would repeat the same objectives across dozens of lessons. Instead, a language provides **templates** as data (for kana: [`data/japanese/activities/kana.json`](../../data/japanese/activities/kana.json)). The seeder creates one activity per template for each lesson, in template order, which follows the learning loop:

1. **Recognize**: choose the sound for a character (distractors favour commonly confused characters).
2. **Recall**: type the sound with no options.
3. **Write**: write the character, with guidance that fades as writing mastery grows.

Templates contain localized text with placeholders (`{script}`, `{characters}`, `{lesson}`) that `npm run content:validate` checks.

## Sessions outside the curriculum

Reviews, recent mistakes and confusion pairs run as sessions too. They have no curriculum activity, but they still state an objective (for example, "Reliably tell シ and ツ apart") and end with the same learning outcome.

## Confusion pairs

When a wrong answer is the correct answer for another item (choosing ツ's sound for シ, or typing "su" for し), the attempt records a **confusion pair**. Pairs with repeated errors are recommended for targeted discrimination practice and are marked resolved after enough correct answers. Curated, commonly confused pairs ([`data/japanese/confusion/kana.json`](../../data/japanese/confusion/kana.json)) are used as distractors from the start.

## Adding an activity type

1. Add the type to `ACTIVITY_TYPES` if it is new, and map it in `evaluationFor`.
2. Implement the exercise component in `src/features/practice/` and register it in `session-page.tsx`.
3. Extend the server action (`src/app/practice/actions.ts`) if it needs a new response kind.
4. Add templates or activities in the language's data files.
