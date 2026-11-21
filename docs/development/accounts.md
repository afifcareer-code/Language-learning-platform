# Accounts

`AUTH_MODE=accounts` turns on email and password sign-in. The default, `single`,
keeps the original behaviour (one local learner, no sign-in), so existing installs
do not change.

- **Data model**: `accounts` (email, password hash, one learner each) and
  `account_sessions` (SHA-256 of the cookie token, expiry). All learning data is
  already keyed by learner, so accounts are isolated from each other.
- **First account**: takes over the original local learner when nobody owns it, so
  progress made before enabling accounts is kept. Later accounts get a new learner.
- **Passwords**: scrypt with a per-password salt (Node `crypto`, no extra service or
  dependency); at least 10 characters. Unknown emails take the same time as wrong
  passwords.
- **Sessions**: random 256-bit token in an `httpOnly`, `sameSite=lax` cookie
  (`secure` when the proxy sends `x-forwarded-proto: https`), valid 30 days, deleted on
  log out.
- **Rate limit**: 10 attempts per 15 minutes per address (and email for log in), kept
  in memory per process. Behind several processes, add a limit at the proxy as well.
- **Roles**: every account is a `learner` except admins. The first admin is created on start from
  `ADMIN_EMAIL` + `ADMIN_PASSWORD` (at least 10 characters; the password is hashed and never logged).
  If the account already exists it is made admin and keeps its own password. Remove `ADMIN_PASSWORD`
  after the first start. Admins get **Settings → Backup and restore**; the backup endpoints answer
  401 without a session and 403 for a learner, and are absent (404) in single mode.
- **APP_SECRET**: when set, session tokens are stored as an HMAC keyed by it instead of a plain
  SHA-256. Keep it stable; changing it signs everyone out. `APP_URL` starting with `https://`
  marks cookies Secure even behind a proxy that does not send `x-forwarded-proto`.
- **Backup**: see [docs/MIGRATION.md](../MIGRATION.md).
- **Not included yet**: password reset, email verification, OAuth, deleting an account.
  Without email sending there is no way to reset a forgotten password except by an
  administrator updating the database.
- Serve over HTTPS in production. No Docker is required: this runs in the same Node
  process and database as the rest of the app.
