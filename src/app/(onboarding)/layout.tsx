import type { ReactNode } from "react";
import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { UiLocaleSwitcher } from "@/features/shell/ui-locale-switcher";
import { getI18n } from "@/localization/server";

/** A quiet shell for choosing what to learn: brand and interface language only. */
export default async function OnboardingLayout({ children }: { children: ReactNode }) {
  const { t } = await getI18n();
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 md:px-8 md:py-6">
        <Link href="/" className="flex items-center gap-3 font-semibold">
          <LogoMark />
          <span>{t("common.appName")}</span>
        </Link>
        <UiLocaleSwitcher />
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 md:px-8">{children}</main>
    </div>
  );
}
