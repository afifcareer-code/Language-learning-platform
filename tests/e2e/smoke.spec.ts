import { expect, test, type Page } from "@playwright/test";

async function useEnglish(page: Page) {
  await page.goto("/settings");
  await page.getByLabel("English").check();
  await page.getByRole("button", { name: /^(Save|Simpan)$/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Settings/);
}

test.beforeEach(async ({ page }) => {
  await useEnglish(page);
});

test("dashboard separates progress, mastery and readiness, and explains the next activity", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome back");
  for (const metric of ["Course progress", "Skill mastery", "Learning readiness"]) {
    await expect(page.getByText(metric, { exact: true })).toBeVisible();
  }
  await expect(page.getByText("Continue learning")).toBeVisible();
  await expect(page.getByText("Objective").first()).toBeVisible();
});

test("lesson lists activities along the learning loop with objectives", async ({ page }) => {
  await page.goto("/learn/hiragana-vowels");
  const cards = page.locator("ol > li");
  await expect(cards).toHaveCount(3);
  await expect(cards.nth(0)).toContainText("Recognize Hiragana");
  await expect(cards.nth(1)).toContainText("from memory");
  await expect(cards.nth(2)).toContainText("Write Hiragana");
});

test("recognition activity ends with a learning outcome", async ({ page }) => {
  await page.goto("/activities/ja.activity.hiragana-vowels.recognition");
  await expect(page.getByText("Objective").first()).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.getByRole("group").getByRole("button").first().click();
    await expect(page.getByRole("status")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
  }
  await expect(page.getByText("Learning outcome")).toBeVisible();
  await expect(page.getByText("Next review")).toBeVisible();
});

test("recall activity grades a typed answer", async ({ page }) => {
  await page.goto("/activities/ja.activity.hiragana-vowels.recall");
  await page.getByLabel("Type the sound of the character in romaji.").fill("zzz");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("status")).toContainText("Answer:");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("2 of 5").first()).toBeVisible();
});

test("writing activity captures strokes and records a self-assessment", async ({ page }) => {
  await page.goto("/activities/ja.activity.hiragana-vowels.writing");
  const canvas = page.getByRole("img", { name: /Writing area/ });
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.35, { steps: 8 });
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.3, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/1 drawn, expected \d/)).toBeVisible();
  await page.getByRole("button", { name: "Not yet" }).click();
  await expect(page.getByRole("status")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("2 of 5").first()).toBeVisible();
});

test("switching the interface to Indonesian keeps the Japanese content", async ({ page }) => {
  await page.goto("/settings");
  await page.getByLabel("Bahasa Indonesia").check();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pengaturan");
  await page.goto("/learn/hiragana-vowels");
  await expect(page.locator("ol > li").nth(2)).toContainText("Menulis Hiragana あ い う え お");
  await page.goto("/");
  await expect(page.getByText("Progres kursus")).toBeVisible();
  await useEnglish(page);
});

test("progress shows confusions and learning history", async ({ page }) => {
  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Commonly confused" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Learning history" })).toBeVisible();
});
