# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- The app opens with language selection ("What do you want to learn?") instead of the Japanese dashboard; the dashboard moved to `/dashboard`. Learners with existing progress go straight to their dashboard.
- Japanese Foundation is split into two courses, Hiragana and Katakana (lesson and activity ids unchanged, so progress is kept). Course files now live in `data/japanese/curriculum/courses/`, listed by `levels.json`.
- Design tokens follow the platform palette (background #F8F9FA, primary #1F2937, accent #6366F1, …). The logo mark is now language-neutral ("A文").
- Database migration `0003`: language catalog fields, `levels.framework_level`, `learner_languages`. Existing databases upgrade automatically.

- Database migrations `0001` and `0002` move curriculum titles into translation tables. Existing databases upgrade automatically on startup.
- Practice routes are now `/activities/<id>` and `/practice/session`, replacing `/practice/reading` and `/practice/writing`.

### Added

- Language catalog (`data/languages.json`): Japanese available; English, Mandarin Chinese, Spanish, German, French and Korean coming soon, with their proficiency frameworks (CEFR, HSK, TOPIK). Coming-soon languages cannot be started.
- Level selection ("Where are you starting?") for a language's framework: Japanese JLPT with Foundation and N5–N1; levels without curriculum are shown as in development.
- Learning language, proficiency level and UI language as separate, persisted choices; per-language current level.
- Global ID / EN switch and learning-language chip in the app shell; `/languages` switcher.
- `LanguageCard` and `ProficiencyCard` components.
- PostgreSQL idle-connection errors are logged instead of crashing the server.
- Activity system: activities with type, skill, difficulty, evaluation strategy, reusable success criteria, pass score and target mastery; measurable, localized objectives, instructions and explanations; a learning outcome at the end of every session.
- Learning loop per lesson, generated from data templates: recognize (multiple choice) → recall (typed) → write (handwriting). New `ja.kana.recognition` skill.
- Localization: Bahasa Indonesia and English interface (`locales/`), locale chosen from the learner's setting, the browser, or `DEFAULT_LOCALE`; a Settings page; content translations in `*_translations` tables; module-owned messages.
- Curriculum levels (Foundation) above courses.
- Three separate progress measures on the dashboard: course progress, skill mastery and learning readiness.
- Confusion pairs: detected from answers, recommended for targeted practice, resolved after correct answers; curated commonly confused kana used as distractors.
- Explainable recommendations with reason codes.
- Design-system components: `ProgressRing`, `LearningProgress`, `MasteryCard`, `ActivityCard`, `PracticePrompt`, `ReviewCard`, `HandwritingCanvas`.
- Project foundation: Next.js App Router, TypeScript, Tailwind CSS, Drizzle ORM, Vitest and Playwright.
- Database support for MySQL/MariaDB, PostgreSQL and SQLite (libSQL), detected automatically from `DATABASE_URL`, hosting-panel `DB_*` variables (cPanel, Plesk, aaPanel) or platform variables (`MYSQL_URL`, `POSTGRES_URL`, `PG*`, …).
- Automatic migrations and content seeding on server start (`AUTO_MIGRATE`, `AUTO_SEED`), serialised with a database lock across processes.
- `server.js` startup file for cPanel/Plesk "Setup Node.js App" and similar panels; `npm run db:check` to verify the detected connection.
- Language-agnostic core learning engine: the `LanguageModule` contract, capabilities and skills, a mastery engine with six states, a Leitner review scheduler, an assessment model, rule-based recommendations and analytics helpers.
- Japanese language module with hiragana and katakana (46 + 46) content, romaji grading and a kana curriculum of 18 lessons.
- Handwriting foundation: Pointer Events stroke capture (pen, touch, mouse; pressure optional), stroke feature extraction, a pluggable analyzer interface with a stroke-count analyzer, writing scoring and progressive guidance stages.
- UI: dashboard, curriculum, lessons, reading-recall practice, writing practice, review queue and progress pages; responsive and tablet-first, with light and dark themes.
- Open-source documentation: README, contributing guide, code of conduct, security policy, and product, architecture and development docs.
