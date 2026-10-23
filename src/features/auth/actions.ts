"use server";

import { redirect } from "next/navigation";
import { AccountError, createAccount, tooManyAttempts, verifyCredentials } from "@/server/auth/accounts";
import { clientKey, endSession, startSession } from "@/server/auth/session";
import { getContextOrNull } from "@/server/context";
import { readEnv } from "@/server/env";

/** `fields` are returned on error so the form does not lose what was typed (never the password). */
export type AuthState = { error: string | null; fields?: { email: string; displayName: string } };

const text = (form: FormData, key: string) =>
  typeof form.get(key) === "string" ? (form.get(key) as string) : "";

const fieldsOf = (form: FormData) => ({ email: text(form, "email"), displayName: text(form, "displayName") });

function accountsEnabled(): boolean {
  return readEnv().AUTH_MODE === "accounts";
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  if (!accountsEnabled()) return { error: "disabled" };
  const { db } = await getContextOrNull();
  if (tooManyAttempts(`signup:${await clientKey()}`)) return { error: "too_many", fields: fieldsOf(form) };
  try {
    const { accountId } = await createAccount(db, {
      email: text(form, "email"),
      password: text(form, "password"),
      displayName: text(form, "displayName"),
    });
    await startSession(db, accountId);
  } catch (error) {
    if (error instanceof AccountError) return { error: error.code, fields: fieldsOf(form) };
    throw error;
  }
  redirect("/");
}

export async function logIn(_: AuthState, form: FormData): Promise<AuthState> {
  if (!accountsEnabled()) return { error: "disabled" };
  const { db } = await getContextOrNull();
  const email = text(form, "email").trim().toLowerCase();
  if (tooManyAttempts(`login:${await clientKey()}:${email}`))
    return { error: "too_many", fields: fieldsOf(form) };
  const accountId = await verifyCredentials(db, email, text(form, "password"));
  if (!accountId) return { error: "invalid_credentials", fields: fieldsOf(form) };
  await startSession(db, accountId);
  redirect("/");
}

export async function logOut(): Promise<void> {
  const { db } = await getContextOrNull();
  await endSession(db);
  redirect("/login");
}
