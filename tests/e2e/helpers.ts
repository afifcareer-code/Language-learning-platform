import { expect, type Page } from "@playwright/test";

/** Make sure the learner has a learning language (Japanese · Foundation), completing onboarding if needed. */
export async function ensureLearning(page: Page) {
  await page.goto("/dashboard");
  if (new URL(page.url()).pathname === "/") {
    await page
      .getByRole("link", { name: /日本語/ })
      .first()
      .click();
    await page.getByRole("button", { name: /^(Start here|Mulai di sini)$/ }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  }
}

/** Switch the interface to English with the global switcher (not Settings). */
export async function useEnglish(page: Page) {
  const english = page.getByRole("button", { name: "English", exact: true });
  if ((await english.getAttribute("aria-pressed")) !== "true") {
    await english.click();
    await expect(english).toHaveAttribute("aria-pressed", "true");
  }
}
