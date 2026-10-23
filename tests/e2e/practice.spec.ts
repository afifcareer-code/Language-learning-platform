import { expect, test, type Page } from "@playwright/test";
import { ensureLearning, fakeJapaneseVoice, useEnglish } from "./helpers";

test.beforeEach(async ({ page }) => {
  await ensureLearning(page);
  await useEnglish(page);
});

/** Draw one stroke across the writing area. */
async function drawStroke(page: Page) {
  const box = (await page.getByRole("img", { name: /Writing area/ }).boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.4);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5, { steps: 8 });
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.4, { steps: 8 });
  await page.mouse.up();
}

test("Practice is a skill gym apart from the course: five skills with their stage ladders", async ({
  page,
}) => {
  await page.goto("/practice");
  await expect(page.getByRole("heading", { level: 2, name: "Skill gym" })).toBeVisible();
  const cards = page.getByTestId("skill-gym-card");
  await expect(cards).toHaveCount(5);
  for (const skill of ["Writing", "Reading", "Listening", "Vocabulary", "Grammar"]) {
    await expect(page.getByRole("heading", { level: 3, name: skill, exact: true })).toBeVisible();
  }
  const writing = page.getByRole("list", { name: "Stages for Writing" });
  await expect(writing.getByRole("listitem")).toHaveCount(6);
  await expect(writing).toContainText("Stage 1: Character");
  await expect(writing).toContainText("Stage 2: Word");
  await expect(writing).toContainText("Stage 4: Sentence");
  // Stages that are not built yet are listed, honestly marked, and never offered.
  await expect(writing.getByRole("listitem").nth(5)).toContainText("Planned");
  // Stages are ranked by complexity, not by JLPT level.
  await expect(page.getByTestId("skill-gym-card").first()).not.toContainText(/\bN[1-5]\b/);
  // The dashboard shows the same, separate from course progress.
  await page.goto("/");
  await expect(page.getByText("Practice is separate from your course")).toBeVisible();
});

test("writing a word by hand: the app does not read it, the learner compares and rates, and the stage records it", async ({
  page,
}) => {
  await fakeJapaneseVoice(page);
  await page.goto("/practice");
  const writing = page.getByTestId("skill-gym-card").filter({ hasText: "Writing" }).first();
  await writing.getByRole("link", { name: /Practice stage 1/ }).click();
  await expect(page).toHaveURL(/kind=stage/);
  await expect(page.getByRole("heading", { level: 1, name: "Writing · Character" })).toBeVisible();

  // Go straight to the word stage, which is outside any lesson.
  await page.goto("/practice/session?kind=stage&practiceSkill=writing&stage=word");
  await expect(page.getByText("Write this word by hand in the writing area.")).toBeVisible();
  await expect(page.getByText("The app does not read handwriting")).toBeVisible();
  await drawStroke(page);
  await page.getByRole("button", { name: "Show the model" }).click();
  await expect(page.getByTestId("writing-model")).not.toBeEmpty();
  await page.getByRole("button", { name: "I wrote it correctly" }).click();
  await expect(page.getByRole("status")).toContainText("Correct");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText(/2 of \d+/).first()).toBeVisible();

  // The attempt is recorded against the stage, so the ladder now has evidence for it.
  await page.goto("/practice");
  const word = page
    .getByRole("list", { name: "Stages for Writing" })
    .getByRole("listitem")
    .filter({ hasText: "Stage 2: Word" });
  await expect(word).toContainText(/\d more attempts? to be judged/);
});

test("sentence writing is a stage, and planned stages cannot be opened", async ({ page }) => {
  await page.goto("/practice/session?kind=stage&practiceSkill=writing&stage=sentence");
  await expect(page.getByText("Write this sentence by hand in the writing area.")).toBeVisible();
  const response = await page.goto("/practice/session?kind=stage&practiceSkill=writing&stage=free");
  expect(response?.status()).toBe(404);
});
