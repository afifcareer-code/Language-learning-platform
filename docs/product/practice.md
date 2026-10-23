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

| Skill      | Stages available now                                                                     | Planned                          |
| ---------- | ---------------------------------------------------------------------------------------- | -------------------------------- |
| Writing    | character → word → phrase → sentence → context → free                                    | (none)                           |
| Reading    | character → word → phrase → sentence → native → short text → paragraph → real-world text | —                                |
| Listening  | sound → word → phrase → sentence → conversation                                          | real-world audio                 |
| Vocabulary | recognition → recall                                                                     | context, usage, automatic recall |
| Grammar    | recognition → sentence construction                                                      | context, production              |

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

## Situations, texts and conversations

- **Context writing** gives a situation ("you want to order water") and the learner writes an appropriate reply; the model is one good reply.
- **Free production** asks for a short message in the learner's own words. The model is only an example, and the self-rating is _clear and natural_, _understandable, with mistakes_, or _not yet_.
- **Short text** (reading) and **conversation** (listening) show or play original material and ask one comprehension question with four options. A conversation is played and its text appears only after answering; if the device cannot play audio, the text is shown and the screen says so. All voices are one synthetic voice (see `public/audio/CREDITS.md`).

Reading and Listening also have a **native** stage: 137 short kana-only sentences written by Japanese speakers, imported from Tatoeba (CC BY 2.0 FR) with per-item credit shown after each answer. They are single utterances, not paragraphs; the Paragraph and Real-world reading stages use excerpts of public-domain literature from Aozora Bunko (Niimi Nankichi, Akutagawa Ryunosuke) with the furigana written by its volunteers. Each excerpt has a question, its meaning in English and Indonesian (shown after the answer) and a credit with a link to the source. Furigana is shown above kanji with `<ruby>`; the app does not teach kanji reading yet, it only supports reading text that has it.

Content lives in `data/japanese/situations/`, `data/japanese/passages/` and `data/japanese/native/`; see `docs/development/content-authoring.md`.

## What is not built

Real-world audio, a wider set of authentic texts (signs, menus, news), vocabulary and grammar in context, kanji, speaking, spaced-repetition scheduling specific to stages, and any automatic handwriting recognition.

## Levels

Practice stages are ordered by complexity, but their **content carries a level** (N5, N4, N3, N2). A learner is only offered content up to their current level; a learner still in the foundation practises up to N5, which is what they are working towards. A stage whose content is all above the learner's level is listed as "Opens at N4" and cannot be started. Content without a level is always available.

The levels of original content (N5) are authored. The levels of the Aozora excerpts (N4, N3, N2) are an editorial estimate of the reading level needed, with furigana and the meaning, not an official JLPT classification. Until the course has N4+ curriculum a learner cannot be at those levels, so those stages stay closed.

## Kanji

The Kanji skill has three stages: **meaning** (see the kanji, pick its meaning), **reading** (pick its on/kun readings) and **writing** (write it by hand with its stroke order shown, then compare and rate; the app does not read handwriting). 79 N5 and 166 N4 kanji are available; N4 kanji follow the level rule above. The stroke order comes from KanjiVG and is animated stroke by stroke with numbers. The kanji reference (Learn → Kanji reference, `/learn/kanji`) lists every kanji by level with its readings and stroke order.
