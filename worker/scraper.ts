import { parse as parseTOML } from "smol-toml";
import themes from "../src/data/themes.json";

interface Env {
  DB: D1Database;
  GITHUB_TOKEN?: string;
  SCRAPER_AUTH_TOKEN?: string;
}

interface CuratedTheme {
  url: string;
  name: string;
  dead?: boolean;
}

interface BuiltinTheme {
  url: string;
  path: string;
  name: string;
}

interface ThemeRecord {
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
  readme: string | null;
  github_pushed_at: string | null;
}

interface ScrapeResult {
  slug: string;
  name: string;
  status: "ok" | "skipped" | "error";
  colors_source?: "colors.toml" | "alacritty.toml" | "none";
  has_preview?: boolean;
  has_colors?: boolean;
  error?: string;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode("hmac-key");
  const key = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign("HMAC", key, encoder.encode(a)),
    crypto.subtle.sign("HMAC", key, encoder.encode(b)),
  ]);
  const bufA = new Uint8Array(sigA);
  const bufB = new Uint8Array(sigB);
  if (bufA.length !== bufB.length) return false;
  let result = 0;
  for (let i = 0; i < bufA.length; i++) result |= bufA[i] ^ bufB[i];
  return result === 0;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function deriveSlugFromRepo(repoName: string): string {
  let slug = repoName.toLowerCase();
  slug = slug.replace(/^omarchy-/, "");
  slug = slug.replace(/-theme$/, "");
  return slugify(slug);
}

function deriveSlugFromPath(path: string): string {
  const parts = path.split("/");
  return slugify(parts[parts.length - 1]);
}

function parseOwnerRepo(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error(`Invalid GitHub URL: ${url}`);
  return { owner: match[1], repo: match[2] };
}

// ---------------------------------------------------------------------------
// Color bucketing: hex -> HSL -> bucket name
// ---------------------------------------------------------------------------

function hexToHSL(hex: string): { h: number; s: number; l: number } {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function computeHueBucket(hexColor: string): string {
  const { h, s, l } = hexToHSL(hexColor);

  if (s < 10 || l > 95 || l < 5) return "monochrome";
  if (h <= 15 || h >= 340) return "red";
  if (h <= 40) return "orange";
  if (h <= 65) return "yellow";
  if (h <= 160) return "green";
  if (h <= 195) return "teal";
  if (h <= 260) return "blue";
  if (h <= 290) return "purple";
  return "pink";
}

// ---------------------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------------------

async function githubFetch(
  url: string,
  token?: string,
): Promise<Response> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "omarchy-theme-scraper",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return fetch(url, { headers });
}

async function fetchRepoMeta(
  owner: string,
  repo: string,
  token?: string,
): Promise<{ description: string | null; stars: number; default_branch: string; pushed_at: string | null }> {
  const res = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    token,
  );
  if (!res.ok) throw new Error(`GitHub API ${res.status}: repos/${owner}/${repo}`);
  const data = (await res.json()) as { description: string | null; stargazers_count: number; default_branch: string; pushed_at: string | null };
  return { description: data.description, stars: data.stargazers_count, default_branch: data.default_branch, pushed_at: data.pushed_at };
}

async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  token?: string,
): Promise<string | null> {
  const res = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    token,
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { content?: string; encoding?: string };
  if (!data.content) return null;
  return atob(data.content.replace(/\n/g, ""));
}

async function checkFileExists(
  owner: string,
  repo: string,
  path: string,
  token?: string,
): Promise<boolean> {
  const res = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    token,
  );
  return res.ok;
}

// ---------------------------------------------------------------------------
// Parse colors.toml
// ---------------------------------------------------------------------------

const EXPECTED_COLOR_KEYS = [
  "accent", "cursor", "foreground", "background",
  "selection_foreground", "selection_background",
  ...Array.from({ length: 16 }, (_, i) => `color${i}`),
];

function parseColors(tomlContent: string): Record<string, string> | null {
  try {
    const parsed = parseTOML(tomlContent) as Record<string, unknown>;
    const colors: Record<string, string> = {};
    for (const key of EXPECTED_COLOR_KEYS) {
      if (typeof parsed[key] === "string") {
        colors[key] = parsed[key] as string;
      }
    }
    if (!colors.accent) return null;
    return colors;
  } catch {
    return null;
  }
}

// Map alacritty.toml color names to color0-15
const ALACRITTY_NORMAL_MAP: Record<string, string> = {
  black: "color0", red: "color1", green: "color2", yellow: "color3",
  blue: "color4", magenta: "color5", cyan: "color6", white: "color7",
};
const ALACRITTY_BRIGHT_MAP: Record<string, string> = {
  black: "color8", red: "color9", green: "color10", yellow: "color11",
  blue: "color12", magenta: "color13", cyan: "color14", white: "color15",
};

function parseAlacrittyColors(tomlContent: string): Record<string, string> | null {
  try {
    const parsed = parseTOML(tomlContent) as Record<string, unknown>;
    const colorsSection = parsed.colors as Record<string, unknown> | undefined;
    if (!colorsSection) return null;

    const colors: Record<string, string> = {};

    const primary = colorsSection.primary as Record<string, string> | undefined;
    if (primary?.background) colors.background = primary.background;
    if (primary?.foreground) colors.foreground = primary.foreground;

    const cursor = colorsSection.cursor as Record<string, string> | undefined;
    if (cursor?.cursor) colors.cursor = cursor.cursor;

    const selection = colorsSection.selection as Record<string, string> | undefined;
    if (selection?.background) colors.selection_background = selection.background;
    if (selection?.text && selection.text !== "CellForeground") colors.selection_foreground = selection.text;

    const normal = colorsSection.normal as Record<string, string> | undefined;
    if (normal) {
      for (const [name, key] of Object.entries(ALACRITTY_NORMAL_MAP)) {
        if (normal[name]) colors[key] = normal[name];
      }
    }

    const bright = colorsSection.bright as Record<string, string> | undefined;
    if (bright) {
      for (const [name, key] of Object.entries(ALACRITTY_BRIGHT_MAP)) {
        if (bright[name]) colors[key] = bright[name];
      }
    }

    if (!colors.accent) {
      colors.accent = colors.color4 ?? colors.color5 ?? colors.foreground ?? "";
    }

    if (!colors.accent) return null;
    return colors;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Scrape a single theme
// ---------------------------------------------------------------------------

const repoMetaCache = new Map<string, { description: string | null; stars: number; default_branch: string; pushed_at: string | null }>();

async function scrapeTheme(
  entry: CuratedTheme & { is_builtin?: boolean; is_curated?: boolean; path?: string },
  token?: string,
): Promise<{ record: ThemeRecord; result: ScrapeResult }> {
  const { owner, repo } = parseOwnerRepo(entry.url);

  let slug: string;
  if (entry.is_builtin && entry.path) {
    slug = deriveSlugFromPath(entry.path);
  } else {
    slug = deriveSlugFromRepo(repo);
  }

  const result: ScrapeResult = {
    slug,
    name: entry.name,
    status: "ok",
    colors_source: "none",
    has_preview: false,
    has_colors: false,
  };

  // Fetch repo metadata (cached per repo)
  const repoKey = `${owner}/${repo}`;
  let meta = repoMetaCache.get(repoKey);
  if (!meta) {
    meta = await fetchRepoMeta(owner, repo, token);
    repoMetaCache.set(repoKey, meta);
  }

  const pathPrefix = entry.path ? `${entry.path}/` : "";

  // Fetch colors: try colors.toml first, fall back to alacritty.toml
  let colors: Record<string, string> | null = null;
  let primaryHue: string | null = null;

  const colorsToml = await fetchFileContent(owner, repo, `${pathPrefix}colors.toml`, token);
  if (colorsToml) {
    colors = parseColors(colorsToml);
    if (colors) result.colors_source = "colors.toml";
  }

  if (!colors) {
    const alacrittyToml = await fetchFileContent(owner, repo, `${pathPrefix}alacritty.toml`, token);
    if (alacrittyToml) {
      colors = parseAlacrittyColors(alacrittyToml);
      if (colors) result.colors_source = "alacritty.toml";
    }
  }

  result.has_colors = colors !== null;

  if (colors?.accent) {
    primaryHue = computeHueBucket(colors.accent);
  }

  // Check for preview image: try preview.png, then theme.png
  const branch = meta.default_branch;
  let previewUrl: string | null = null;
  for (const filename of ["preview.png", "theme.png"]) {
    const exists = await checkFileExists(owner, repo, `${pathPrefix}${filename}`, token);
    if (exists) {
      previewUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${pathPrefix}${filename}`;
      break;
    }
  }
  result.has_preview = previewUrl !== null;

  // Fetch README.md
  const readme = await fetchFileContent(owner, repo, `${pathPrefix}README.md`, token);

  const githubUrl = entry.is_builtin
    ? `${entry.url}/tree/${branch}/${entry.path}`
    : entry.url;

  const record: ThemeRecord = {
    id: slug,
    name: entry.name,
    slug,
    github_url: githubUrl,
    github_owner: owner,
    github_repo: repo,
    description: meta.description,
    preview_url: previewUrl,
    colors_json: colors ? JSON.stringify(colors) : null,
    primary_hue: primaryHue,
    is_builtin: entry.is_builtin ? 1 : 0,
    is_curated: entry.is_curated ? 1 : 0,
    stars: meta.stars,
    readme: readme,
    github_pushed_at: meta.pushed_at,
  };

  return { record, result };
}

// ---------------------------------------------------------------------------
// Upsert into D1
// ---------------------------------------------------------------------------

async function upsertTheme(db: D1Database, theme: ThemeRecord): Promise<void> {
  await db
    .prepare(
      `INSERT INTO themes (
        id, name, slug, github_url, github_owner, github_repo,
        description, preview_url, colors_json, primary_hue,
        is_builtin, is_curated, stars, readme_text,
        github_pushed_at, last_scraped_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        github_url = excluded.github_url,
        github_owner = excluded.github_owner,
        github_repo = excluded.github_repo,
        description = excluded.description,
        preview_url = excluded.preview_url,
        colors_json = excluded.colors_json,
        primary_hue = excluded.primary_hue,
        is_builtin = excluded.is_builtin,
        is_curated = excluded.is_curated,
        stars = excluded.stars,
        readme_text = excluded.readme_text,
        github_pushed_at = excluded.github_pushed_at,
        last_scraped_at = datetime('now'),
        updated_at = datetime('now')`,
    )
    .bind(
      theme.id,
      theme.name,
      theme.slug,
      theme.github_url,
      theme.github_owner,
      theme.github_repo,
      theme.description,
      theme.preview_url,
      theme.colors_json,
      theme.primary_hue,
      theme.is_builtin,
      theme.is_curated,
      theme.stars,
      theme.readme,
      theme.github_pushed_at,
    )
    .run();
}

// ---------------------------------------------------------------------------
// Main scrape orchestration
// ---------------------------------------------------------------------------

async function runScraper(env: Env): Promise<ScrapeResult[]> {
  repoMetaCache.clear();

  const token = env.GITHUB_TOKEN;
  if (!token) {
    console.log("GITHUB_TOKEN not set — running without auth (60 req/hr limit)");
  }

  const results: ScrapeResult[] = [];

  type ScrapeEntry = CuratedTheme & { is_builtin?: boolean; is_curated?: boolean; path?: string };
  const entries: ScrapeEntry[] = [];

  for (const t of themes.builtin as BuiltinTheme[]) {
    const url = t.url.replace(/\/$/, "");
    entries.push({ url, name: t.name, path: t.path, is_builtin: true, is_curated: false });
  }

  for (const t of themes.curated as CuratedTheme[]) {
    if (t.dead) continue;
    const url = t.url.replace(/\/$/, "");
    entries.push({ url, name: t.name, is_builtin: false, is_curated: true });
  }

  // Skip recently scraped
  const recentlyScraped = new Set<string>();
  const existing = await env.DB
    .prepare("SELECT id FROM themes WHERE last_scraped_at > datetime('now', '-12 hours')")
    .all<{ id: string }>();
  for (const row of existing.results) {
    recentlyScraped.add(row.id);
  }

  let success = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`Scraping ${entries.length} themes (${recentlyScraped.size} fresh)...`);

  for (const entry of entries) {
    try {
      const { repo } = parseOwnerRepo(entry.url);
      const expectedSlug = entry.path ? deriveSlugFromPath(entry.path) : deriveSlugFromRepo(repo);
      if (recentlyScraped.has(expectedSlug)) {
        skipped++;
        results.push({ slug: expectedSlug, name: entry.name, status: "skipped" });
        continue;
      }

      const { record, result } = await scrapeTheme(entry, token);
      await upsertTheme(env.DB, record);
      results.push(result);
      console.log(`OK: ${record.slug} [colors: ${result.colors_source}, preview: ${result.has_preview}]`);
      success++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      try {
        const { repo } = parseOwnerRepo(entry.url);
        const expectedSlug = entry.path ? deriveSlugFromPath(entry.path) : deriveSlugFromRepo(repo);
        results.push({ slug: expectedSlug, name: entry.name, status: "error", error: errorMsg });
      } catch {
        results.push({ slug: entry.name, name: entry.name, status: "error", error: errorMsg });
      }
      console.error(`FAIL: ${entry.name}: ${errorMsg}`);
      failed++;
    }
  }

  console.log(`Done: ${success} scraped, ${skipped} cached, ${failed} failed / ${entries.length} total`);
  return results;
}

// ---------------------------------------------------------------------------
// Status endpoint: query D1 for themes with issues
// ---------------------------------------------------------------------------

interface ThemeStatus {
  slug: string;
  name: string;
  has_colors: boolean;
  has_preview: boolean;
  primary_hue: string | null;
  last_scraped_at: string | null;
  stale: boolean;
}

async function getStatus(db: D1Database): Promise<{
  total: number;
  missing_colors: ThemeStatus[];
  missing_preview: ThemeStatus[];
  stale: ThemeStatus[];
  never_scraped: ThemeStatus[];
}> {
  const all = await db
    .prepare(`SELECT slug, name, colors_json, preview_url, primary_hue, last_scraped_at FROM themes ORDER BY name`)
    .all<{
      slug: string;
      name: string;
      colors_json: string | null;
      preview_url: string | null;
      primary_hue: string | null;
      last_scraped_at: string | null;
    }>();

  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  const missing_colors: ThemeStatus[] = [];
  const missing_preview: ThemeStatus[] = [];
  const stale: ThemeStatus[] = [];
  const never_scraped: ThemeStatus[] = [];

  for (const t of all.results) {
    const lastScraped = t.last_scraped_at ? new Date(t.last_scraped_at + "Z").getTime() : 0;
    const isStale = !t.last_scraped_at || (now - lastScraped > 3 * ONE_DAY);

    const status: ThemeStatus = {
      slug: t.slug,
      name: t.name,
      has_colors: t.colors_json !== null,
      has_preview: t.preview_url !== null,
      primary_hue: t.primary_hue,
      last_scraped_at: t.last_scraped_at,
      stale: isStale,
    };

    if (!t.colors_json) missing_colors.push(status);
    if (!t.preview_url) missing_preview.push(status);
    if (!t.last_scraped_at) never_scraped.push(status);
    else if (isStale) stale.push(status);
  }

  return {
    total: all.results.length,
    missing_colors,
    missing_preview,
    stale,
    never_scraped,
  };
}

// ---------------------------------------------------------------------------
// Worker export
// ---------------------------------------------------------------------------

export default {
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(runScraper(env));
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const json = (data: unknown) =>
      new Response(JSON.stringify(data, null, 2), {
        headers: { "Content-Type": "application/json" },
      });

    // Authenticate admin endpoints
    if (url.pathname === "/run" || url.pathname === "/run-force" || url.pathname === "/status") {
      const authHeader = request.headers.get("Authorization");
      const token = authHeader?.replace("Bearer ", "");
      if (!env.SCRAPER_AUTH_TOKEN || !token || !(await timingSafeEqual(token, env.SCRAPER_AUTH_TOKEN))) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // POST /run — trigger scrape synchronously, return results
    if (url.pathname === "/run" && request.method === "POST") {
      const results = await runScraper(env);
      const summary = {
        scraped: results.filter((r) => r.status === "ok").length,
        skipped: results.filter((r) => r.status === "skipped").length,
        failed: results.filter((r) => r.status === "error").length,
        total: results.length,
        errors: results.filter((r) => r.status === "error"),
        missing_colors: results.filter((r) => r.status === "ok" && !r.has_colors),
        results,
      };
      return json(summary);
    }

    // GET /status — show current DB health
    if (url.pathname === "/status") {
      const status = await getStatus(env.DB);
      return json(status);
    }

    // POST /run-force — scrape ignoring 12hr cache
    if (url.pathname === "/run-force" && request.method === "POST") {
      // Clear last_scraped_at to force full re-scrape
      await env.DB.prepare("UPDATE themes SET last_scraped_at = NULL").run();
      const results = await runScraper(env);
      const summary = {
        scraped: results.filter((r) => r.status === "ok").length,
        failed: results.filter((r) => r.status === "error").length,
        total: results.length,
        errors: results.filter((r) => r.status === "error"),
        missing_colors: results.filter((r) => r.status === "ok" && !r.has_colors),
        results,
      };
      return json(summary);
    }

    return json({
      name: "Omarchy Theme Scraper",
      endpoints: {
        "POST /run": "Trigger scrape, returns detailed results",
        "POST /run-force": "Force full re-scrape (ignores 12hr cache)",
        "GET /status": "Show DB health — missing colors, stale themes, etc.",
      },
    });
  },
};
