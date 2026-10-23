"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useT } from "@/localization/client";
import { logIn, signUp, type AuthState } from "./actions";

const INPUT =
  "mt-2 min-h-12 w-full rounded-xl border border-line bg-paper px-4 outline-none focus:border-accent";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const t = useT();
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? logIn : signUp, {
    error: null,
  });
  const signup = mode === "signup";
  return (
    <Card className="mx-auto w-full max-w-md">
      <h1 className="text-2xl font-semibold">{t(signup ? "auth.signup.title" : "auth.login.title")}</h1>
      <p className="mt-1 text-sm text-muted">
        {t(signup ? "auth.signup.description" : "auth.login.description")}
      </p>
      <form action={action} className="mt-5 flex flex-col gap-4">
        {signup && (
          <div>
            <label htmlFor="displayName" className="font-medium">
              {t("auth.fields.name")}
            </label>
            <input
              id="displayName"
              name="displayName"
              defaultValue={state.fields?.displayName}
              required
              maxLength={80}
              autoComplete="name"
              className={INPUT}
            />
          </div>
        )}
        <div>
          <label htmlFor="email" className="font-medium">
            {t("auth.fields.email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={state.fields?.email}
            required
            autoComplete="email"
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="password" className="font-medium">
            {t("auth.fields.password")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={signup ? 10 : undefined}
            autoComplete={signup ? "new-password" : "current-password"}
            aria-describedby={signup ? "password-hint" : undefined}
            className={INPUT}
          />
          {signup && (
            <p id="password-hint" className="mt-1 text-sm text-muted">
              {t("auth.fields.passwordHint")}
            </p>
          )}
        </div>
        {state.error && (
          <p role="alert" className="text-danger">
            {t.dynamic(["auth", "errors", state.error], undefined, t("auth.errors.generic"))}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {t(signup ? "auth.signup.submit" : "auth.login.submit")}
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted">
        {t(signup ? "auth.signup.haveAccount" : "auth.login.noAccount")}{" "}
        <Link href={signup ? "/login" : "/signup"} className="font-medium text-accent">
          {t(signup ? "auth.login.title" : "auth.signup.title")}
        </Link>
      </p>
    </Card>
  );
}
