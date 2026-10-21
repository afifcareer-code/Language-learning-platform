import { expect, test } from "@playwright/test";
import { useEnglish, switchUiLanguage } from "./helpers";

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
    // Foundation and N5 have curriculum; N4–N1 are in development.
    await expect(page.getByText("In development")).toHaveCount(4);
    await expect(page.getByRole("button", { name: "Start here" })).toHaveCount(2);

    await page.getByRole("button", { name: "Start here" }).first().click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByText("You are here: Japanese · Foundation · Lesson 1 · Hiragana: Vowels"),
    ).toBeVisible();
  });

  test("the choice persists, and the learning language can be changed from the shell", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/dashboard$/);

    // The context in the shell opens the learning path, which links to the language choice.
    await page
      .getByRole("link", { name: /Open learning path: Japanese, Foundation, Lesson 1/ })
      .first()
      .click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your learning path");
    await page.getByRole("link", { name: "Change learning language" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your learning languages");
    await expect(page.getByText("Foundation · In progress")).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test("the interface language switches from the shell without opening Settings", async ({ page }) => {
    await page.goto("/dashboard");
    const menu = page.getByRole("button", { name: "Interface language: English" });
    await menu.click();
    await expect(page.getByRole("menuitemradio", { name: "English" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    // Escape closes the menu without changing anything.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(menu).toBeFocused();

    await switchUiLanguage(page, "Bahasa Indonesia");
    await expect(page.getByRole("link", { name: "Beranda" })).toBeVisible();
    await expect(page.getByText(/Posisi Anda: Bahasa Jepang · Dasar · Pelajaran 1/)).toBeVisible();
    // The learning language is unchanged: still Japanese content.
    await page.goto("/learn/hiragana-vowels");
    await expect(page.getByRole("heading", { name: "Menulis Hiragana あ い う え お" })).toBeVisible();
    await useEnglish(page);
    await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  });
});
