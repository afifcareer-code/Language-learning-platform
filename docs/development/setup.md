# Local setup

## Requirements

- Node.js **20.9 or newer** (22 recommended; see `.nvmrc`)
- npm (bundled with Node.js)

No database server, Docker or external services are needed.

## Steps

```bash
npm install
cp .env.example .env      # optional
npm run db:setup          # apply migrations and load content
npm run dev               # http://localhost:3000
```

`db:setup` is idempotent. Run it again after pulling changes to the schema or content.

## Environment variables

| Variable               | Default               | Description                                                                                                 |
| ---------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`         | `file:./.data/app.db` | libSQL connection URL. A `file:` path is a local SQLite file; `libsql://…` points to a remote libSQL server |
| `DATABASE_AUTH_TOKEN`  | _(empty)_             | Auth token for remote libSQL only                                                                           |
| `DEFAULT_LEARNER_NAME` | `Learner`             | Display name of the local learner created on first run                                                      |

Environment variables are validated by [`src/server/env.ts`](../../src/server/env.ts).

## Database workflow

| Task                    | Command                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| Apply migrations        | `npm run db:migrate`                                                                             |
| Load or refresh content | `npm run db:seed`                                                                                |
| Change the schema       | Edit `src/server/db/schema.ts`, then run `npm run db:generate` and commit `database/migrations/` |
| Browse data             | `npm run db:studio`                                                                              |
| Start fresh             | Delete `.data/` and run `npm run db:setup`                                                       |

## Running in production (self-hosting)

```bash
npm ci
npm run db:setup
npm run build
npm start                 # port 3000; set PORT to change it
```

v0.1 has no authentication. Keep it on a private network or put it behind an authenticating reverse proxy.

## Tablet testing tips

Handwriting is designed for tablets. To try it on a tablet on your local network, run `npm run dev -- -H 0.0.0.0` and open `http://<your-computer-ip>:3000` on the tablet.
