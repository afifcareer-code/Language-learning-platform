import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { I18nProvider } from "@/localization/client";
import { FALLBACK_LOCALE } from "@/localization/config";
import { getMessages } from "@/localization/messages";
import { getI18n } from "@/localization/server";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Language Learning Platform", template: "%s · Language Learning Platform" },
  description:
    "An open-source adaptive language learning platform focused on mastery, active recall, progressive practice, personalized learning, and spaced review.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f9fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1115" },
  ],
};

// Every page reads learner state from the database.
export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { locale, messages } = await getI18n();
  return (
    <html lang={locale}>
      <body className="min-h-dvh bg-paper text-ink antialiased">
        <I18nProvider
          locale={locale}
          messages={messages}
          fallbackMessages={locale === FALLBACK_LOCALE ? undefined : getMessages(FALLBACK_LOCALE)}
        >
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
