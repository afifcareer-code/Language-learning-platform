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

## Lesson structure

A lesson has one **objective** (what the learner can do afterwards, localized) and a **situation** (where that language is used). The page follows the learning flow exposure → recognition → understanding → controlled practice → recall → production → assessment → review, as four groups:

| Group        | Contains                                                                                                                                                                |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Learn**    | The lesson's content to read and listen to: characters, or words (with romaji) and grammar points with examples and common mistakes. Not an activity; nothing is graded |
| **Practice** | Recognition and recall activities (`activityGroup(type) === "practice"`)                                                                                                |
| **Apply**    | Production activities: writing, sentence building (`"apply"`)                                                                                                           |
| **Check**    | Learning readiness for the lesson: the share of its (item, skill) pairs that hold up from memory                                                                        |

"What you'll learn" lists the activities' objectives with their status. There is one objective system: lesson objective → activity objectives → skills; outcomes are never authored separately.

## Writing objectives

Objectives must be measurable and stated as what the learner can do:

- ✗ "Learn hiragana."
- ✓ "Write か き く け こ from memory with the correct shape and number of strokes, without relying on a visual reference."

Only promise what the activity evaluates. The writing activity says "correct shape and number of strokes" because stroke count is checked automatically and shape is self-assessed. It does not yet promise stroke order, because that is not measured yet.

## Activity templates

Each template declares the `contentType` it uses (`ja.kana`, `ja.vocabulary`, `ja.sentence`); a lesson gets the template only if it has items of that type, and `{count}` is filled with their number. The content validator checks that every template's content type appears in a lesson that uses the file.

Writing every activity by hand would repeat the same objectives across dozens of lessons. Instead, a language provides **templates** as data (for kana: [`data/japanese/activities/kana.json`](../../data/japanese/activities/kana.json)). The seeder creates one activity per template for each lesson, in template order, which follows the learning loop:

1. **Recognize** (sound → character): the sound is played and the learner chooses the matching character. The character is not shown before answering. Options are characters: commonly confused ones first, then the other items of the same lesson, never a character that sounds the same (お/を, オ/ヲ), because then neither the sound nor the answer could tell them apart.
2. **Recall** (character → sound): the character is shown and the learner types its sound in romaji, with no options. The sound is never played before answering, because the sound is the answer; it is offered in feedback.
3. **Write** (sound → handwriting): the sound is played (and shown in romaji) and the learner writes the character, with guidance that fades as writing mastery grows.

Each stage therefore tests a different skill (`ja.kana.recognition`, `ja.kana.reading`, `ja.kana.writing`) and states its direction in its instruction: what the learner receives, what to do, and what answer is expected.

Templates contain localized text with placeholders (`{script}`, `{characters}`, `{lesson}`) that `npm run content:validate` checks.

## Audio

There are no recorded audio files yet. Sound comes from the Web Speech API: a Japanese voice installed on the learner's device speaks the item's `speech` text (for kana, the character itself, resolved from content data in `src/features/japanese/practice-items.ts`, never hard-coded in a component).

`useSpeech` reports `checking`, `ready` or `unavailable`:

- A sound-first question shows one large, labelled **Play sound** button as its primary interaction; it never autoplays and can always be replayed ("Listen again"). Its accessible name never contains the spoken text, because that is the answer.
- If the device has no Japanese voice, the question falls back to character → sound and says so; it never shows a Play button that cannot work. Writing then drops the audio button and tells the learner to read the sound shown.
- The lesson's Learn section lets the learner tap every character to hear it before any question (exposure comes before recognition).

Limitation: pronunciation quality depends on the device's voice. Adding recorded audio later means resolving a file per item in the same place as `speech`; components do not change.

## Sessions outside the curriculum

Reviews, recent mistakes and confusion pairs run as sessions too. They have no curriculum activity, but they still state an objective (for example, "Reliably tell シ and ツ apart") and end with the same learning outcome.

## Confusion pairs

When a wrong answer is the correct answer for another item (choosing ツ's sound for シ, or typing "su" for し), the attempt records a **confusion pair**. Pairs with repeated errors are recommended for targeted discrimination practice and are marked resolved after enough correct answers. Curated, commonly confused pairs ([`data/japanese/confusion/kana.json`](../../data/japanese/confusion/kana.json)) are used as distractors from the start.

## Adding an activity type

1. Add the type to `ACTIVITY_TYPES` if it is new, and map it in `evaluationFor`.
2. Implement the exercise component in `src/features/practice/` and register it in `session-page.tsx`.
3. Extend the server action (`src/app/practice/actions.ts`) if it needs a new response kind.
4. Add templates or activities in the language's data files.
