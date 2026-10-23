# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Introduction before assessment.** Before the first question about characters the learner has not practiced, a teaching screen shows each character with its reading and a Play button ("あ is read as “a”"). Nothing is scored or recorded as an attempt. It is resolved from content data and needs no schema change.
- **Writing feedback separates correctness from precision.** After comparing with the model the learner confirms whether it is the character; the measured stroke count and shape similarity rate it excellent, good or needs improvement. A correct but imprecise character offers **Improve writing** or **Continue anyway** and is never recorded as a failure; a wrong one offers **Try again** and is recorded. Quality and shape score are kept in the existing `writing_samples.analysis` JSON.
- **Change learning language** control (generic `LearningLanguageSwitcher`) in the sidebar and phone header of every learning page. It opens language selection and never touches progress; the interface-language menu stays separate.

### Changed

- Writing no longer asks for a three-way self-grade: it asks whether the character matches the model (Not yet / Yes, it matches).
- Foundation sound recognition is now sound → character: a large labelled **Play sound** button (replayable, never autoplayed) and character options, instead of showing the character and asking for its romaji. Without a Japanese voice on the device it falls back to character → sound and says so.
- Every kana activity instruction states what the learner receives, what to do and what answer is expected (ID/EN). Recall no longer plays the sound before answering; writing is prompted by the sound with a labelled audio button.
- Feedback shows the character with its sound ("あ = a"), one short hint, and "Listen again". The recognition activity's success criteria are now `audio_recognition` and `recognition`; re-run `npm run db:seed` to update existing databases (no schema change).
- Answer options: commonly confused characters first, then the other items of the same lesson. Characters that sound the same (お/を, オ/ヲ) are never offered for each other.
- Practice pages show where the learner is ("Japanese · Foundation · Lesson 1 · Hiragana: Vowels"). Lesson characters can be tapped to hear them. A new learner who chooses a level opens its first lesson instead of the dashboard.
- The interface-language switch is now a menu (`🌐 Bahasa Indonesia ▾`, `🌐 ID ▾` on phones) with radio options; it closes on Escape or outside click.
- The learning-context chip shows language · level · lesson and opens the learning path; the learning language is changed from there.
- `/learn` is now the learning path: where you are, every level with its status, and the lessons of a selected level (`?level=`), with switching between levels that have curriculum.
- Lesson pages show a breadcrumb, the situation and lesson objective, "What you'll learn", and Learn → Practice → Apply → Check.
- Skill mastery and readiness are measured per skill on the items that skill's activities train; the dashboard and progress page show only skills in the current level. The progress page groups items by course.
- Practice supports any content type: words show their meaning as choices, and recall accepts kana, kanji or romaji.
- Database migration `0004`: `content_items.level_id`, `content_item_translations`, `lesson_translations.objective`. Existing databases upgrade automatically.

- The app opens with language selection ("What do you want to learn?") instead of the Japanese dashboard; the dashboard moved to `/dashboard`. Learners with existing progress go straight to their dashboard.
- Japanese Foundation is split into two courses, Hiragana and Katakana (lesson and activity ids unchanged, so progress is kept). Course files now live in `data/japanese/curriculum/courses/`, listed by `levels.json`.
- Design tokens follow the platform palette (background #F8F9FA, primary #1F2937, accent #6366F1, …). The logo mark is now language-neutral ("A文").
- Database migration `0003`: language catalog fields, `levels.framework_level`, `learner_languages`. Existing databases upgrade automatically.

- Database migrations `0001` and `0002` move curriculum titles into translation tables. Existing databases upgrade automatically on startup.
- Practice routes are now `/activities/<id>` and `/practice/session`, replacing `/practice/reading` and `/practice/writing`.

### Added

- Japanese N5, lesson 1 (Introductions), all original content: 12 words, 4 grammar points with explanations, examples and common mistakes, and 6 sentences; activities for word recognition, word recall and sentence building.
- Japanese content models for vocabulary, grammar, sentences and kanji (kanji not populated), linked to JLPT levels; romaji as a temporary scaffold.
- Sentence-building exercise (arrange the pieces).
- Lesson objectives for every lesson, and content validation for lesson objectives, sentence pieces and template content types.
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
