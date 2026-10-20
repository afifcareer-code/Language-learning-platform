/**
 * Runs once when the Next.js server starts. Prepares whichever database the
 * environment points to (see src/server/db/config.ts), so deployments on a
 * hosting panel need no manual migration step. Disable with AUTO_MIGRATE=false
 * and AUTO_SEED=false.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { prepareDatabase } = await import("./server/db/bootstrap");
  try {
    await prepareDatabase();
  } catch (error) {
    console.error("[database] Startup preparation failed. Check your database settings.", error);
    throw error;
  }
}
