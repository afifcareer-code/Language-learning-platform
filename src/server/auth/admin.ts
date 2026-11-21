import "server-only";
import { getDb } from "../db/client";
import { readEnv } from "../env";
import { sessionAccount } from "./session";

/**
 * Admin check for route handlers: 401 without a session, 403 for a non-admin account.
 * Admin features exist only in accounts mode; in single mode there is nobody to trust.
 */
export async function requireAdmin(): Promise<
  { ok: true; accountId: string } | { ok: false; status: 401 | 403 | 404; error: string }
> {
  if (readEnv().AUTH_MODE !== "accounts")
    return { ok: false, status: 404, error: "Admin features need AUTH_MODE=accounts." };
  const account = await sessionAccount(getDb());
  if (!account) return { ok: false, status: 401, error: "Sign in first." };
  if (account.role !== "admin") return { ok: false, status: 403, error: "Admins only." };
  return { ok: true, accountId: account.accountId };
}
