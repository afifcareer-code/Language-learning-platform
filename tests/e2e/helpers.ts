import { expect, type Page } from "@playwright/test";

/** Make sure the learner has a learning language (Japanese · Foundation), completing onboarding if needed. */
export async function ensureLearning(page: Page) {
  await page.goto("/dashboard");
  if (new URL(page.url()).pathname === "/") {
    await page
      .getByRole("link", { name: /日本語/ })
      .first()
      .click();
    await page
      .getByRole("button", { name: /^(Start here|Mulai di sini)$/ })
      .first()
      .click();
    await expect(page).toHaveURL(/\/dashboard$/);
  }
}

/** Choose the interface language from the global menu in the app shell (not Settings). */
export async function switchUiLanguage(page: Page, name: "English" | "Bahasa Indonesia") {
  const menu = page.getByRole("button", { name: /^(Interface language|Bahasa antarmuka): / });
  if ((await menu.getAttribute("aria-label"))?.endsWith(`: ${name}`)) return;
  await menu.click();
  await page.getByRole("menuitemradio", { name }).click();
  await expect(page.getByRole("button", { name: new RegExp(`: ${name}$`) })).toBeVisible();
}

/** Switch the interface to English with the global menu. */
export async function useEnglish(page: Page) {
  await switchUiLanguage(page, "English");
}
