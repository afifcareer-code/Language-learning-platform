# Contributing

Thank you for your interest in improving the Language Learning Platform. This project is in early development, so the most valuable contributions right now are bug reports, small focused fixes, content corrections and feedback on the architecture.

By participating you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Before you start

- **Small fixes** (typos, bugs, content errors): open a pull request directly.
- **Features or architectural changes**: open an issue first so we can agree on the approach. Please read [Architecture overview](docs/architecture/overview.md) before proposing changes to `src/core`.
- **New languages**: we are deliberately building one language well before adding more. Please open a discussion before starting a new language module.

## Development workflow

1. Fork the repository and create a branch from `main`.
2. Set up locally (see [docs/development/setup.md](docs/development/setup.md)):
   ```bash
   npm install
   npm run db:setup
   npm run dev
   ```
3. Make your change, with tests.
4. Run the checks CI will run:
   ```bash
   npm run lint && npm run typecheck && npm test && npm run content:validate
   ```
5. Open a pull request describing **what** changed and **why**.

## Guidelines

- **Keep the core language-agnostic.** Code in `src/core` must not import from `src/languages`, `src/server` or any UI code, and must not mention language-specific concepts. A lint rule and `tests/unit/architecture.test.ts` enforce this.
- **Content is data.** Add or fix Japanese content in `data/japanese/`, never inside components. Run `npm run content:validate` afterwards.
- **Measure learning, not activity.** Features should be grounded in evidence of recall and retention. Avoid metrics based on time spent or lessons clicked.
- **Do not expose unfinished features** in the UI. Hide them until they work.
- **Schema changes** need a migration: edit `src/server/db/schema.ts`, then run `npm run db:generate` and commit the generated files in `database/migrations/`.
- Match the existing code style; Prettier and ESLint are configured (`npm run format`).
- Use [Conventional Commit](https://www.conventionalcommits.org/)-style messages when practical (`feat:`, `fix:`, `docs:`, …).

More detail is in [docs/development/contributing.md](docs/development/contributing.md).

## Content licensing

Only contribute content you have the right to license under Apache 2.0. Many popular language datasets, such as KanjiVG and JMdict, use other licenses (CC BY-SA). Do **not** copy them into this repository without first discussing how to keep the licenses compatible.

## License

By contributing, you agree that your contributions will be licensed under the [Apache License 2.0](LICENSE).

**Why Apache 2.0?** It is a widely used, permissive license that lets anyone use, modify and self-host the project, including commercially. Compared with MIT it adds an explicit patent grant and patent-retaliation clause, which protects users and contributors as the project grows into areas like handwriting recognition and scheduling algorithms. It also makes the contribution terms explicit (section 5), so no separate CLA is needed.
