# Local setup

## Requirements

- Node.js **20.9 or newer** (22 recommended; see `.nvmrc`)
- npm (bundled with Node.js)

No database server, Docker or external services are needed for development: without database settings the app uses a local SQLite file. MySQL/MariaDB and PostgreSQL are supported too (see [Deployment](deployment.md)).

## Steps

```bash
npm install
cp .env.example .env      # optional
npm run db:setup          # apply migrations and load content
npm run dev               # http://localhost:3000
```

`db:setup` is idempotent. Run it again after pulling changes to the schema or content.

## Environment variables

| Variable                                                                           | Default                           | Description                                                                                                       |
| ---------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                     | _(unset)_ → `file:./.data/app.db` | Connection URL: `mysql://…`, `postgres://…`, `file:…` or `libsql://…`                                             |
| `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` | _(unset)_                         | Separate settings as shown by hosting panels; used when `DATABASE_URL` is not set                                 |
| `DATABASE_AUTH_TOKEN`                                                              | _(empty)_                         | Auth token for remote libSQL only                                                                                 |
| `AUTO_MIGRATE` / `AUTO_SEED`                                                       | `true`                            | Migrate and load content automatically when the server starts                                                     |
| `DEFAULT_LOCALE`                                                                   | `en`                              | Interface language (`en` or `id`) when the learner has not chosen one and the browser's language is not supported |
| `DEFAULT_LEARNER_NAME`                                                             | `Learner`                         | Display name of the local learner created on first run                                                            |

Database detection lives in [`src/server/db/config.ts`](../../src/server/db/config.ts); the full list of recognised variables is in [Deployment](deployment.md#how-the-database-is-detected). Other settings are validated by [`src/server/env.ts`](../../src/server/env.ts).

## Database workflow

| Task                    | Command                                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Apply migrations        | `npm run db:migrate`                                                                                                                            |
| Load or refresh content | `npm run db:seed`                                                                                                                               |
| Change the schema       | Edit **all three** files in `src/server/db/schema/` (sqlite, mysql, postgres), then run `npm run db:generate` and commit `database/migrations/` |
| Check the connection    | `npm run db:check`                                                                                                                              |
| Browse data             | `npm run db:studio`                                                                                                                             |
| Start fresh             | Delete `.data/` and run `npm run db:setup`                                                                                                      |

## Running in production (self-hosting)

See [Deployment](deployment.md) for cPanel/Plesk, VPS panels, PaaS and SQLite instructions.

v0.1 has no authentication. Keep it on a private network or put it behind an authenticating reverse proxy.

## Tablet testing tips

Handwriting is designed for tablets. To try it on a tablet on your local network, run `npm run dev -- -H 0.0.0.0` and open `http://<your-computer-ip>:3000` on the tablet.
