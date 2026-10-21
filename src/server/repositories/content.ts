import { and, asc, eq, inArray } from "drizzle-orm";
import type { ContentItem } from "@/core/learning";
import { CONTENT_SOURCE_LOCALE } from "@/localization/config";
import type { Database } from "../db/client";
import type { contentItems } from "../db/schema/sqlite";

type ContentRow = typeof contentItems.$inferSelect;

function toContentItem(row: ContentRow): ContentItem {
  return {
    id: row.id,
    languageCode: row.languageCode,
    type: row.type,
    key: row.key,
    data: row.data,
    tags: row.tags,
  };
}

export async function getContentItem(db: Database, id: string): Promise<ContentItem | null> {
  const [row] = await db.select().from(db.t.contentItems).where(eq(db.t.contentItems.id, id)).limit(1);
  return row ? toContentItem(row) : null;
}

/** Fetch items by id, preserving the order of `ids`. */
export async function getContentItems(db: Database, ids: readonly string[]): Promise<ContentItem[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(db.t.contentItems)
    .where(inArray(db.t.contentItems.id, [...ids]));
  const byId = new Map(rows.map((r) => [r.id, toContentItem(r)]));
  return ids.map((id) => byId.get(id)).filter((i): i is ContentItem => Boolean(i));
}

export async function listContentItemsByType(
  db: Database,
  languageCode: string,
  type: string,
): Promise<ContentItem[]> {
  const rows = await db
    .select()
    .from(db.t.contentItems)
    .where(and(eq(db.t.contentItems.languageCode, languageCode), eq(db.t.contentItems.type, type)))
    .orderBy(asc(db.t.contentItems.sortOrder));
  return rows.map(toContentItem);
}

/**
 * Localized parts of content items (meanings, explanations) for a locale,
 * falling back to the content source locale. Keyed by content item id.
 */
export async function getContentTranslations(
  db: Database,
  ids: readonly string[],
  locale: string,
): Promise<Map<string, unknown>> {
  if (ids.length === 0) return new Map();
  const t = db.t.contentItemTranslations;
  const rows = await db
    .select()
    .from(t)
    .where(inArray(t.contentItemId, [...new Set(ids)]));
  const out = new Map<string, unknown>();
  for (const row of rows) {
    if (row.locale === locale || (row.locale === CONTENT_SOURCE_LOCALE && !out.has(row.contentItemId))) {
      out.set(row.contentItemId, row.data);
    }
  }
  return out;
}
