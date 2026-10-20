"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-xl py-16">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-muted">
        If this is a fresh checkout, the database may not be set up yet. Run{" "}
        <code className="rounded bg-sunken px-1.5 py-0.5">npm run db:setup</code> and reload.
      </p>
      {error.digest && <p className="mt-2 text-sm text-muted">Error reference: {error.digest}</p>}
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
