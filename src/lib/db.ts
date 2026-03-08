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
  sort?: "newest" | "stars" | "name";
  source?: "all" | "community" | "builtin";
  page?: number;
  limit?: number;
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

  const countResult = await db
    .prepare(`SELECT COUNT(*) as count FROM themes ${where}`)
    .bind(...params)
    .first<{ count: number }>();

  const total = countResult?.count ?? 0;

  const themes = await db
    .prepare(
      `SELECT id, name, slug, github_url, github_owner, github_repo, description, preview_url, colors_json, primary_hue, is_builtin, is_curated, stars, created_at, updated_at FROM themes ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
    )
    .bind(...params, limit, offset)
    .all<Theme>();

  return { themes: themes.results, total };
}

export async function getThemeBySlug(
  db: D1Database,
  slug: string
): Promise<Theme | null> {
  const result = await db
    .prepare("SELECT * FROM themes WHERE slug = ?")
    .bind(slug)
    .first<Theme>();

  return result ?? null;
}

export async function getFeaturedThemes(
  db: D1Database,
  limit: number = 6
): Promise<Theme[]> {
  const result = await db
    .prepare("SELECT id, name, slug, github_url, github_owner, github_repo, description, preview_url, colors_json, primary_hue, is_builtin, is_curated, stars, created_at, updated_at FROM themes WHERE is_builtin = 0 ORDER BY stars DESC LIMIT ?")
    .bind(limit)
    .all<Theme>();

  return result.results;
}

