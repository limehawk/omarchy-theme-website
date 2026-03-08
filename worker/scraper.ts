import { parse as parseTOML } from "smol-toml";
import themes from "../src/data/themes.json";

interface Env {
  DB: D1Database;
  SCRAPE_QUEUE: Queue<ScrapeMessage>;
  GITHUB_TOKEN?: string;
  SCRAPER_AUTH_TOKEN?: string;
}

interface ScrapeMessage {
  url: string;
  name: string;
  path?: string;
  is_builtin: boolean;
  is_curated: boolean;
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
  apps_json: string | null;
  primary_hue: string | null;
  is_builtin: number;
  is_curated: number;
  stars: number;
  readme: string | null;
  default_branch: string;
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

// Compare strings in constant time via HMAC to prevent timing attacks.
// The HMAC key value is arbitrary — it only needs to be consistent within
// a single comparison. Equal inputs produce equal MACs; unequal inputs
// produce unequal MACs, and the XOR loop runs in constant time.
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode("timing-safe-compare");
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
  hex = hex.replace(/^(#|0x|0X)/, "");
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
  const binary = atob(data.content.replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
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

/** Normalize color values: convert 0x prefix to # for CSS compatibility */
function normalizeHex(value: string): string {
  if (value.startsWith("0x") || value.startsWith("0X")) {
    return "#" + value.slice(2);
  }
  return value;
}

function parseColors(tomlContent: string): Record<string, string> | null {
  try {
    const parsed = parseTOML(tomlContent) as Record<string, unknown>;
    const colors: Record<string, string> = {};
    for (const key of EXPECTED_COLOR_KEYS) {
      if (typeof parsed[key] === "string") {
        colors[key] = normalizeHex(parsed[key] as string);
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
    if (primary?.background) colors.background = normalizeHex(primary.background);
    if (primary?.foreground) colors.foreground = normalizeHex(primary.foreground);

    const cursor = colorsSection.cursor as Record<string, string> | undefined;
    if (cursor?.cursor) colors.cursor = normalizeHex(cursor.cursor);

    const selection = colorsSection.selection as Record<string, string> | undefined;
    if (selection?.background) colors.selection_background = normalizeHex(selection.background);
    if (selection?.text && selection.text !== "CellForeground") colors.selection_foreground = normalizeHex(selection.text);

    const normal = colorsSection.normal as Record<string, string> | undefined;
    if (normal) {
      for (const [name, key] of Object.entries(ALACRITTY_NORMAL_MAP)) {
        if (normal[name]) colors[key] = normalizeHex(normal[name]);
      }
    }

    const bright = colorsSection.bright as Record<string, string> | undefined;
    if (bright) {
      for (const [name, key] of Object.entries(ALACRITTY_BRIGHT_MAP)) {
        if (bright[name]) colors[key] = normalizeHex(bright[name]);
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
// Find preview image using tree + README
// ---------------------------------------------------------------------------

const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|webp)$/i;
const GITHUB_USER_ASSETS = /github\.com\/user-attachments\/assets\//;
const SCREENSHOT_KEYWORDS = /screenshot|screen|preview|theme/i;
const SKIP_KEYWORDS = /shields\.io|badge|logo|icon|banner|title|header/i;
const SKIP_HOSTS = /imgur\.com/i;

function isImageUrl(url: string): boolean {
  return IMAGE_EXTENSIONS.test(url) || GITHUB_USER_ASSETS.test(url);
}

/** Extract image {alt, src} from both Markdown ![alt](src) and HTML <img> tags */
function extractReadmeImages(readme: string): Array<{ alt: string; src: string }> {
  const results: Array<{ alt: string; src: string }> = [];
  // Markdown images
  for (const m of readme.matchAll(/!\[(.*?)\]\((.*?)\)/g)) {
    results.push({ alt: m[1], src: m[2].trim() });
  }
  // HTML <img> tags
  for (const m of readme.matchAll(/<img\s[^>]*?src=["']([^"']+)["'][^>]*?>/gi)) {
    const alt = m[0].match(/alt=["']([^"']*?)["']/i)?.[1] ?? "";
    results.push({ alt, src: m[1].trim() });
  }
  return results;
}

function findPreviewImage(
  files: Set<string>,
  readme: string | null,
  owner: string,
  repo: string,
  branch: string,
  pathPrefix: string,
): string | null {
  const rawUrl = (path: string) =>
    `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;

  const prefix = pathPrefix.replace(/\/$/, "");

  // 1. Explicit preview files in tree (highest confidence)
  for (const name of ["preview.png", "preview.jpg", "preview.webp", "theme.png", "theme.jpg"]) {
    const fullPath = prefix ? `${prefix}/${name}` : name;
    if (files.has(fullPath)) return rawUrl(fullPath);
  }

  // 2. README images whose path/alt contains screenshot-like keywords
  if (readme) {
    const readmeImages = extractReadmeImages(readme);
    for (const { alt, src } of readmeImages) {
      if (SKIP_KEYWORDS.test(src) || SKIP_KEYWORDS.test(alt)) continue;
      if (SKIP_HOSTS.test(src)) continue;
      if (!isImageUrl(src)) continue;
      if (SCREENSHOT_KEYWORDS.test(src) || SCREENSHOT_KEYWORDS.test(alt)) {
        return normalizeImageUrl(src, owner, repo, branch, pathPrefix);
      }
    }
  }

  // 3. Any root-level image in tree (e.g. goldrush.png)
  for (const file of files) {
    if (!IMAGE_EXTENSIONS.test(file)) continue;
    // Must be at the theme root (no subdirectory beyond pathPrefix)
    const relative = prefix ? file.replace(`${prefix}/`, "") : file;
    if (relative.includes("/")) continue;
    if (SKIP_KEYWORDS.test(relative)) continue;
    return rawUrl(file);
  }

  // 4. First non-badge README image as last resort
  if (readme) {
    const readmeImages = extractReadmeImages(readme);
    for (const { alt, src } of readmeImages) {
      if (SKIP_KEYWORDS.test(src) || SKIP_KEYWORDS.test(alt)) continue;
      if (SKIP_HOSTS.test(src)) continue;
      if (src.endsWith(".svg")) continue;
      if (!isImageUrl(src)) continue;
      return normalizeImageUrl(src, owner, repo, branch, pathPrefix);
    }
  }

  return null;
}

function normalizeImageUrl(
  src: string,
  owner: string,
  repo: string,
  branch: string,
  pathPrefix: string,
): string {
  // Absolute URL — fix GitHub blob/raw URLs
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src.replace(
      /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(blob|raw)\/(.+)/,
      "https://raw.githubusercontent.com/$1/$2/$4",
    );
  }
  // Relative path → raw GitHub URL
  src = src.replace(/^\.\//, "");
  const fullPath = pathPrefix ? `${pathPrefix}${src}` : src;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${fullPath}`;
}

// ---------------------------------------------------------------------------
// Detect which apps a theme covers
// ---------------------------------------------------------------------------

const APP_FILE_MAP: Record<string, string> = {
  "alacritty.toml": "alacritty",
  "colors.toml": "alacritty",
  "btop.theme": "btop",
  "chromium.theme": "chromium",
  "ghostty.conf": "ghostty",
  "hyprland.conf": "hyprland",
  "hyprlock.conf": "hyprlock",
  "icons.theme": "icons",
  "kitty.conf": "kitty",
  "mako.ini": "mako",
  "neovim.lua": "neovim",
  "swayosd.css": "swayosd",
  "vscode.json": "vscode",
  "walker.css": "walker",
  "waybar.css": "waybar",
  "wofi.css": "wofi",
  "gtk-4.0.css": "gtk",
  "eza.yml": "eza",
};

async function fetchRepoTree(
  owner: string,
  repo: string,
  branch: string,
  token?: string,
): Promise<Set<string>> {
  const res = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    token,
  );
  if (!res.ok) return new Set();
  const data = (await res.json()) as { tree: { path: string; type: string }[] };
  return new Set(data.tree.filter(e => e.type === "blob").map(e => e.path));
}

function detectApps(files: Set<string>, pathPrefix: string): string[] {
  const apps = new Set<string>();

  for (const [filename, app] of Object.entries(APP_FILE_MAP)) {
    const fullPath = pathPrefix ? `${pathPrefix}/${filename}` : filename;
    if (files.has(fullPath)) {
      apps.add(app);
    }
  }

  // Builtin themes with colors.toml get all the auto-generated apps
  if (files.has(pathPrefix ? `${pathPrefix}/colors.toml` : "colors.toml")) {
    for (const app of ["hyprland", "hyprlock", "mako", "swayosd", "walker", "waybar", "ghostty"]) {
      apps.add(app);
    }
  }

  return [...apps].sort();
}

// ---------------------------------------------------------------------------
// Scrape a single theme
// ---------------------------------------------------------------------------

async function scrapeTheme(
  entry: ScrapeMessage,
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

  const meta = await fetchRepoMeta(owner, repo, token);

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

  const branch = meta.default_branch;

  // Fetch tree once — used for app detection and image finding
  const files = await fetchRepoTree(owner, repo, branch, token);

  // Detect which apps this theme covers
  const apps = detectApps(files, pathPrefix.replace(/\/$/, ""));

  // Fetch README.md
  const readme = await fetchFileContent(owner, repo, `${pathPrefix}README.md`, token);

  // Find preview image: tree files → README screenshot keywords → root images → README fallback
  const previewUrl = findPreviewImage(files, readme, owner, repo, branch, pathPrefix);
  result.has_preview = previewUrl !== null;

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
    apps_json: apps.length > 0 ? JSON.stringify(apps) : null,
    primary_hue: primaryHue,
    is_builtin: entry.is_builtin ? 1 : 0,
    is_curated: entry.is_curated ? 1 : 0,
    stars: meta.stars,
    readme: readme,
    default_branch: branch,
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
        description, preview_url, colors_json, apps_json, primary_hue,
        is_builtin, is_curated, stars, readme_text, default_branch,
        github_pushed_at, last_scraped_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        github_url = excluded.github_url,
        github_owner = excluded.github_owner,
        github_repo = excluded.github_repo,
        description = excluded.description,
        preview_url = excluded.preview_url,
        colors_json = excluded.colors_json,
        apps_json = excluded.apps_json,
        primary_hue = excluded.primary_hue,
        is_builtin = excluded.is_builtin,
        is_curated = excluded.is_curated,
        stars = excluded.stars,
        readme_text = excluded.readme_text,
        default_branch = excluded.default_branch,
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
      theme.apps_json,
      theme.primary_hue,
      theme.is_builtin,
      theme.is_curated,
      theme.stars,
      theme.readme,
      theme.default_branch,
      theme.github_pushed_at,
    )
    .run();
}

// ---------------------------------------------------------------------------
// Enqueue themes for scraping (producer)
// ---------------------------------------------------------------------------

async function enqueueThemes(env: Env, force: boolean): Promise<{ enqueued: number; skipped: number; total: number }> {
  const entries: ScrapeMessage[] = [];

  for (const t of themes.builtin as BuiltinTheme[]) {
    const url = t.url.replace(/\/$/, "");
    entries.push({ url, name: t.name, path: t.path, is_builtin: true, is_curated: false });
  }

  for (const t of themes.curated as CuratedTheme[]) {
    if (t.dead) continue;
    const url = t.url.replace(/\/$/, "");
    entries.push({ url, name: t.name, is_builtin: false, is_curated: true });
  }

  // Skip recently scraped (unless force)
  const recentlyScraped = new Set<string>();
  if (!force) {
    const existing = await env.DB
      .prepare("SELECT id FROM themes WHERE last_scraped_at > datetime('now', '-12 hours')")
      .all<{ id: string }>();
    for (const row of existing.results) {
      recentlyScraped.add(row.id);
    }
  }

  const messages: { body: ScrapeMessage }[] = [];
  let skipped = 0;

  for (const entry of entries) {
    const { repo } = parseOwnerRepo(entry.url);
    const expectedSlug = entry.path ? deriveSlugFromPath(entry.path) : deriveSlugFromRepo(repo);
    if (recentlyScraped.has(expectedSlug)) {
      skipped++;
      continue;
    }
    messages.push({ body: entry });
  }

  // Queue.sendBatch accepts up to 100 messages at a time
  for (let i = 0; i < messages.length; i += 100) {
    await env.SCRAPE_QUEUE.sendBatch(messages.slice(i, i + 100));
  }

  console.log(`Enqueued ${messages.length} themes (${skipped} skipped, ${entries.length} total)`);
  return { enqueued: messages.length, skipped, total: entries.length };
}

// ---------------------------------------------------------------------------
// Process a batch of themes (queue consumer)
// ---------------------------------------------------------------------------

async function processBatch(
  batch: MessageBatch<ScrapeMessage>,
  env: Env,
): Promise<void> {
  const token = env.GITHUB_TOKEN;

  for (const msg of batch.messages) {
    const entry = msg.body;
    try {
      const { record, result } = await scrapeTheme(entry, token);
      await upsertTheme(env.DB, record);
      console.log(`OK: ${record.slug} [colors: ${result.colors_source}, preview: ${result.has_preview}]`);
      msg.ack();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`FAIL: ${entry.name}: ${errorMsg}`);
      msg.retry();
    }
  }
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
  // Cron trigger: enqueue all themes for scraping
  async scheduled(
    _controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    ctx.waitUntil(enqueueThemes(env, false));
  },

  // Queue consumer: scrape themes in batches
  async queue(
    batch: MessageBatch<ScrapeMessage>,
    env: Env,
  ): Promise<void> {
    await processBatch(batch, env);
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data, null, 2), {
        status,
        headers: { "Content-Type": "application/json" },
      });

    // Authenticate admin endpoints
    if (url.pathname === "/run" || url.pathname === "/run-force" || url.pathname === "/status") {
      const authHeader = request.headers.get("Authorization");
      const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
      if (!env.SCRAPER_AUTH_TOKEN || !token || !(await timingSafeEqual(token, env.SCRAPER_AUTH_TOKEN))) {
        return json({ error: "Unauthorized" }, 401);
      }
    }

    // POST /run — enqueue themes for scraping (skips recently scraped)
    if (url.pathname === "/run" && request.method === "POST") {
      const summary = await enqueueThemes(env, false);
      return json(summary);
    }

    // POST /run-force — enqueue all themes (ignores 12hr cache)
    if (url.pathname === "/run-force" && request.method === "POST") {
      const summary = await enqueueThemes(env, true);
      return json(summary);
    }

    // GET /status — show current DB health
    if (url.pathname === "/status") {
      const status = await getStatus(env.DB);
      return json(status);
    }

    return json({
      name: "Omarchy Theme Scraper",
      endpoints: {
        "POST /run": "Enqueue themes for scraping (skips recently scraped)",
        "POST /run-force": "Enqueue all themes (ignores 12hr cache)",
        "GET /status": "Show DB health — missing colors, stale themes, etc.",
      },
    });
  },
};
