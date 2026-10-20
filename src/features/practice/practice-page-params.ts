import type { PracticeParams } from "@/server/services/practice";

type SearchParams = Record<string, string | string[] | undefined>;

export function toPracticeParams(searchParams: SearchParams): PracticeParams {
  const pick = (key: string) => {
    const value = searchParams[key];
    return typeof value === "string" ? value : undefined;
  };
  return { lesson: pick("lesson"), mode: pick("mode"), focus: pick("focus") };
}
