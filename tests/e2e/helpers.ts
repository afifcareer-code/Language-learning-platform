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
    // A brand-new learner starts in the first lesson; a returning one opens the dashboard.
    await expect(page).toHaveURL(/\/(dashboard|learn\/[a-z0-9-]+)$/);
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

/**
 * Give the page a Japanese text-to-speech voice that records what it is asked
 * to say in `window.__spoken`. Headless browsers have no voices, and the audio
 * behaviour (what is played, replay) must be testable deterministically.
 * Call before navigating. Pass `false` for a device with no Japanese voice.
 */
export async function fakeJapaneseVoice(page: Page, available = true) {
  await page.addInitScript((hasVoice) => {
    const w = window as unknown as { __spoken: string[] };
    w.__spoken = [];
    class FakeUtterance {
      text: string;
      voice: unknown = null;
      lang = "";
      rate = 1;
      onstart: (() => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }
    const voice = { lang: "ja-JP", name: "Test Japanese voice" };
    const synth = {
      getVoices: () => (hasVoice ? [voice] : []),
      addEventListener() {},
      removeEventListener() {},
      cancel() {},
      speak(u: FakeUtterance) {
        w.__spoken.push(u.text);
        u.onstart?.();
        setTimeout(() => u.onend?.(), 0);
      },
    };
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: FakeUtterance, configurable: true });
    Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
  }, available);
}

/** Everything the page asked the voice to say so far. */
export async function spoken(page: Page): Promise<string[]> {
  return page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken);
}

/**
 * Get past the introduction that precedes the first question about characters
 * the learner has not practiced yet. It is a teaching screen, not a question.
 * Does nothing once those characters have been practiced.
 */
export async function skipIntroduction(page: Page) {
  const intro = page.getByRole("heading", { name: "Meet the characters" });
  for (let i = 0; i < 6 && (await intro.isVisible()); i++) {
    await page.getByRole("button", { name: /^(Next characters|Start practice)$/ }).click();
  }
  await expect(intro).toHaveCount(0);
}
