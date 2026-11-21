import { requireAdmin } from "@/server/auth/admin";
import { BackupError, importArchive } from "@/server/backup/backup";
import { getDb } from "@/server/db/client";

export const dynamic = "force-dynamic";
const MAX_UPLOAD = 100 * 1024 * 1024;

/**
 * Replace all data with an uploaded backup. Admins only; the form must send confirm=IMPOR.
 * Every sign-in session ends, including the admin's own.
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return Response.json({ error: admin.error }, { status: admin.status });
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Send the backup as a form upload." }, { status: 400 });
  }
  const file = form.get("file");
  const confirm = String(form.get("confirm") ?? "");
  if (!(file instanceof File) || file.size === 0)
    return Response.json({ error: "Choose a backup file." }, { status: 400 });
  if (file.size > MAX_UPLOAD) return Response.json({ error: "The file is too large." }, { status: 413 });
  try {
    const result = await importArchive(getDb(), Buffer.from(await file.arrayBuffer()), confirm);
    return Response.json({ ok: true, rows: result.rows });
  } catch (e) {
    if (e instanceof BackupError) return Response.json({ error: e.message, code: e.code }, { status: 400 });
    console.error("[backup] import failed", e instanceof Error ? e.message : e);
    return Response.json({ error: "The import failed; nothing was changed." }, { status: 500 });
  }
}
