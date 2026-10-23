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
