# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Project foundation: Next.js App Router, TypeScript, Tailwind CSS, Drizzle ORM, Vitest and Playwright.
- Database support for MySQL/MariaDB, PostgreSQL and SQLite (libSQL), detected automatically from `DATABASE_URL`, hosting-panel `DB_*` variables (cPanel, Plesk, aaPanel) or platform variables (`MYSQL_URL`, `POSTGRES_URL`, `PG*`, …).
- Automatic migrations and content seeding on server start (`AUTO_MIGRATE`, `AUTO_SEED`), serialised with a database lock across processes.
- `server.js` startup file for cPanel/Plesk "Setup Node.js App" and similar panels; `npm run db:check` to verify the detected connection.
- Language-agnostic core learning engine: the `LanguageModule` contract, capabilities and skills, a mastery engine with six states, a Leitner review scheduler, an assessment model, rule-based recommendations and analytics helpers.
- Japanese language module with hiragana and katakana (46 + 46) content, romaji grading and a kana curriculum of 18 lessons.
- Handwriting foundation: Pointer Events stroke capture (pen, touch, mouse; pressure optional), stroke feature extraction, a pluggable analyzer interface with a stroke-count analyzer, writing scoring and progressive guidance stages.
- UI: dashboard, curriculum, lessons, reading-recall practice, writing practice, review queue and progress pages; responsive and tablet-first, with light and dark themes.
- Open-source documentation: README, contributing guide, code of conduct, security policy, and product, architecture and development docs.
