import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  accountForSession,
  createAccount,
  createSession,
  ensureAdminAccount,
  verifyCredentials,
} from "@/server/auth/accounts";
import { exportArchive, exportData, importArchive, parseArchive } from "@/server/backup/backup";
import { readTarGz, writeTarGz } from "@/server/backup/tar";
import { prepareDatabase } from "@/server/db/bootstrap";
import { createDatabase, type Database } from "@/server/db/client";
import { recordAttempt } from "@/server/services/learning";
import { createTestDatabase, TEST_DIALECTS, type TestDatabase } from "./databases";

const quiet = { log: () => {} };

async function freshDb(dialect: (typeof TEST_DIALECTS)[number]) {
  const testDb = await createTestDatabase(dialect.dialect, dialect.serverUrl);
  const db = createDatabase(testDb.config);
  await prepareDatabase(db, { migrate: true, seed: true, ...quiet });
  return { testDb, db };
}

async function progressCount(db: Database, learnerId: string) {
  const { learningAttempts } = db.t;
  const { eq } = await import("drizzle-orm");
  return (await db.select().from(learningAttempts).where(eq(learningAttempts.learnerId, learnerId))).length;
}

describe("tar archives", () => {
  it("round-trips files and rejects damaged archives", () => {
    const archive = writeTarGz([{ name: "data.json", data: Buffer.from('{"a":1}') }]);
    expect(readTarGz(archive).get("data.json")!.toString()).toBe('{"a":1}');
    expect(() => readTarGz(Buffer.from("not gzip"))).toThrow();
    expect(() => readTarGz(gzipSync(Buffer.alloc(600, 7)))).toThrow(/damaged|truncated/);
  });
});

describe.each(TEST_DIALECTS)("accounts, admin and backup on $dialect", (dialect) => {
  let testDb: TestDatabase;
  let db: Database;
  let alice: { accountId: string; learnerId: string };
  let bob: { accountId: string; learnerId: string };

  beforeAll(async () => {
    ({ testDb, db } = await freshDb(dialect));
    alice = await createAccount(db, {
      email: "alice@example.test",
      password: "alice-password-1",
      displayName: "Alice",
    });
    bob = await createAccount(db, {
      email: "bob@example.test",
      password: "bob-password-22",
      displayName: "Bob",
    });
    // Progress of two learners in their own target languages must stay apart.
    const [item] = await db.select().from(db.t.activityItems).limit(1);
    const [activity] = await db.select().from(db.t.activities).limit(1);
    await recordAttempt(db, {
      learnerId: alice.learnerId,
      contentItemId: item!.contentItemId,
      skill: activity!.skill as never,
      mode: "practice",
      correct: true,
      score: 1,
    });
  }, 240_000);
  afterAll(async () => {
    await db?.close();
    await testDb?.drop();
  });

  it("creates the admin from env once, never resets a password, and gives other accounts no admin role", async () => {
    expect(await ensureAdminAccount(db, "Admin@Example.test", "admin-password-1")).toBe("created");
    expect(await ensureAdminAccount(db, "admin@example.test", "another-password")).toBe("unchanged");
    expect(await verifyCredentials(db, "admin@example.test", "admin-password-1")).not.toBeNull();
    expect(await verifyCredentials(db, "admin@example.test", "another-password")).toBeNull();

    const { token: userToken } = await createSession(db, bob.accountId);
    expect((await accountForSession(db, userToken))?.role).toBe("learner");
    expect(await accountForSession(db, "no-such-token")).toBeNull();

    expect(await ensureAdminAccount(db, "bob@example.test", "ignored-password")).toBe("promoted");
    expect((await accountForSession(db, userToken))?.role).toBe("admin");
    expect(await verifyCredentials(db, "bob@example.test", "bob-password-22")).not.toBeNull();
  });

  it("session tokens are bound to APP_SECRET", async () => {
    const before = process.env.APP_SECRET;
    process.env.APP_SECRET = "first-secret-that-is-long-enough-123";
    const { token } = await createSession(db, alice.accountId);
    expect(await accountForSession(db, token)).not.toBeNull();
    process.env.APP_SECRET = "a-different-secret-that-is-long-456";
    expect(await accountForSession(db, token)).toBeNull();
    if (before === undefined) delete process.env.APP_SECRET;
    else process.env.APP_SECRET = before;
  });

  it("exports every table except sign-in sessions, and restores it exactly", async () => {
    const data = await exportData(db);
    expect(Object.keys(data.tables)).not.toContain("accountSessions");
    expect(data.tables.accounts!.length).toBe(3);
    expect(JSON.stringify(data)).not.toContain("alice-password-1");

    const archive = await exportArchive(db);
    const target = await freshDb(dialect);
    try {
      const { rows } = await importArchive(target.db, archive, "IMPOR");
      expect(rows).toBeGreaterThan(1000);
      const again = await exportData(target.db);
      for (const [name, list] of Object.entries(data.tables))
        expect(again.tables[name], name).toHaveLength(list.length);
      expect(await progressCount(target.db, alice.learnerId)).toBe(1);
      expect(await progressCount(target.db, bob.learnerId)).toBe(0);
      // Accounts and passwords survive the move; sessions do not.
      expect(await verifyCredentials(target.db, "alice@example.test", "alice-password-1")).not.toBeNull();
      expect(await target.db.select().from(target.db.t.accountSessions)).toHaveLength(0);
    } finally {
      await target.db.close();
      await target.testDb.drop();
    }
  }, 240_000);

  it("refuses a restore without the confirmation word, or from a broken or foreign file, and changes nothing", async () => {
    const before = (await exportData(db)).tables;
    const archive = await exportArchive(db);
    await expect(importArchive(db, archive, "impor")).rejects.toThrow(/IMPOR/);
    await expect(importArchive(db, Buffer.from("garbage"), "IMPOR")).rejects.toMatchObject({
      code: "archive",
    });
    await expect(
      importArchive(db, writeTarGz([{ name: "other.txt", data: Buffer.from("x") }]), "IMPOR"),
    ).rejects.toMatchObject({ code: "missing_data" });
    await expect(
      importArchive(db, writeTarGz([{ name: "data.json", data: Buffer.from("{not json") }]), "IMPOR"),
    ).rejects.toMatchObject({ code: "format" });
    const tampered = parseArchive(db, archive);
    (tampered.tables.accounts![0] as Record<string, unknown>).isAdmin = true;
    await expect(
      importArchive(
        db,
        writeTarGz([{ name: "data.json", data: Buffer.from(JSON.stringify(tampered)) }]),
        "IMPOR",
      ),
    ).rejects.toMatchObject({ code: "columns" });
    const after = (await exportData(db)).tables;
    for (const [name, list] of Object.entries(before)) expect(after[name], name).toHaveLength(list.length);
  }, 120_000);
});

describe.skipIf(TEST_DIALECTS.length < 2)("moving between databases", () => {
  it("a backup from one database restores into each of the others", async () => {
    const [from, ...others] = TEST_DIALECTS;
    const source = await freshDb(from!);
    try {
      await createAccount(source.db, {
        email: "move@example.test",
        password: "move-password-1",
        displayName: "Mover",
      });
      const archive = await exportArchive(source.db);
      const counts = Object.fromEntries(
        Object.entries((await exportData(source.db)).tables).map(([k, v]) => [k, v.length]),
      );
      for (const d of others) {
        const target = await freshDb(d);
        try {
          await importArchive(target.db, archive, "IMPOR");
          const again = await exportData(target.db);
          for (const [k, n] of Object.entries(counts))
            expect(again.tables[k], `${d.dialect} ${k}`).toHaveLength(n);
          expect(await verifyCredentials(target.db, "move@example.test", "move-password-1")).not.toBeNull();
        } finally {
          await target.db.close();
          await target.testDb.drop();
        }
      }
    } finally {
      await source.db.close();
      await source.testDb.drop();
    }
  }, 600_000);
});
