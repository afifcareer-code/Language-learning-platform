# Proficiency framework (Japanese: Foundation → N5 → N1)

This is the planning report and the product reference for how the platform
measures proficiency. N5 is the first complete reference implementation; N4–N1
are mapped here but intentionally not built.

Three things are kept apart everywhere in the product and in this document:

| Term                                       | Meaning                                                                                                                   | Owner                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| **Official JLPT standard**                 | What the exam publishes: levels, sections, timing, pass marks, scaled scores.                                             | JEES / Japan Foundation |
| **Platform Internal Mastery Standard**     | Our own thresholds on evidence (secure, retained, mock-assessment pass). Labelled "Platform Internal Standard" in the UI. | This platform           |
| **Certification Readiness Recommendation** | A conservative recommendation derived from the two above. Never a score, never a guarantee.                               | This platform           |

## A. Current architecture assessment

Reused as is: language-agnostic `src/core` (activities, mastery, review,
recommendation, analytics), the Japanese module, curriculum tables
(levels with `frameworkLevel`, courses, lessons, activities), `learning_attempts`
as the single evidence log, mastery and review schedules, `AttemptMode`
(which already had `assessment`), i18n with key parity tests.

Gaps this work fills: nothing connected mastery to a _level-wide_ claim;
`assessment` mode was declared but unused; `core/assessment` scored a quiz but
knew nothing about sections or competencies. No new evidence table was added:
proficiency is **derived** from attempts and mastery, so it cannot drift from
what the learner actually did.

## B. Level map (official facts)

Source: jlpt.jp (test sections, scoring, level summary, "about the test").

| Level | Sections and time                                     | Scoring                                          | Pass marks                   | Reading of the level (paraphrased)                                      |
| ----- | ----------------------------------------------------- | ------------------------------------------------ | ---------------------------- | ----------------------------------------------------------------------- |
| N5    | Vocabulary 20 min; Grammar + Reading 40; Listening 30 | Language Knowledge+Reading 0–120, Listening 0–60 | total 80; sections 38 and 19 | simple everyday texts in kana and basic kanji; short slow conversations |
| N4    | 25; 55; 35                                            | same structure                                   | total 90; sections 38 and 19 | familiar daily topics; slow everyday conversation                       |
| N3    | 30; 70; 40                                            | three sections 0–60 (total 180)                  | total 95; each section 19    | everyday texts with detail; near-natural speed                          |
| N2    | Language+Reading 105; Listening 50                    | three sections 0–60                              | total 90; each 19            | articles, reviews; natural-speed conversation and news                  |
| N1    | Language+Reading 110; Listening 55                    | three sections 0–60                              | total 100; each 19           | logically complex or abstract writing; lectures and news                |

Scores are scaled (equated), and a pass needs both the total and every sectional
mark. The exam does **not** measure speaking or writing and is machine-scored.
CEFR is a reference table the organisers show to passers (N5 ≥ A1, N4 ≥ A2,
N3 A2–B1, N2 B1–B2, N1 B2–C1), not a platform claim.

Platform progression per level: vocabulary and grammar recognition → recall →
sentence production → reading and listening under reduced assistance, with
retention required before a readiness recommendation.

## C. Foundation → N5 prerequisite

N5 requires reading and recognizing hiragana and katakana. It is satisfied
from evidence: at least 80% of the Foundation item–skill pairs (kana
recognition and reading) must be _practicing_ or better. Visiting or completing
the lessons is not enough. Each later level's prerequisite is the previous
level (N4 ← N5, …), as listed in `data/japanese/proficiency/framework.json`.

## D. Domain map

Vocabulary, Grammar, Reading, Listening, Writing. The first four mirror what the
exam measures. Writing (producing your own text) is platform-only because the
exam does not assess it; it is shown separately as "Language mastery beyond the
exam" so exam readiness and real-world ability are never blended.

## E. JLPT-alignment map (N5)

| Competency                       | Domain     | Exam-aligned  | Status    |
| -------------------------------- | ---------- | ------------- | --------- |
| Recognize everyday words         | Vocabulary | yes           | available |
| Build simple sentences           | Grammar    | yes           | available |
| Read short everyday texts        | Reading    | yes           | planned   |
| Follow short, slow conversations | Listening  | yes           | planned   |
| Recall words from their meaning  | Vocabulary | platform-only | available |
| Write your own simple sentences  | Writing    | platform-only | planned   |

## F. Reference map

Official: jlpt.jp pages above. Pedagogical references (design only, no copied
content): the JF Standard for Japanese-Language Education and Marugoto, for
"can-do" framing; textbook series are used as pedagogy references only.
All items, sentences, situations and questions are original.

## G. Real-world context

Each N5 lesson is anchored to a situation (first day in class, introductions).
Later N5 lessons: shopping and numbers, time and daily schedule, directions,
food, family, weather. Situations drive vocabulary and sentence choices.

## H. Evidence model

`level → domain → competency → skill → activity → attempt → evaluation`.
A competency is measured by the mastery state of every item on its skills in
that level's activities. A pair counts as **secure** when proficient or mastered
(streak plus a real review gap), **retained** when mastered. Lesson completion is
never an input. Assessment attempts are stored with mode `assessment`, apart
from practice, in the same `learning_attempts` log.

## I. Readiness model

- **Not Ready**: prerequisite unmet, or no evidence yet.
- **Developing**: some skills started, not all available skills secure.
- **Assessment Ready**: every available skill secure. The mock assessment is
  the next step, and retention is still to be shown.
- **Certification Ready**: prerequisite, every skill retained, a passed mock
  assessment **and no planned domain left**. While reading or listening content
  does not exist, N5 cannot reach this state, and the page says why.

Defaults (configurable in `data/japanese/proficiency/n5.json`): secure 80%,
retained 60% mastered, prerequisite 80%, mock section pass 60%, overall 70%.

## J. Copyright-safe content strategy

Original vocabulary lists, sentences, situations and questions only. Official
sources are paraphrased and cited, never reproduced; no exam questions or
textbook text are copied. Audio is device text-to-speech, not recorded material.

## What this does not claim

No fluency claim. No guarantee of passing. The mock result is labelled
"Platform Mock Assessment Result" and is never presented as an official score.
