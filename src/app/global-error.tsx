"use client";

import "./globals.css";

/**
 * Last-resort error page, shown when the root layout itself fails (for
 * example when the database is unreachable). It renders outside the i18n
 * provider, so it shows both platform languages.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-paper text-ink antialiased">
        <main className="mx-auto max-w-xl px-4 py-16">
          <h1 className="text-2xl font-semibold">Something went wrong · Terjadi kesalahan</h1>
          <p className="mt-3 text-muted">
            Check the database settings and the server log. · Periksa pengaturan database dan log server.
          </p>
          {error.digest && <p className="mt-2 text-sm text-muted">Ref: {error.digest}</p>}
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-accent px-5 font-medium text-accent-ink"
          >
            Try again · Coba lagi
          </button>
        </main>
      </body>
    </html>
  );
}
