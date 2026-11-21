# Moving to another domain, server or database

Accounts and progress live in the database. Lessons, kanji, Tatoeba sentences and Aozora
excerpts are files in this repository and are reloaded into the database on every start, so
they never need to be moved by hand.

## What has to stay the same

| Setting                                              | Why                                                                                                                                          |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| The database (or a backup restored into the new one) | Accounts, progress, reviews, attempts.                                                                                                       |
| `APP_SECRET`                                         | Sign-in sessions are stored as HMACs keyed by it. Keep it to keep everyone signed in; changing it only signs everyone out (no data is lost). |
| `AUTH_MODE=accounts`                                 | Accounts only exist in this mode.                                                                                                            |

`APP_URL` and the database address may change freely: nothing in the data depends on them.

## A. New domain, same server and database

1. In the hosting panel, point the new domain at the app.
2. Set `APP_URL` to the new address (e.g. `https://belajar.example.com`). With `https`, cookies are marked Secure.
3. Restart the app. Accounts, progress and sessions stay as they are.

## B. New server or new database (backup and restore)

1. On the old server, sign in as an admin, open **Settings → Backup and restore**, and click **Download backup**.
   You get `backup-YYYY-MM-DD-hh-mm-ss.tar.gz` with one `data.json` inside: every table except sign-in sessions.
   Keep it private: it contains every account (password hashes, never plain passwords).
2. Deploy the app on the new server with a new, empty database (MySQL/MariaDB or PostgreSQL). Set
   `AUTH_MODE=accounts`, the same `APP_SECRET`, `APP_URL`, and for this first start `ADMIN_EMAIL` +
   `ADMIN_PASSWORD` (at least 10 characters). Start it: migrations run and the admin is created.
3. Remove `ADMIN_PASSWORD` from the panel and restart.
4. Sign in as that admin, choose a language once (settings are behind it), open **Settings → Backup and restore**,
   choose the backup file, type **IMPOR** and click **Restore backup**.
   All data on the new server is replaced by the backup in one transaction (if anything fails, nothing
   changes). Everyone is signed out; sign in again with the accounts from the old server.
5. Point the domain at the new server.

## C. MySQL to PostgreSQL (or back)

The backup is database-neutral. Follow B with a PostgreSQL database on the new side
(`DB_CONNECTION=pgsql` with `DB_HOST`…, or `DATABASE_URL=postgres://…`). This was tested in both
directions between SQLite, MySQL (MariaDB) and PostgreSQL.

## Without an admin account

Backup and restore are admin features and only exist with `AUTH_MODE=accounts`. A deployment in
`single` mode has no sign-in, so the page is not offered (anyone could otherwise replace the data).
To move a single-mode install, switch it to accounts mode first (the first account takes over the
existing learner and its progress), then follow B. A database dump made in the hosting panel
(phpMyAdmin / pgAdmin export) also works between servers of the same database type.
