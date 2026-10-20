import { expect, test } from "@playwright/test";

test("dashboard shows the current lesson and recommendation", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome back");
  await expect(page.getByText("Continue learning")).toBeVisible();
  await expect(page.getByText("Today's recommendation")).toBeVisible();
});

test("reading practice grades a typed answer", async ({ page }) => {
  await page.goto("/practice/reading?lesson=hiragana-vowels");
  await page.getByLabel("Type the reading in romaji").fill("zzz");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("status")).toContainText("Answer:");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("2 / 5")).toBeVisible();
});

test("writing practice captures strokes and records a self-assessment", async ({ page }) => {
  await page.goto("/practice/writing?lesson=hiragana-vowels");
  const canvas = page.getByRole("img", { name: /Writing area/ });
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.35, { steps: 8 });
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.3, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/stroke/)).toBeVisible();
  await page.getByRole("button", { name: "Not yet" }).click();
  await expect(page.getByText("2 / 5")).toBeVisible();
});

test("progress lists learning history", async ({ page }) => {
  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Learning history" })).toBeVisible();
});
