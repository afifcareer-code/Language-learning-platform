import { expect, test } from "@playwright/test";
import { useEnglish } from "./helpers";

// Runs first, against a fresh database: the learner has not chosen a language yet.
test.describe.serial("choosing what to learn", () => {
  test("a new learner is asked what to learn, and learning pages wait for that choice", async ({ page }) => {
    await page.goto("/");
    await useEnglish(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("What do you want to learn?");

    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/$/);
    await page.goto("/learn");
    await expect(page).toHaveURL(/\/$/);
  });

  test("Japanese is available; planned languages are shown but cannot be opened", async ({ page }) => {
    await page.goto("/");
    const japanese = page.getByRole("link", { name: /日本語/ });
    await expect(japanese).toContainText("Japanese");
    await expect(japanese).toContainText("JLPT");
    for (const name of ["English", "Mandarin Chinese", "Spanish", "German", "French", "Korean"]) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
      await expect(page.getByRole("link", { name: new RegExp(name) })).toHaveCount(0);
    }
    await expect(page.getByText("Coming soon").first()).toBeVisible();

    await page.goto("/languages/en");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });

  test("Japanese shows the JLPT path; only levels with curriculum can be started", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /日本語/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Where are you starting?");
    for (const level of ["Foundation", "N5", "N4", "N3", "N2", "N1"]) {
      await expect(page.getByText(level, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText("In development")).toHaveCount(5);
    await expect(page.getByRole("button", { name: "Start here" })).toHaveCount(1);

    await page.getByRole("button", { name: "Start here" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText("Learning Japanese · Foundation")).toBeVisible();
  });

  test("the choice persists, and the learning language can be changed from the shell", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard$/);

    await page
      .getByRole("link", { name: /Change learning language/ })
      .first()
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your learning languages");
    await expect(page.getByText("Foundation · In progress")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("the interface language switches from the shell without opening Settings", async ({ page }) => {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Bahasa Indonesia", exact: true }).click();
    await expect(page.getByRole("link", { name: "Beranda" })).toBeVisible();
    await expect(page.getByText("Belajar Bahasa Jepang · Dasar")).toBeVisible();
    // The learning language is unchanged: still Japanese content.
    await page.goto("/learn/hiragana-vowels");
    await expect(page.locator("ol > li").nth(2)).toContainText("Menulis Hiragana あ い う え お");
    await useEnglish(page);
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  });
});
