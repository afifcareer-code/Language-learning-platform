import { z } from "zod";
import { localizedTextSchema } from "@/localization/content";

/** Content type of writing situations in the generic content store. */
export const SITUATION_CONTENT_TYPE = "ja.situation";

const slug = z.string().regex(/^[a-z0-9-]+$/);

/**
 * A situation to respond to in writing, as authored in data/japanese/situations/*.json.
 * `context`: one appropriate reply is expected. `free`: the learner writes their own
 * message and the model is only one example. Situations are original.
 */
export const situationEntrySchema = z.object({
  slug,
  kind: z.enum(["context", "free"]),
  /** The model reply (context) or an example (free), as written for learners at the level. */
  model: z.string().min(2),
  romaji: z.string().optional(),
  /** What the learner is asked to do, per locale. */
  prompt: localizedTextSchema,
});

export const situationFileSchema = z.object({
  source: z.string(),
  level: slug,
  items: z.array(situationEntrySchema).min(1),
});

export interface SituationItemData {
  slug: string;
  kind: "context" | "free";
  model: string;
  romaji?: string;
}

export interface SituationTranslation {
  prompt: string;
}

export const situationItemId = (slug: string) => `ja.situation.${slug}`;
export const situationItemKey = (slug: string) => `situation:${slug}`;

export function isSituationData(data: unknown): data is SituationItemData {
  const d = data as SituationItemData;
  return typeof data === "object" && data !== null && typeof d.model === "string" && "kind" in d;
}
