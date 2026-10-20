import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateJapaneseContent } from "@/languages/japanese/content/validate";

describe("Japanese content files", () => {
  it("are valid and internally consistent", async () => {
    expect(await validateJapaneseContent(join(process.cwd(), "data"))).toEqual([]);
  });
});
