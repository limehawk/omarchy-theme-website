import { cache } from "react";
import { COLOR_BUCKETS } from "@/lib/colors";

export const VALID_SORTS = ["newest", "stars", "name"] as const;
export type SortOption = (typeof VALID_SORTS)[number];

export const VALID_SOURCES = ["all", "community", "builtin"] as const;
export type SourceOption = (typeof VALID_SOURCES)[number];

export interface Theme {
  id: string;
  name: string;
  slug: string;
  github_url: string;
  github_owner: string;
  github_repo: string;
  description: string | null;
  preview_url: string | null;
  colors_json: string | null;
  primary_hue: string | null;
  is_builtin: number;
  is_curated: number;
  stars: number;
  readme_text: string | null;
  last_scraped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GetThemesOptions {
  color?: string;
  q?: string;
  sort?: SortOption;
  source?: SourceOption;
  page?: number;
  limit?: number;
}

const THEME_LIST_COLUMNS = "id, name, slug, github_url, github_owner, github_repo, description, preview_url, colors_json, primary_hue, is_builtin, is_curated, stars, created_at, updated_at";

export function parseThemeFilters(raw: {
  color?: string | null;
  q?: string | null;
  sort?: string | null;
  source?: string | null;
  page?: string | null;
  limit?: string | null;
}): GetThemesOptions {
  const colorParam = raw.color;
  const color = (colorParam && (COLOR_BUCKETS as readonly string[]).includes(colorParam)) ? colorParam : undefined;
  const q = raw.q?.slice(0, 100) ?? undefined;
  const sortParam = raw.sort;
  const sort: SortOption = (sortParam && (VALID_SORTS as readonly string[]).includes(sortParam)) ? sortParam as SortOption : "stars";
  const sourceParam = raw.source;
  const source: SourceOption = (sourceParam && (VALID_SOURCES as readonly string[]).includes(sourceParam)) ? sourceParam as SourceOption : "all";
  const page = Math.max(1, parseInt(raw.page ?? "1", 10) || 1);
  const limit = Math.min(300, Math.max(1, parseInt(raw.limit ?? "12", 10) || 12));
  return { color, q, sort, source, page, limit };
}

export async function getThemes(
  db: D1Database,
  options: GetThemesOptions = {}
): Promise<{ themes: Theme[]; total: number }> {
  const {
    color,
    q,
    sort = "stars",
    source = "all",
    page = 1,
    limit = 12,
  } = options;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (color) {
    conditions.push("primary_hue = ?");
    params.push(color);
  }

  if (q) {
    conditions.push("(name LIKE ? OR description LIKE ?)");
    const pattern = `%${q}%`;
    params.push(pattern, pattern);
  }

  if (source === "community") {
    conditions.push("is_builtin = 0");
  } else if (source === "builtin") {
    conditions.push("is_builtin = 1");
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  let orderBy: string;
  switch (sort) {
    case "newest":
      orderBy = "github_pushed_at DESC";
      break;
    case "stars":
      orderBy = "stars DESC";
      break;
    case "name":
      orderBy = "name ASC";
      break;
    default:
      orderBy = "stars DESC";
      break;
  }

  const offset = (page - 1) * limit;

  const [countResult, themes] = await Promise.all([
    db.prepare(`SELECT COUNT(*) as count FROM themes ${where}`)
      .bind(...params)
      .first<{ count: number }>(),
    db.prepare(
      `SELECT ${THEME_LIST_COLUMNS} FROM themes ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
    )
      .bind(...params, limit, offset)
      .all<Theme>(),
  ]);

  return { themes: themes.results, total: countResult?.count ?? 0 };
}

export const getThemeBySlug = cache(async (
  db: D1Database,
  slug: string
): Promise<Theme | null> => {
  const result = await db
    .prepare("SELECT * FROM themes WHERE slug = ?")
    .bind(slug)
    .first<Theme>();

  return result ?? null;
});

export async function getFeaturedThemes(
  db: D1Database,
  limit: number = 6
): Promise<Theme[]> {
  const result = await db
    .prepare(`SELECT ${THEME_LIST_COLUMNS} FROM themes WHERE is_builtin = 0 ORDER BY stars DESC LIMIT ?`)
    .bind(limit)
    .all<Theme>();

  return result.results;
}

