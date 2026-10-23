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
- **Not included yet**: password reset, email verification, OAuth, deleting an account.
  Without email sending there is no way to reset a forgotten password except by an
  administrator updating the database.
- Serve over HTTPS in production. No Docker is required: this runs in the same Node
  process and database as the rest of the app.
