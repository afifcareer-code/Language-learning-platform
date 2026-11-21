import { expect, test } from "@playwright/test";
import { randomBytes } from "node:crypto";

// Runs against a second server with AUTH_MODE=accounts. The values are throwaway test credentials.
const credentials = () => ({
  email: `learner-${randomBytes(4).toString("hex")}@example.test`,
  password: randomBytes(9).toString("base64url"),
});

async function signUp(page: import("@playwright/test").Page, name: string, email: string, password: string) {
  await page.goto("/signup");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
}

test.describe.serial("accounts", () => {
  const me = credentials();

  test("signed-out visitors are sent to log in", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Log in");
  });

  test("a new account starts at language selection and its progress is its own", async ({ page }) => {
    await signUp(page, "Dewi", me.email, me.password);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("What do you want to learn?");
    await page
      .getByRole("link", { name: /日本語/ })
      .first()
      .click();
    await page
      .getByRole("button", { name: /^Start here$/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/(dashboard|learn\/[a-z0-9-]+)$/);

    await page.goto("/settings");
    await expect(page.getByText(`Signed in as ${me.email}`)).toBeVisible();
  });

  test("logging out and back in returns to the same learner", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(me.email);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.locator("form [role=alert]")).toContainText("Email or password is incorrect.");

    await page.getByLabel("Password").fill(me.password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText(/Dewi/).first()).toBeVisible();

    await page.goto("/settings");
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("a second account does not see the first one's choice", async ({ page }) => {
    const other = credentials();
    await signUp(page, "Budi", other.email, other.password);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("What do you want to learn?");
  });

  test("rejects a short password and a taken email", async ({ page }) => {
    const other = credentials();
    await signUp(page, "Siti", other.email, "short");
    // The browser blocks a short password before it is sent (the server also rejects it).
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByLabel("Password")).toHaveJSProperty("validity.tooShort", true);
    await signUp(page, "Siti", me.email, "another-long-password");
    await expect(page.locator("form [role=alert]")).toContainText("already exists");
  });
});

async function chooseJapanese(page: import("@playwright/test").Page) {
  await page.goto("/languages");
  await page
    .getByRole("link", { name: /日本語/ })
    .first()
    .click();
  await page
    .getByRole("button", { name: /^Start here$/ })
    .first()
    .click();
  await expect(page).toHaveURL(/\/(dashboard|learn\/[a-z0-9-]+)$/);
}

test.describe.serial("admin backup", () => {
  const admin = { email: "admin@example.test", password: "e2e-admin-password" };

  async function logIn(page: import("@playwright/test").Page, email: string, password: string) {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page).not.toHaveURL(/\/login$/);
  }

  test("without a session the backup endpoints answer 401", async ({ request }) => {
    expect((await request.get("/api/admin/backup")).status()).toBe(401);
    expect(
      (await request.post("/api/admin/backup/import", { multipart: { confirm: "IMPOR" } })).status(),
    ).toBe(401);
  });

  test("a learner account cannot see or use backups", async ({ page }) => {
    const user = credentials();
    await signUp(page, "Rina", user.email, user.password);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("What do you want to learn?");
    await chooseJapanese(page);
    await page.goto("/settings");
    await expect(page.getByText(`Signed in as ${user.email}`)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Backup and restore/ })).toHaveCount(0);
    expect((await page.request.get("/api/admin/backup")).status()).toBe(403);
    const upload = await page.request.post("/api/admin/backup/import", {
      multipart: {
        confirm: "IMPOR",
        file: { name: "x.tar.gz", mimeType: "application/gzip", buffer: Buffer.from("x") },
      },
    });
    expect(upload.status()).toBe(403);
  });

  test("the admin downloads a backup, broken or unconfirmed restores are refused, and a good one restores", async ({
    page,
  }) => {
    await logIn(page, admin.email, admin.password);
    await chooseJapanese(page);
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Backup and restore (admin)" })).toBeVisible();

    const download = await page.request.get("/api/admin/backup");
    expect(download.status()).toBe(200);
    expect(download.headers()["content-disposition"]).toMatch(/attachment; filename="backup-.*\.tar\.gz"/);
    const archive = await download.body();
    const { gunzipSync } = await import("node:zlib");
    const tar = gunzipSync(archive).toString("utf8");
    expect(tar).toContain("data.json");
    expect(tar).toContain(admin.email);
    expect(tar).not.toContain(admin.password);

    const file = page.getByLabel("Backup file (.tar.gz)");
    const confirm = page.getByLabel("Type IMPOR to confirm");
    const submit = page.getByRole("button", { name: "Restore backup" });

    await file.setInputFiles({ name: "backup.tar.gz", mimeType: "application/gzip", buffer: archive });
    await confirm.fill("impor");
    await submit.click();
    await expect(page.locator("form [role=status]")).toContainText("IMPOR");

    await file.setInputFiles({
      name: "broken.tar.gz",
      mimeType: "application/gzip",
      buffer: Buffer.from("not a backup"),
    });
    await confirm.fill("IMPOR");
    await submit.click();
    await expect(page.locator("form [role=status]")).toContainText(/gzip|archive/);

    // Still signed in: refused restores changed nothing.
    await page.goto("/settings");
    await expect(page.getByText(`Signed in as ${admin.email}`)).toBeVisible();

    await file.setInputFiles({ name: "backup.tar.gz", mimeType: "application/gzip", buffer: archive });
    await confirm.fill("IMPOR");
    await submit.click();
    await expect(page.locator("form [role=status]")).toContainText("Everyone has been signed out");
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login$/);
    await logIn(page, admin.email, admin.password);
  });
});
