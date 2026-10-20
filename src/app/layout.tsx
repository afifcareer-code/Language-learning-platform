import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { BottomNav, SideNav } from "@/components/app-nav";
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-paper text-ink antialiased">
        <div className="md:flex">
          <aside className="sticky top-0 hidden h-dvh w-24 shrink-0 flex-col gap-8 border-r border-line bg-surface px-3 py-6 md:flex xl:w-60">
            <Link href="/" className="flex items-center justify-center gap-2 xl:justify-start xl:px-4">
              <span className="font-jp text-2xl leading-none" aria-hidden="true">
                学
              </span>
              <span className="hidden text-sm leading-tight font-semibold xl:block">
                Language Learning Platform
              </span>
              <span className="sr-only xl:hidden">Language Learning Platform</span>
            </Link>
            <SideNav />
          </aside>
          <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 md:px-8 md:pt-10 md:pb-12">
            {children}
          </main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
