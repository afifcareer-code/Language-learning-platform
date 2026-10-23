import { describe, expect, it } from "vitest";
import { normalizeEmail, tooManyAttempts } from "@/server/auth/accounts";
import { hashPassword, verifyPassword } from "@/server/auth/password";

describe("password hashing", () => {
  it("verifies the right password and rejects a wrong one, with a salt per hash", async () => {
    const a = await hashPassword("correct horse battery");
    const b = await hashPassword("correct horse battery");
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword("correct horse battery", a)).toBe(true);
    expect(await verifyPassword("correct horse batterz", a)).toBe(false);
    expect(await verifyPassword("anything", "not-a-hash")).toBe(false);
  });

  it("never stores the password itself", async () => {
    expect(await hashPassword("a-secret-passphrase")).not.toContain("a-secret-passphrase");
  });
});

describe("account helpers", () => {
  it("normalizes email case and whitespace", () => {
    expect(normalizeEmail("  Dewi@Example.TEST ")).toBe("dewi@example.test");
  });

  it("limits repeated attempts per key within the window", () => {
    const now = 1_000_000;
    const results = Array.from({ length: 12 }, (_, i) => tooManyAttempts("k1", now + i, 10, 60_000));
    expect(results.slice(0, 10).every((r) => !r)).toBe(true);
    expect(results[10]).toBe(true);
    expect(tooManyAttempts("other", now, 10, 60_000)).toBe(false);
    expect(tooManyAttempts("k1", now + 120_000, 10, 60_000)).toBe(false);
  });
});
