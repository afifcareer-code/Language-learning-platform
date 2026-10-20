"use client";

import { Button } from "@/components/ui/button";
import { useT } from "@/localization/client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  return (
    <div className="mx-auto max-w-xl py-16">
      <h1 className="text-2xl font-semibold">{t("common.error.title")}</h1>
      <p className="mt-2 text-muted">{t("common.error.setupHint")}</p>
      {error.digest && (
        <p className="mt-2 text-sm text-muted">{t("common.error.reference", { digest: error.digest })}</p>
      )}
      <Button className="mt-6" onClick={reset}>
        {t("common.actions.tryAgain")}
      </Button>
    </div>
  );
}
