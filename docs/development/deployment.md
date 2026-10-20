# Deployment

The app is one Node.js process. It works with **MySQL/MariaDB**, **PostgreSQL** or **SQLite**, and **detects the database from the environment** your hosting panel provides. On startup it applies pending migrations and loads the bundled content automatically, so no manual database step is needed.

## How the database is detected

The first match wins:

| Priority | Variables                                                                                                        | Typical source                                           |
| -------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1        | `DATABASE_URL` (or `DB_URL`): `mysql://…`, `mariadb://…`, `postgres://…`, `file:…`, `libsql://…`                 | Coolify, Render, Docker, manual                          |
| 2        | `DB_CONNECTION`, `DB_HOST`, `DB_PORT`, `DB_DATABASE`/`DB_NAME`, `DB_USERNAME`/`DB_USER`, `DB_PASSWORD`/`DB_PASS` | cPanel, Plesk, aaPanel, CyberPanel, Laravel-style `.env` |
| 3        | `MYSQL_URL`, `MYSQLHOST`/`MYSQLPORT`/`MYSQLDATABASE`/`MYSQLUSER`/`MYSQLPASSWORD`                                 | Railway                                                  |
| 3        | `POSTGRES_URL`, `PGHOST`/`PGPORT`/`PGDATABASE`/`PGUSER`/`PGPASSWORD`                                             | Vercel, PostgreSQL defaults                              |
| 4        | _(nothing set)_ → `file:./.data/app.db`                                                                          | Local development                                        |

Notes:

- With `DB_HOST` but no `DB_CONNECTION`, MySQL is assumed (the usual hosting-panel database), unless `DB_PORT=5432`.
- `DB_CONNECTION` accepts `mysql`, `mariadb`, `pgsql`, `postgres`, `postgresql` and `sqlite`.
- Passwords given through `DB_PASSWORD` may contain any characters. In a URL they must be URL-encoded.
- Run **`npm run db:check`** to see what was detected (the password is never printed) and test the connection.
- The server log shows the same line on startup: `[database] Using mysql localhost:3306/… via DB_* variables`.

## Startup behaviour

| Variable       | Default | Effect                                                                    |
| -------------- | ------- | ------------------------------------------------------------------------- |
| `AUTO_MIGRATE` | `true`  | Apply pending migrations from `database/migrations/<dialect>`             |
| `AUTO_SEED`    | `true`  | Load or refresh bundled content and create the local learner (idempotent) |

Several processes may start at once (for example, Passenger on cPanel). Migrations are serialised with a database lock (`GET_LOCK` on MySQL, an advisory lock on PostgreSQL).

MySQL tables are created as `utf8mb4` with `utf8mb4_bin` collation, so Japanese text is stored correctly even when the database itself was created with an older default such as `latin1`.

## cPanel / Plesk ("Setup Node.js App")

1. **Create the database.** In _MySQL® Databases_, create a database and a user, and add the user to the database with **All Privileges**. Note the full names, which include your account prefix (for example `cpuser_llp`).
2. **Upload the code.** Clone with _Git™ Version Control_, or upload the files to a folder such as `~/language-learning-platform`.
3. **Create the application** in _Setup Node.js App_:
   - Node.js version: **20.9 or newer** (22 recommended)
   - Application mode: **Production**
   - Application root: the folder from step 2
   - Application startup file: **`server.js`**
4. **Add environment variables** in the same screen:
   ```
   DB_CONNECTION=mysql
   DB_HOST=localhost
   DB_PORT=3306
   DB_DATABASE=cpuser_llp
   DB_USERNAME=cpuser_app
   DB_PASSWORD=your-password
   ```
   Alternatively, put the same lines in a `.env` file in the application root.
5. **Install and build.** Click _Run NPM Install_, then open the terminal using the `source …/activate` command shown at the top of the page, and run:
   ```bash
   npm run db:check     # optional: verify the connection
   npm run build
   ```
6. **Restart** the application. The first request applies migrations and loads content; check the log if anything fails.

Building needs more memory than running. If the build is killed on a small shared plan, build locally (or in CI) and upload the `.next` folder together with the code.

To update: pull the new code, run `npm install` and `npm run build`, then restart. New migrations are applied automatically.

## VPS panels (aaPanel, CyberPanel) or plain VPS

```bash
npm ci
cp .env.example .env    # fill in DB_* or DATABASE_URL
npm run build
PORT=3000 node server.js   # or: npm start
```

Keep it running with the panel's Node.js project manager, PM2 (`pm2 start server.js --name llp`) or systemd, and put a reverse proxy (Nginx or OpenLiteSpeed) in front of it.

## Coolify, Dokploy, Railway, Render

Create a MySQL or PostgreSQL service and link it so the platform injects `DATABASE_URL` (or `MYSQL_URL`, `POSTGRES_URL`, …). Use:

- Build command: `npm ci && npm run build`
- Start command: `npm start`

## SQLite in production

SQLite works well for a single-user, self-hosted instance. Make sure `.data/` (or the path in `DATABASE_URL`) is on persistent storage, and back up that file.

## Security

v0.1 has **no authentication**. Do not expose it publicly without an authentication layer, such as panel-level password protection, HTTP basic auth on the reverse proxy, or a VPN.
