import { expect, test } from "@playwright/test";
import { ensureLearning, fakeJapaneseVoice, skipIntroduction, spoken, useEnglish } from "./helpers";

test.beforeEach(async ({ page }) => {
  await ensureLearning(page);
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

test("lesson shows its objective, outcomes and Learn → Practice → Apply → Check", async ({ page }) => {
  await page.goto("/learn/hiragana-vowels");
  const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(breadcrumb).toContainText("Japanese");
  await expect(breadcrumb).toContainText("Foundation");
  await expect(breadcrumb).toContainText("Lesson 1");
  await expect(page.getByText("Lesson objective")).toBeVisible();
  await expect(page.getByText("Read and write あ い う え お from memory.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "What you'll learn" })).toBeVisible();
  for (const group of ["Learn", "Practice", "Apply", "Check"]) {
    await expect(page.getByRole("heading", { level: 2, name: group, exact: true })).toBeVisible();
  }
  await expect(page.getByRole("heading", { name: "Recognize Hiragana あ い う え お" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Write Hiragana あ い う え お" })).toBeVisible();
});

test("an N5 lesson teaches words and grammar before practice", async ({ page }) => {
  await page.goto("/learn/n5-01-introductions");
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("N5");
  await expect(page.getByText("Situation")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Vocabulary" })).toBeVisible();
  await expect(page.getByText("せんせい", { exact: true })).toBeVisible();
  await expect(page.getByText("teacher", { exact: false }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Grammar" })).toBeVisible();
  await expect(page.getByText("Common mistakes").first()).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Apply", exact: true })).toBeVisible();
});

test("the learning path shows every level with its status and opens a level's lessons", async ({ page }) => {
  await page.goto("/learn");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your learning path");
  await expect(page.getByText("You are here")).toBeVisible();
  await expect(page.getByText("Current level")).toBeVisible();
  await expect(page.getByText("In development")).toHaveCount(4);
  await page.getByRole("link", { name: /^N5/ }).click();
  await expect(page).toHaveURL(/level=n5$/);
  await expect(page.getByRole("heading", { name: "Lessons in N5" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Study this level" })).toBeVisible();
  await expect(page.getByText("Introductions").first()).toBeVisible();
});

test("vocabulary recall accepts kana or romaji", async ({ page }) => {
  await page.goto("/activities/ja.activity.n5-01-introductions.vocabulary-recall");
  const input = page.getByLabel("Type the Japanese word in kana or romaji.");
  await input.fill("zzz");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("status")).toContainText("Answer:");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("2 of").first()).toBeVisible();
});

test("sentence building is checked once every piece is placed", async ({ page }) => {
  await page.goto("/activities/ja.activity.n5-01-introductions.sentence-building");
  const check = page.getByRole("button", { name: "Check" });
  await expect(check).toBeDisabled();
  const pieces = page.getByRole("group", { name: "Pieces" });
  const count = await pieces.getByRole("button").count();
  for (let i = 0; i < count; i++) await pieces.getByRole("button", { disabled: false }).first().click();
  await expect(page.getByRole("group", { name: "Your sentence" }).getByRole("button")).toHaveCount(count);
  await expect(check).toBeEnabled();
  await check.click();
  await expect(page.getByRole("status")).toBeVisible();
});

const KANA = /^[ぁ-ゟ]$/;

test("lesson characters can be tapped to hear them before any question", async ({ page }) => {
  await fakeJapaneseVoice(page);
  await page.goto("/learn/hiragana-vowels");
  await expect(page.getByText("Tap a character to hear how it sounds.")).toBeVisible();
  await page.getByRole("button", { name: "Play pronunciation of う" }).click();
  expect(await spoken(page)).toEqual(["う"]);
});

test("sound recognition plays the target's sound and asks which character it was", async ({ page }) => {
  await fakeJapaneseVoice(page);
  await page.goto("/activities/ja.activity.hiragana-vowels.recognition");
  await skipIntroduction(page);
  // Where the learner is, in one line, above the objective.
  await expect(
    page.getByText("Japanese · Foundation · Lesson 1 · Hiragana: Vowels", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Listen to the sound, then choose the matching character.")).toBeVisible();

  const choices = page.getByRole("group", { name: "Which character did you hear?" }).getByRole("button");
  await expect(choices).toHaveCount(4);
  for (const choice of await choices.all()) await expect(choice).toHaveText(KANA);

  // Nothing is shown as the question: the sound is, and only after pressing Play.
  expect(await spoken(page)).toEqual([]);
  await page.getByRole("button", { name: "Play sound" }).click();
  const [target] = await spoken(page);
  await expect(choices.filter({ hasText: target! })).toHaveCount(1);

  // Replay without leaving the question; it is the same target.
  await page.getByRole("button", { name: "Listen again" }).click();
  expect(await spoken(page)).toEqual([target, target]);

  await choices.filter({ hasText: target! }).click();
  const status = page.getByRole("status");
  await expect(status).toContainText("Correct");
  await expect(status).toContainText(`${target} =`);
});

test("a wrong sound-recognition answer shows the character, its sound and a way to listen again", async ({
  page,
}) => {
  await fakeJapaneseVoice(page);
  await page.goto("/activities/ja.activity.hiragana-vowels.recognition");
  await skipIntroduction(page);
  await page.getByRole("button", { name: "Play sound" }).click();
  const [target] = await spoken(page);
  const choices = page.getByRole("group", { name: "Which character did you hear?" }).getByRole("button");
  await choices.filter({ hasNotText: target! }).first().click();
  const status = page.getByRole("status");
  await expect(status).toContainText("Not quite yet");
  await expect(status).toContainText(`Answer: ${target}`);
  await expect(status).toContainText(`${target} =`);
  await status.getByRole("button", { name: "Listen again" }).click();
  expect(await spoken(page)).toEqual([target, target]);
});

test("recognition activity ends with a learning outcome", async ({ page }) => {
  await fakeJapaneseVoice(page);
  await page.goto("/activities/ja.activity.hiragana-vowels.recognition");
  await skipIntroduction(page);
  await expect(page.getByText("Objective").first()).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.getByRole("button", { name: "Play sound" }).click();
    await page
      .getByRole("group", { name: "Which character did you hear?" })
      .getByRole("button")
      .first()
      .click();
    await expect(page.getByRole("status")).toBeVisible();
    await page.getByRole("button", { name: "Next" }).click();
  }
  await expect(page.getByText("Learning outcome")).toBeVisible();
  await expect(page.getByText("Next review")).toBeVisible();
});

test("without a Japanese voice, recognition falls back to character → sound and says so", async ({
  page,
}) => {
  await fakeJapaneseVoice(page, false);
  await page.goto("/activities/ja.activity.hiragana-vowels.recognition");
  await skipIntroduction(page);
  await expect(page.getByText("Look at the character, then choose the matching sound.")).toBeVisible();
  await expect(page.getByText(/Audio is not available on this device/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Play sound|Preparing audio/ })).toHaveCount(0);
  await page.getByRole("group", { name: /sound/ }).getByRole("button").first().click();
  await expect(page.getByRole("status")).toBeVisible();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("2 of 5").first()).toBeVisible();
});

test("recall activity grades a typed answer", async ({ page }) => {
  await page.goto("/activities/ja.activity.hiragana-vowels.recall");
  await skipIntroduction(page);
  await page.getByLabel("Recall this character's sound without options, then type it in romaji.").fill("zzz");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("status")).toContainText("Answer:");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("2 of 5").first()).toBeVisible();
});

test("recall keeps the sound back until after the answer, then offers it", async ({ page }) => {
  await fakeJapaneseVoice(page);
  await page.goto("/activities/ja.activity.hiragana-vowels.recall");
  await skipIntroduction(page);
  await expect(page.getByRole("button", { name: /Play sound|Listen again/ })).toHaveCount(0);
  await page.getByLabel("Recall this character's sound without options, then type it in romaji.").fill("zzz");
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByRole("status")).toContainText("Answer:");
  await page.getByRole("status").getByRole("button", { name: "Listen again" }).click();
  expect(await spoken(page)).toHaveLength(1);
});

test("writing is prompted by sound: instruction, a labelled Play button and the writing area", async ({
  page,
}) => {
  await fakeJapaneseVoice(page);
  await page.goto("/activities/ja.activity.hiragana-vowels.writing");
  await skipIntroduction(page);
  await expect(
    page.getByText("Listen to the sound, then write the matching character in the writing area."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Play sound" }).click();
  expect(await spoken(page)).toHaveLength(1);
  await expect(page.getByRole("img", { name: /Writing area/ })).toBeVisible();
});

/** Draw one stroke across the writing area. */
async function drawStroke(page: import("@playwright/test").Page) {
  const box = (await page.getByRole("img", { name: /Writing area/ }).boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.35, { steps: 8 });
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.3, { steps: 8 });
  await page.mouse.up();
}

test("writing: a character that is not right is recorded, and the learner writes it again", async ({
  page,
}) => {
  await page.goto("/activities/ja.activity.hiragana-vowels.writing");
  await skipIntroduction(page);
  await drawStroke(page);
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.getByText(/1 drawn, expected \d/)).toBeVisible();
  await expect(page.getByText("Did you write this character?")).toBeVisible();

  await page.getByRole("button", { name: "Not yet" }).click();
  await expect(page.getByTestId("writing-character-result")).toContainText("Character doesn't match yet");
  await expect(page.getByRole("button", { name: "Improve writing" })).toHaveCount(0);
  await page.getByRole("button", { name: "Try again" }).click();

  // Same character, fresh writing area; nothing to give feedback on yet.
  await expect(page.getByText("1 of 5").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Check" })).toBeDisabled();
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("writing: a correct but imprecise character can be improved or accepted, never forced", async ({
  page,
}) => {
  await page.goto("/activities/ja.activity.hiragana-vowels.writing");
  await skipIntroduction(page);
  await drawStroke(page);
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: "Yes, it matches" }).click();

  // One stroke where more are expected: still the character, but the handwriting can be more precise.
  const result = page.getByRole("group", { name: "Writing result" });
  await expect(page.getByTestId("writing-character-result")).toContainText("Character is correct");
  await expect(result).toContainText("The character is correct, but the handwriting can be more precise.");

  // "Improve writing" returns to the writing area for the same character.
  await result.getByRole("button", { name: "Improve writing" }).click();
  await expect(page.getByRole("img", { name: /Writing area/ })).toBeVisible();
  await expect(page.getByText("1 of 5").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Check" })).toBeDisabled();

  // "Continue anyway" keeps the attempt and moves on.
  await drawStroke(page);
  await page.getByRole("button", { name: "Check" }).click();
  await page.getByRole("button", { name: "Yes, it matches" }).click();
  await page.getByRole("button", { name: "Continue anyway" }).click();
  await expect(page.getByRole("status")).toContainText("Correct");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("2 of 5").first()).toBeVisible();
});

test("the learning language can be changed from any learning page without losing progress", async ({
  page,
}) => {
  await page.goto("/learn/hiragana-vowels");
  // Separate from the interface-language menu, and one step from language selection.
  await expect(page.getByRole("button", { name: /^Interface language: / })).toBeVisible();
  await page.getByRole("link", { name: "Change learning language" }).click();
  await expect(page).toHaveURL(/\/languages$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your learning languages");

  // Japanese is available and in progress; the others are shown as coming soon and cannot be opened.
  await expect(page.getByText("Foundation · In progress")).toBeVisible();
  for (const name of ["English", "Mandarin Chinese", "Spanish", "German", "French", "Korean"]) {
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(name) })).toHaveCount(0);
  }
  await expect(page.getByText("Coming soon").first()).toBeVisible();

  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("Continue learning")).toBeVisible();
  // Still Japanese Foundation, with the interface language untouched.
  await expect(page.getByText(/You are here: Japanese · Foundation/)).toBeVisible();
});

test("Settings still changes the interface language and shows the learning language", async ({ page }) => {
  await page.goto("/settings");
  await expect(page.getByText(/Learning language: Japanese · 日本語 · Foundation/)).toBeVisible();
  await page.getByRole("radio", { name: "Bahasa Indonesia" }).check();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pengaturan");
  await page.goto("/dashboard");
  await expect(page.getByText("Progres kursus")).toBeVisible();
  await useEnglish(page);
});

test("progress shows confusions and learning history", async ({ page }) => {
  await page.goto("/progress");
  await expect(page.getByRole("heading", { name: "Commonly confused" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Learning history" })).toBeVisible();
});

test("the N5 proficiency page explains the level, evidence and readiness, and starts a mock assessment", async ({
  page,
}) => {
  await page.goto("/learn?level=n5");
  await page.getByRole("link", { name: "Proficiency for this level" }).first().click();
  await expect(page).toHaveURL(/\/proficiency\?level=n5/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("N5 proficiency");
  await expect(page.getByText("Platform Internal Standard")).toBeVisible();
  await expect(page.getByText("What you will learn")).toBeVisible();
  await expect(page.getByTestId("readiness-state")).toBeVisible();
  // Skills without content are shown honestly rather than hidden or faked.
  await expect(page.getByTestId("competency-n5.listening.slow-conversation")).toContainText("Coming later");
  await expect(page.getByTestId("assessment-result")).toContainText("Platform Mock Assessment Result");

  await page.getByRole("link", { name: "Start Vocabulary" }).click();
  await expect(page).toHaveURL(/kind=assessment/);
  await expect(page.getByText("Mock assessment").first()).toBeVisible();

  // No horizontal overflow at this width.
  await page.goto("/proficiency?level=n5");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});
