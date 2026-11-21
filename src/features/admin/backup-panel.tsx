"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/localization/client";

/** Admin: download a backup, or replace all data with one (confirmed by typing IMPOR). */
export function BackupPanel() {
  const t = useT();
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function onImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch("/api/admin/backup/import", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; rows?: number };
      setStatus(
        response.ok
          ? { kind: "ok", text: t("settings.backup.imported", { rows: body.rows ?? 0 }) }
          : { kind: "error", text: body.error ?? t("settings.backup.failed") },
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 grid gap-6">
      <div>
        <a
          href="/api/admin/backup"
          className="inline-flex min-h-11 items-center rounded-xl border border-line px-4 font-medium text-accent"
          data-testid="backup-download"
        >
          {t("settings.backup.download")}
        </a>
        <p className="mt-2 text-sm text-muted">{t("settings.backup.downloadNote")}</p>
      </div>
      <form onSubmit={onImport} className="grid gap-3" aria-labelledby="backup-import-title">
        <h3 id="backup-import-title" className="font-semibold">
          {t("settings.backup.importTitle")}
        </h3>
        <p className="text-sm text-danger">{t("settings.backup.importWarning")}</p>
        <label className="text-sm font-medium" htmlFor="backup-file">
          {t("settings.backup.file")}
        </label>
        <input
          id="backup-file"
          name="file"
          type="file"
          accept=".tar.gz,.tgz,application/gzip"
          required
          className="text-sm"
        />
        <label className="text-sm font-medium" htmlFor="backup-confirm">
          {t("settings.backup.confirm")}
        </label>
        <input
          id="backup-confirm"
          name="confirm"
          autoComplete="off"
          required
          className="min-h-12 rounded-xl border border-line bg-paper px-4 outline-none focus:border-accent"
        />
        <div>
          <Button type="submit" variant="secondary" disabled={busy}>
            {t("settings.backup.import")}
          </Button>
        </div>
        {status && (
          <p role="status" className={status.kind === "ok" ? "text-sm text-success" : "text-sm text-danger"}>
            {status.text}
            {status.kind === "ok" && (
              <>
                {" "}
                <a href="/login" className="font-medium underline">
                  {t("settings.backup.signInAgain")}
                </a>
              </>
            )}
          </p>
        )}
      </form>
    </div>
  );
}
