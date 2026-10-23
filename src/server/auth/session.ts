import "server-only";
import { cookies, headers } from "next/headers";
import { createSession, deleteSession, learnerForSession, SESSION_DAYS } from "./accounts";
import type { Database } from "../db/client";

export const SESSION_COOKIE = "fl_session";

/** The signed-in learner for this request, from the session cookie. */
export async function sessionLearner(db: Database) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? learnerForSession(db, token) : null;
}

export async function startSession(db: Database, accountId: string): Promise<void> {
  const { token, expiresAt } = await createSession(db, accountId);
  const proto = (await headers()).get("x-forwarded-proto");
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: proto === "https",
    path: "/",
    expires: expiresAt,
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function endSession(db: Database): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(db, token);
  jar.delete(SESSION_COOKIE);
}

/** A key to rate-limit sign-in attempts by network origin. */
export async function clientKey(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for") ?? "unknown").split(",")[0]!.trim();
}
