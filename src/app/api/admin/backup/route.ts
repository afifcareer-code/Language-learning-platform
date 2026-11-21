import { requireAdmin } from "@/server/auth/admin";
import { exportArchive } from "@/server/backup/backup";
import { getDb } from "@/server/db/client";

export const dynamic = "force-dynamic";

/** Download a backup of all data (except sign-in sessions) as data.tar.gz. Admins only. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.ok) return Response.json({ error: admin.error }, { status: admin.status });
  const now = new Date();
  const archive = await exportArchive(getDb(), now);
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, "-");
  return new Response(new Uint8Array(archive), {
    headers: {
      "content-type": "application/gzip",
      "content-disposition": `attachment; filename="backup-${stamp}.tar.gz"`,
      "cache-control": "no-store",
    },
  });
}
