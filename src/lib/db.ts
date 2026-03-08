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
  upvote_count: number;
  readme_html: string | null;
  last_scraped_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GetThemesOptions {
  color?: string;
  q?: string;
  sort?: "popular" | "newest" | "stars";
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
    sort = "popular",
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

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  let orderBy: string;
  switch (sort) {
    case "newest":
      orderBy = "created_at DESC";
      break;
    case "stars":
      orderBy = "stars DESC";
      break;
    case "popular":
    default:
      orderBy = "upvote_count DESC";
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
      `SELECT * FROM themes ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?`
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
    .prepare("SELECT * FROM themes ORDER BY upvote_count DESC LIMIT ?")
    .bind(limit)
    .all<Theme>();

  return result.results;
}

export async function recordUpvote(
  db: D1Database,
  themeId: string,
  fingerprintHash: string,
  ipHash: string | null
): Promise<number> {
  await db
    .prepare(
      "INSERT INTO upvotes (theme_id, fingerprint_hash, ip_hash) VALUES (?, ?, ?)"
    )
    .bind(themeId, fingerprintHash, ipHash)
    .run();

  await db
    .prepare("UPDATE themes SET upvote_count = upvote_count + 1 WHERE id = ?")
    .bind(themeId)
    .run();

  const result = await db
    .prepare("SELECT upvote_count FROM themes WHERE id = ?")
    .bind(themeId)
    .first<{ upvote_count: number }>();

  return result?.upvote_count ?? 0;
}

export async function checkIpRateLimit(
  db: D1Database,
  ipHash: string,
  maxPerDay: number
): Promise<boolean> {
  const result = await db
    .prepare(
      "SELECT COUNT(*) as count FROM upvotes WHERE ip_hash = ? AND created_at > datetime('now', '-1 day')"
    )
    .bind(ipHash)
    .first<{ count: number }>();

  return (result?.count ?? 0) >= maxPerDay;
}
