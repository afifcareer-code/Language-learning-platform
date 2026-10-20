import { JA_SKILLS } from "@/languages/japanese/skills";

/** Practice URL for a skill. Each skill maps to the exercise that measures it. */
export function practiceHref(
  skill: string,
  params: { lesson?: string; mode?: "review"; focus?: "weak" } = {},
): string {
  const path = skill === JA_SKILLS.kanaWriting ? "/practice/writing" : "/practice/reading";
  const query = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])),
  );
  const qs = query.toString();
  return qs ? `${path}?${qs}` : path;
}
