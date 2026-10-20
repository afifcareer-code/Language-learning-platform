import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { BottomNav, MobileSettingsLink, SideNav } from "@/components/app-nav";
import { I18nProvider } from "@/localization/client";
import { FALLBACK_LOCALE } from "@/localization/config";
import { getMessages } from "@/localization/messages";
import { getI18n } from "@/localization/server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Language Learning Platform", template: "%s · Language Learning Platform" },
  description:
    "An open-source adaptive language learning platform focused on mastery, active recall, progressive practice, and personalized learning.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#141413" },
  ],
};

// Every page reads learner state from the database.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { locale, messages, t } = await getI18n();
  return (
    <html lang={locale}>
      <body className="min-h-dvh bg-paper text-ink antialiased">
        <I18nProvider
          locale={locale}
          messages={messages}
          fallbackMessages={locale === FALLBACK_LOCALE ? undefined : getMessages(FALLBACK_LOCALE)}
        >
          <div className="md:flex">
            <aside className="sticky top-0 hidden h-dvh w-24 shrink-0 flex-col gap-8 border-r border-line bg-surface px-3 py-6 md:flex xl:w-60">
              <Link href="/" className="flex items-center justify-center gap-2 xl:justify-start xl:px-4">
                <span className="font-jp text-2xl leading-none" aria-hidden="true">
                  学
                </span>
                <span className="hidden text-sm leading-tight font-semibold xl:block">
                  {t("common.appName")}
                </span>
                <span className="sr-only xl:hidden">{t("common.appName")}</span>
              </Link>
              <SideNav />
            </aside>
            <div className="flex min-w-0 flex-1 flex-col">
              <header className="flex items-center justify-between px-4 pt-3 md:hidden">
                <Link href="/" className="flex items-center gap-2 font-semibold">
                  <span className="font-jp text-xl" aria-hidden="true">
                    学
                  </span>
                  <span className="text-sm">{t("common.appName")}</span>
                </Link>
                <MobileSettingsLink />
              </header>
              <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-28 md:px-8 md:pt-10 md:pb-12">
                {children}
              </main>
            </div>
          </div>
          <BottomNav />
        </I18nProvider>
      </body>
    </html>
  );
}
