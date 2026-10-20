# Product vision

## The problem

Language learning apps usually optimise for engagement: streaks, lesson counts, minutes per day. These are easy to measure, but they are poor proxies for learning. A learner can complete every lesson in a unit and still be unable to recall a word a week later.

## The goal

An open-source, adaptive platform that tracks and develops what a learner can actually:

- **remember**: recall without cues,
- **understand**: recognise meaning in context,
- **produce**: write and say it themselves,
- **retain**: still know it after time has passed.

Every feature should either generate evidence of these abilities or use that evidence to decide what to practise next.

## Principles

1. **Mastery over completion.** Progress comes from evidence of recall over time, never from pages viewed.
2. **Active recall first.** Prefer typing or writing an answer over choosing from options.
3. **Spacing beats cramming.** Items return just before they are likely to be forgotten.
4. **Production matters.** Writing by hand is a first-class skill, especially for scripts such as Japanese kana and kanji.
5. **Adaptivity through transparent rules.** Recommendations should be explainable ("due for review", "you missed this twice") before they are clever.
6. **A serious, calm tool.** Minimal, focused UI without childish gamification.
7. **Easy to own.** Self-hostable in one command, with a single-file database and no external services.

## Who it is for

The project starts as a personal tool for a learner studying Japanese, built in public. It is designed so that other learners can self-host it, and so that contributors can extend it with new content and, eventually, new languages.

## Languages

The product is a language-learning platform where learners **choose what language they want to master**. It is not a Japanese app with other languages bolted on later.

Three concepts are always separate:

- **UI language**: the interface (Bahasa Indonesia or English).
- **Learning language**: the language being learned (Japanese now; more planned).
- **Proficiency framework and level**: where the learner is in that language (JLPT for Japanese; CEFR, HSK, TOPIK for planned languages).

Learners use the platform in their own language while studying another, and learning content such as objectives and instructions is localized too.

## Scope

**Japanese is the first available language, not the architectural boundary of the platform.** The learning engine knows nothing about Japanese, so other languages can be added as modules without rewriting it. The planned order is Japanese, then English, Mandarin Chinese, Spanish, German, French, Korean, Portuguese, Arabic, Italian and Hindi. Planned languages appear in the catalog as "coming soon", with no fake curriculum, until their modules exist. Each new language is added only once the current ones are solid.
