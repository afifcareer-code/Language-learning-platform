import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { Database } from "../db/client";
import { LOCAL_LEARNER_ID, type Learner } from "../repositories/learners";
import { readEnv } from "../env";
import { hashPassword, verifyPassword } from "./password";

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 200;
export const SESSION_DAYS = 30;

export type SignUpError = "invalid_email" | "weak_password" | "invalid_name" | "email_taken";

export class AccountError extends Error {
  constructor(readonly code: SignUpError) {
    super(code);
  }
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Create an account and its learner. The first account takes over the original
 * single-user learner when nobody owns it yet, so existing progress is kept.
 */
export async function createAccount(
  db: Database,
  input: { email: string; password: string; displayName: string },
): Promise<{ accountId: string; learnerId: string }> {
  const email = normalizeEmail(input.email);
  const name = input.displayName.trim();
  if (email.length > 190 || !EMAIL.test(email)) throw new AccountError("invalid_email");
  if (input.password.length < MIN_PASSWORD_LENGTH || input.password.length > MAX_PASSWORD_LENGTH)
    throw new AccountError("weak_password");
  if (name.length < 1 || name.length > 80) throw new AccountError("invalid_name");

  const { accounts, learners } = db.t;
  const [existing] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.email, email))
    .limit(1);
  if (existing) throw new AccountError("email_taken");

  const passwordHash = await hashPassword(input.password);
  const accountId = randomUUID();
  return db.transaction(async (tx) => {
    const [legacy] = await tx.select().from(learners).where(eq(learners.id, LOCAL_LEARNER_ID)).limit(1);
    const [claimed] = legacy
      ? await tx.select({ id: accounts.id }).from(accounts).where(eq(accounts.learnerId, legacy.id)).limit(1)
      : [];
    let learnerId: string;
    if (legacy && !claimed) {
      learnerId = legacy.id;
      await tx.update(learners).set({ displayName: name }).where(eq(learners.id, learnerId));
    } else {
      learnerId = randomUUID();
      await tx.insert(learners).values({ id: learnerId, displayName: name, targetLanguage: "ja" });
    }
    await tx.insert(accounts).values({ id: accountId, learnerId, email, passwordHash });
    return { accountId, learnerId };
  });
}

// A fixed hash to compare against when the email is unknown, so timing does not reveal accounts.
let dummyHash: Promise<string> | undefined;

/** The account id for valid credentials, otherwise null. */
export async function verifyCredentials(
  db: Database,
  email: string,
  password: string,
): Promise<string | null> {
  const { accounts } = db.t;
  const [account] = await db
    .select({ id: accounts.id, hash: accounts.passwordHash })
    .from(accounts)
    .where(eq(accounts.email, normalizeEmail(email)))
    .limit(1);
  if (!account) {
    dummyHash ??= hashPassword("not-a-real-password");
    await verifyPassword(password, await dummyHash);
    return null;
  }
  return (await verifyPassword(password, account.hash)) ? account.id : null;
}

/**
 * What is stored for a session token: an HMAC keyed by APP_SECRET when it is set (so a leaked
 * database alone cannot be matched to cookies), otherwise a plain SHA-256.
 */
function tokenHash(token: string): string {
  const secret = readEnv().APP_SECRET;
  return secret
    ? createHmac("sha256", secret).update(token).digest("hex")
    : createHash("sha256").update(token).digest("hex");
}

export type AccountRole = "learner" | "admin";

/** The signed-in account behind a session token, with its role. */
export async function accountForSession(
  db: Database,
  token: string,
  now = new Date(),
): Promise<{ accountId: string; learnerId: string; role: AccountRole } | null> {
  const { accountSessions, accounts } = db.t;
  const [row] = await db
    .select({ accountId: accounts.id, learnerId: accounts.learnerId, role: accounts.role })
    .from(accountSessions)
    .innerJoin(accounts, eq(accounts.id, accountSessions.accountId))
    .where(and(eq(accountSessions.tokenHash, tokenHash(token)), gt(accountSessions.expiresAt, now)))
    .limit(1);
  return row ? { ...row, role: row.role === "admin" ? "admin" : "learner" } : null;
}

/**
 * Make sure the admin from ADMIN_EMAIL / ADMIN_PASSWORD exists. A new account is created with
 * that password; an existing account is promoted and keeps its own password. The password is
 * never logged.
 */
export async function ensureAdminAccount(
  db: Database,
  email: string,
  password: string,
): Promise<"created" | "promoted" | "unchanged"> {
  const { accounts } = db.t;
  const normalized = normalizeEmail(email);
  const [existing] = await db
    .select({ id: accounts.id, role: accounts.role })
    .from(accounts)
    .where(eq(accounts.email, normalized))
    .limit(1);
  if (existing) {
    if (existing.role === "admin") return "unchanged";
    await db.update(accounts).set({ role: "admin" }).where(eq(accounts.id, existing.id));
    return "promoted";
  }
  const { accountId } = await createAccount(db, { email: normalized, password, displayName: "Admin" });
  await db.update(accounts).set({ role: "admin" }).where(eq(accounts.id, accountId));
  return "created";
}

export async function createSession(db: Database, accountId: string, now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_DAYS * 86_400_000);
  await db
    .insert(db.t.accountSessions)
    .values({ tokenHash: tokenHash(token), accountId, expiresAt, createdAt: now });
  return { token, expiresAt };
}

export async function deleteSession(db: Database, token: string): Promise<void> {
  await db.delete(db.t.accountSessions).where(eq(db.t.accountSessions.tokenHash, tokenHash(token)));
}

/** The learner of a valid, unexpired session token. */
export async function learnerForSession(
  db: Database,
  token: string,
  now = new Date(),
): Promise<Learner | null> {
  const { accountSessions, accounts, learners } = db.t;
  const [row] = await db
    .select({ learner: learners })
    .from(accountSessions)
    .innerJoin(accounts, eq(accounts.id, accountSessions.accountId))
    .innerJoin(learners, eq(learners.id, accounts.learnerId))
    .where(and(eq(accountSessions.tokenHash, tokenHash(token)), gt(accountSessions.expiresAt, now)))
    .limit(1);
  return row?.learner ?? null;
}

export async function accountEmailForLearner(db: Database, learnerId: string): Promise<string | null> {
  const [row] = await db
    .select({ email: db.t.accounts.email })
    .from(db.t.accounts)
    .where(eq(db.t.accounts.learnerId, learnerId))
    .limit(1);
  return row?.email ?? null;
}

/** A small per-process limiter for sign-in attempts: `limit` per `windowMs` per key. */
const attempts = new Map<string, number[]>();
export function tooManyAttempts(key: string, now = Date.now(), limit = 10, windowMs = 15 * 60_000): boolean {
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > limit;
}
