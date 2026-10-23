# Practice: the skill gym

Learn and Practice are different domains.

|            | Learn                                        | Practice                                        |
| ---------- | -------------------------------------------- | ----------------------------------------------- |
| Question   | What should I know to reach this level?      | Can I actually use it?                          |
| Shape      | Syllabus: level → course → lesson → activity | Skill → stage → session. No lessons.            |
| Ordered by | Proficiency level (Foundation, N5, N4…)      | Complexity (character, word, phrase, sentence…) |
| Progress   | Course progress                              | The stage reached on each skill                 |
| Alignment  | JLPT-aligned                                 | Outside the JLPT syllabus                       |

Course progress, skill mastery, learning readiness and Practice stages are separate measures. They are never merged into one percentage.

## Skills and stages (Japanese)

| Skill      | Stages available now                 | Planned                                |
| ---------- | ------------------------------------ | -------------------------------------- |
| Writing    | character → word → phrase → sentence | context, free production               |
| Reading    | character → word → phrase → sentence | short text, paragraph, real-world text |
| Listening  | sound → word → phrase → sentence     | conversation, real-world audio         |
| Vocabulary | recognition → recall                 | context, usage, automatic recall       |
| Grammar    | recognition → sentence construction  | context, production                    |

Planned stages are listed on the Practice page, marked _Planned_, and never offered. Practice uses content the learner has met in Learn, least practised first, and tops up with the earliest unmet content so a new learner can start. It does not depend on a lesson.

## How the next stage is chosen

The rule is evidence-based and lives in `src/core/practice`, not in the UI. Every stage has a requirement (platform settings, not official thresholds):

- `minAttempts` before the stage can be judged (6)
- `window`: only the latest attempts count (10)
- `promoteAt`: a mean at or above this passes the stage (0.8)
- `demoteBelow`: a mean below this sends the learner one stage back (0.6)

The first available stage that is not passed is the working stage.

- Between the two levels the learner keeps working on it (_continue_).
- Weak performance sends them one stage back, with the reason shown (_regress_: "your recent Sentence results were weak, so go back to Phrase"). On the first stage they simply retry.
- A passed stage that later declines stops counting as passed, so the learner returns to it without any special case.
- When every available stage is passed the skill is _mastered_ for now.

Every recommendation carries its reason, so it can be explained.

## Writing by hand beyond a single character

Single kana keep the existing writing flow. For words, phrases and sentences the app **does not read handwriting**. The learner writes in a wide area from the meaning (and the sound, when the device can play it), taps **Show the model**, compares, and rates their own writing: _correct_ (1.0), _almost_ (0.6, credit but not a pass), or _not yet_ (0). The rating is the evidence; the screen says so. There is no stroke-order, stroke-direction, word-level or kanji handwriting evaluation.

## What is not built

Free production and context writing, short texts, conversations, real-world audio, kanji, speaking, spaced-repetition scheduling specific to stages, and any automatic handwriting recognition.
