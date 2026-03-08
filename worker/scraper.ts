import { parse as parseTOML } from "smol-toml";
import themes from "../src/data/themes.json";

interface Env {
  DB: D1Database;
  GITHUB_TOKEN: string;
}

interface CuratedTheme {
  url: string;
  name: string;
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
  // path like "themes/tokyo-night" -> "tokyo-night"
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
  token: string,
): Promise<Response> {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "omarchy-theme-scraper",
    },
  });
}

async function fetchRepoMeta(
  owner: string,
  repo: string,
  token: string,
): Promise<{ description: string | null; stars: number }> {
  const res = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}`,
    token,
  );
  if (!res.ok) throw new Error(`Failed to fetch repo ${owner}/${repo}: ${res.status}`);
  const data = (await res.json()) as { description: string | null; stargazers_count: number };
  return { description: data.description, stars: data.stargazers_count };
}

async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  token: string,
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
  token: string,
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
    // Must have at least the accent color to be useful
    if (!colors.accent) return null;
    return colors;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Discovery: search GitHub for omarchy-theme repos not already in the registry
// ---------------------------------------------------------------------------

async function discoverThemes(
  token: string,
  knownUrls: Set<string>,
): Promise<CuratedTheme[]> {
  const discovered: CuratedTheme[] = [];

  // Search by repo name
  const queries = [
    "omarchy-theme in:name",
    "omarchy-theme topic:omarchy-theme",
  ];

  for (const q of queries) {
    try {
      const res = await githubFetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=100`,
        token,
      );
      if (!res.ok) {
        console.error(`GitHub search failed for "${q}": ${res.status}`);
        continue;
      }
      const data = (await res.json()) as {
        items: Array<{ html_url: string; name: string; full_name: string }>;
      };
      for (const item of data.items) {
        const normalizedUrl = item.html_url.replace(/\/$/, "");
        if (!knownUrls.has(normalizedUrl)) {
          // Derive a display name from the repo name
          const name = item.name
            .replace(/^omarchy-/, "")
            .replace(/-theme$/, "")
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          discovered.push({ url: normalizedUrl, name });
          knownUrls.add(normalizedUrl);
        }
      }
    } catch (err) {
      console.error(`Discovery search error for "${q}":`, err);
    }
  }

  return discovered;
}

// ---------------------------------------------------------------------------
// Scrape a single theme
// ---------------------------------------------------------------------------

async function scrapeTheme(
  entry: CuratedTheme & { is_builtin?: boolean; is_curated?: boolean; path?: string },
  token: string,
): Promise<ThemeRecord | null> {
  const { owner, repo } = parseOwnerRepo(entry.url);

  // Determine slug/id
  let slug: string;
  if (entry.is_builtin && entry.path) {
    slug = deriveSlugFromPath(entry.path);
  } else {
    slug = deriveSlugFromRepo(repo);
  }

  // Fetch repo metadata
  const meta = await fetchRepoMeta(owner, repo, token);

  // Determine the path prefix for file lookups
  const pathPrefix = entry.path ? `${entry.path}/` : "";

  // Fetch colors.toml
  const colorsToml = await fetchFileContent(owner, repo, `${pathPrefix}colors.toml`, token);
  let colors: Record<string, string> | null = null;
  let primaryHue: string | null = null;
  if (colorsToml) {
    colors = parseColors(colorsToml);
    if (colors?.accent) {
      primaryHue = computeHueBucket(colors.accent);
    }
  }

  // Check for preview.png
  let previewUrl: string | null = null;
  const previewExists = await checkFileExists(owner, repo, `${pathPrefix}preview.png`, token);
  if (previewExists) {
    const branch = "main"; // default branch assumption
    previewUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${pathPrefix}preview.png`;
  }

  // Fetch README.md (store raw markdown)
  const readme = await fetchFileContent(owner, repo, `${pathPrefix}README.md`, token);

  // For builtin themes, the github_url should point to the specific path
  const githubUrl = entry.is_builtin
    ? `${entry.url}/tree/main/${entry.path}`
    : entry.url;

  return {
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
  };
}

// ---------------------------------------------------------------------------
// Upsert into D1 (preserving upvote_count)
// ---------------------------------------------------------------------------

async function upsertTheme(db: D1Database, theme: ThemeRecord): Promise<void> {
  await db
    .prepare(
      `INSERT INTO themes (
        id, name, slug, github_url, github_owner, github_repo,
        description, preview_url, colors_json, primary_hue,
        is_builtin, is_curated, stars, readme_html,
        last_scraped_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
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
        readme_html = excluded.readme_html,
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
    )
    .run();
}

// ---------------------------------------------------------------------------
// Main scrape orchestration
// ---------------------------------------------------------------------------

async function runScraper(env: Env): Promise<void> {
  const token = env.GITHUB_TOKEN;
  if (!token) {
    console.error("GITHUB_TOKEN is not set");
    return;
  }

  const knownUrls = new Set<string>();

  // Build the list of all themes to scrape
  type ScrapeEntry = CuratedTheme & { is_builtin?: boolean; is_curated?: boolean; path?: string };
  const entries: ScrapeEntry[] = [];

  // 1. Builtin themes
  for (const t of themes.builtin as BuiltinTheme[]) {
    const url = t.url.replace(/\/$/, "");
    // Track both the base repo URL and path-specific URL to avoid rediscovery
    knownUrls.add(url);
    knownUrls.add(`${url}/tree/main/${t.path}`);
    entries.push({
      url,
      name: t.name,
      path: t.path,
      is_builtin: true,
      is_curated: false,
    });
  }

  // 2. Curated themes
  for (const t of themes.curated as CuratedTheme[]) {
    const url = t.url.replace(/\/$/, "");
    knownUrls.add(url);
    entries.push({
      url,
      name: t.name,
      is_builtin: false,
      is_curated: true,
    });
  }

  // 3. Auto-discovered themes
  const discovered = await discoverThemes(token, knownUrls);
  for (const t of discovered) {
    entries.push({
      ...t,
      is_builtin: false,
      is_curated: false,
    });
  }

  console.log(`Scraping ${entries.length} themes...`);

  let success = 0;
  let failed = 0;

  for (const entry of entries) {
    try {
      const record = await scrapeTheme(entry, token);
      if (record) {
        await upsertTheme(env.DB, record);
        console.log(`OK: ${record.slug}`);
        success++;
      }
    } catch (err) {
      console.error(`FAIL: ${entry.name} (${entry.url})`, err);
      failed++;
    }
  }

  console.log(`Scrape complete: ${success} succeeded, ${failed} failed out of ${entries.length} total`);
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

  // Also allow manual trigger via HTTP for testing
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/run") {
      ctx.waitUntil(runScraper(env));
      return new Response("Scraper triggered", { status: 200 });
    }
    return new Response("Omarchy Theme Scraper. POST /run to trigger manually.", {
      status: 200,
    });
  },
};
