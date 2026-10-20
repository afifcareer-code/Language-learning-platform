# Roadmap

The roadmap is intentionally incremental. Each milestone should leave the product usable.

## v0.1: Foundation (current)

- [x] Language-agnostic core engine: mastery, review, assessment model, recommendations, analytics
- [x] Japanese module: hiragana and katakana, romaji grading, kana curriculum
- [x] Kana reading practice (active recall)
- [x] Handwriting capture with progressive guidance and self-assessment
- [x] Stroke-count analysis
- [x] Review queue, dashboard, progress
- [x] SQLite database with migrations and seed data

## v0.2: Kana complete

- [ ] Kana assessment (uses the existing definition / attempt / result model)
- [ ] Dakuten and handakuten (が, ぱ, …) and combination kana (きゃ, …)
- [ ] Audio pronunciation assets (beyond browser speech synthesis)
- [ ] Error-pattern analytics (for example, confusing シ and ツ)
- [ ] Docker image for self-hosting

## v0.3: Writing quality

- [ ] Stroke-order and stroke-direction data, with license-compatible sourcing
- [ ] Stroke-order and direction checks (`HandwritingAnalyzer` implementations)
- [ ] Shape-similarity scoring
- [ ] Animated stroke-order demonstrations

## v0.4: Words and kanji

- [ ] Vocabulary items and reading/meaning skills
- [ ] Kanji module: readings, meanings, writing
- [ ] JLPT N5 proficiency framework
- [ ] Improved scheduler (FSRS or SM-2) behind the `ReviewScheduler` interface

## Later

- Grammar, sentences, reading and listening comprehension
- Multi-user accounts and authentication
- Import and export of learning data
- Additional languages, once the Japanese experience is mature and the module contract is proven
