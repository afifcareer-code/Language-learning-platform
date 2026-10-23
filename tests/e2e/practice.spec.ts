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

test("Practice is a skill gym apart from the course: six skills with their stage ladders", async ({
  page,
}) => {
  await page.goto("/practice");
  await expect(page.getByRole("heading", { level: 2, name: "Skill gym" })).toBeVisible();
  const cards = page.getByTestId("skill-gym-card");
  await expect(cards).toHaveCount(6);
  for (const skill of ["Writing", "Kanji", "Reading", "Listening", "Vocabulary", "Grammar"]) {
    await expect(page.getByRole("heading", { level: 3, name: skill, exact: true })).toBeVisible();
  }
  const writing = page.getByRole("list", { name: "Stages for Writing" });
  await expect(writing.getByRole("listitem")).toHaveCount(6);
  await expect(writing).toContainText("Stage 1: Character");
  await expect(writing).toContainText("Stage 2: Word");
  await expect(writing).toContainText("Stage 4: Sentence");
  // Stages that are not built yet are listed, honestly marked, and never offered.
  await expect(
    page.getByRole("list", { name: "Stages for Listening" }).getByRole("listitem").last(),
  ).toContainText("Planned");
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
  const response = await page.goto("/practice/session?kind=stage&practiceSkill=listening&stage=real-world");
  expect(response?.status()).toBe(404);
});

test("writing in context and free production are self-rated against a model, and say so", async ({
  page,
}) => {
  await page.goto("/practice/session?kind=stage&practiceSkill=writing&stage=context");
  await expect(page.getByText("Read the situation and write an appropriate reply")).toBeVisible();
  await drawStroke(page);
  await page.getByRole("button", { name: "Show the model" }).click();
  await expect(page.getByTestId("writing-model")).not.toBeEmpty();
  await expect(page.getByRole("button", { name: "I wrote it correctly" })).toBeVisible();

  await page.goto("/practice/session?kind=stage&practiceSkill=writing&stage=free");
  await expect(page.getByText("The model is only one example.").first()).toBeVisible();
  await drawStroke(page);
  await page.getByRole("button", { name: "Show the model" }).click();
  await expect(page.getByText("Example", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Understandable, with mistakes" }).click();
  await expect(page.getByRole("status")).toContainText("Not quite yet");
});

test("reading a short text: the text is shown, one question, the answer is recorded", async ({ page }) => {
  await page.goto("/practice/session?kind=stage&practiceSkill=reading&stage=text");
  await expect(page.getByText("Read the text, then answer the question.")).toBeVisible();
  await expect(page.getByTestId("passage-text")).not.toBeEmpty();
  const options = page.getByRole("group").last().getByRole("button");
  await expect(options).toHaveCount(4);
  await options.first().click();
  await expect(page.getByRole("status")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText(/2 of \d+/).first()).toBeVisible();
});

test("listening to a conversation: it is played, not shown, until the question is answered", async ({
  page,
}) => {
  await fakeJapaneseVoice(page);
  await page.goto("/practice/session?kind=stage&practiceSkill=listening&stage=conversation");
  await expect(page.getByText("Listen to the conversation, then answer the question.")).toBeVisible();
  await expect(page.getByTestId("passage-text")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Play sound/ })).toBeVisible();
  await page.getByRole("group").last().getByRole("button").first().click();
  await expect(page.getByTestId("passage-text")).toBeVisible();
});

test("native sentences: a real speaker's sentence is read, and its authors are credited after the answer", async ({
  page,
}) => {
  await page.goto("/practice/session?kind=stage&practiceSkill=reading&stage=native");
  await expect(page.getByRole("group").last().getByRole("button").first()).toBeVisible();
  await page.getByRole("group").last().getByRole("button").first().click();
  await expect(page.getByRole("status")).toBeVisible();
  await expect(page.getByText(/Tatoeba sentence #[\d,]+ by/)).toBeVisible();
  await expect(page.getByRole("link", { name: "View source" })).toHaveAttribute(
    "href",
    /tatoeba\.org\/.*sentences\/show\/\d+/,
  );
});

test("Practice follows the learner's level: published writing shows when it opens and is not offered before", async ({
  page,
}) => {
  await page.goto("/practice");
  const reading = page.getByRole("list", { name: "Stages for Reading" });
  await expect(reading).toContainText("Opens at N4");
  await expect(reading).toContainText("Opens at N3");
  const response = await page.goto("/practice/session?kind=stage&practiceSkill=reading&stage=paragraph");
  expect(response?.status()).toBe(404);
});

test("kanji: meaning and reading are chosen, and writing shows the stroke order", async ({ page }) => {
  await page.goto("/practice/session?kind=stage&practiceSkill=kanji&stage=kanji-meaning");
  await expect(page.getByText("Which meaning matches this?")).toBeVisible();
  await page.getByRole("group").last().getByRole("button").first().click();
  await expect(page.getByRole("status")).toBeVisible();

  await page.goto("/practice/session?kind=stage&practiceSkill=kanji&stage=kanji-reading");
  await expect(page.getByText("How is this kanji read?")).toBeVisible();

  await page.goto("/practice/session?kind=stage&practiceSkill=kanji&stage=kanji-writing");
  await expect(page.getByText(/Write this kanji in the writing area/)).toBeVisible();
  await expect(page.getByTestId("stroke-order")).toBeVisible();
});

test("the kanji reference lists N5 and N4 and shows how each kanji is written", async ({ page }) => {
  await page.goto("/learn");
  await page.getByRole("link", { name: "Kanji reference" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "N5 · 79 kanji" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "N4 · 166 kanji" })).toBeVisible();
  await page.getByRole("button", { name: /^水 · water/ }).click();
  const detail = page.getByTestId("kanji-detail");
  await expect(detail).toContainText("water");
  await expect(detail.getByRole("img", { name: "How to write 水: 4 strokes, in order" })).toBeVisible();
  await expect(detail.locator("path[data-stroke]")).toHaveCount(4);
});
