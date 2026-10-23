import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { LogoMark } from "@/components/logo";
import { getI18n } from "@/localization/server";
import { getContextOrNull } from "@/server/context";
import { readEnv } from "@/server/env";

/** Sign-in and sign-up: available only when accounts are enabled, and not for signed-in learners. */
export default async function AuthLayout({ children }: { children: ReactNode }) {
  if (readEnv().AUTH_MODE !== "accounts") notFound();
  if ((await getContextOrNull()).learner) redirect("/");
  const { t } = await getI18n();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-4 font-semibold md:px-8 md:py-6">
        <LogoMark />
        <span>{t("common.appName")}</span>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 md:px-8">{children}</main>
    </div>
  );
}
