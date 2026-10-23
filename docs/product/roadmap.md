# Roadmap

The roadmap is intentionally incremental. Each milestone should leave the product usable.

## Languages

| Order | Language                           | Framework | Status                                                       |
| ----- | ---------------------------------- | --------- | ------------------------------------------------------------ |
| 1     | Japanese                           | JLPT      | Available (Foundation, N5 lessons 1–6; N4–N1 in development) |
| 2     | English                            | CEFR      | Coming soon                                                  |
| 3     | Mandarin Chinese                   | HSK       | Coming soon                                                  |
| 4     | Spanish                            | CEFR      | Coming soon                                                  |
| 5     | German                             | CEFR      | Coming soon                                                  |
| 6     | French                             | CEFR      | Coming soon                                                  |
| 7     | Korean                             | TOPIK     | Coming soon                                                  |
| 8–11  | Portuguese, Arabic, Italian, Hindi | —         | Planned (not yet in the catalog)                             |

## v0.1: Foundation (current)

- [x] Language-agnostic core engine: mastery, review, assessment model, recommendations, analytics
- [x] Japanese module: hiragana and katakana, romaji grading, kana curriculum
- [x] Activity system: measurable, localized objectives, success criteria and learning outcomes
- [x] Learning loop per lesson: recognize → recall → write
- [x] Localization: interface in Indonesian and English, localized content, locale switching
- [x] Course progress, skill mastery and learning readiness as separate measures
- [x] Confusion pairs: detection, targeted practice, remediation
- [x] Handwriting capture with progressive guidance and self-assessment
- [x] Stroke-count analysis
- [x] Review queue, dashboard, progress
- [x] Language selection as the entry point; learning language, proficiency level and UI language as separate, persisted choices
- [x] Language catalog with coming-soon languages; JLPT levels (Foundation, N5–N1) for Japanese
- [x] Global ID / EN switch and learning-language switch in the app shell
- [x] MySQL/MariaDB, PostgreSQL and SQLite with automatic detection, migrations and seeding on startup
- [x] Interface-language menu and "where am I" context (language · level · lesson) in the app shell
- [x] Learning path with level statuses (current, completed, in progress, recommended, available, in development)
- [x] Lesson structure: situation, lesson objective, "What you'll learn", Learn → Practice → Apply → Check
- [x] Japanese content models for vocabulary, grammar, sentences and kanji, linked to JLPT levels; localized content translations

## v0.2: Kana complete, N5 begins

- [ ] Kana assessment and an Assessment page (uses the existing definition / attempt / result model)
- [ ] N5 curriculum, structured as situation → vocabulary → grammar → pattern practice → listening → reading → production → review (original content). Lessons 1-6 are done (sentence-level reading and listening included); passages and conversations are not
- [x] Basic vocabulary written in kana, with localized meanings; word recognition, word recall and sentence building
- [x] Dakuten and handakuten (が, ぱ, …) and combination kana (きゃ, …)
- [ ] Audio pronunciation assets (beyond browser speech synthesis)
- [ ] Docker image for self-hosting

## v0.3: Writing quality

- [ ] Stroke-order and stroke-direction data, with license-compatible sourcing
- [ ] Stroke-order and direction checks (`HandwritingAnalyzer` implementations)
- [ ] Shape-similarity scoring
- [ ] Animated stroke-order demonstrations

## v0.4: Words and kanji

- [x] Vocabulary items and recognition/recall skills
- [ ] Kanji content and skills: readings, meanings, writing (the model exists)
- [ ] JLPT N5 proficiency framework
- [ ] Improved scheduler (FSRS or SM-2) behind the `ReviewScheduler` interface

## Later

- Grammar, sentences, reading and listening comprehension
- Multi-user accounts and authentication
- Import and export of learning data
- Additional languages in roadmap order, each as a module with its own curriculum, once the Japanese experience is mature
- AI-assisted features (coach, explanations, generated practice, pronunciation and handwriting feedback), behind the same activity, evaluation and recommendation interfaces. Only when there is a concrete product need
