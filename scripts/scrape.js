// Read src/data/themes.json → fetch each theme from GitHub → write src/data/themes-data.json
// Replaces the Cloudflare Worker scraper.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseTOML } from "smol-toml";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const REGISTRY_PATH = path.join(ROOT, "src/data/themes.json");
const OUTPUT_PATH = path.join(ROOT, "src/data/themes-data.json");

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const CONCURRENCY = 5;
const LIMIT = process.env.LIMIT ? parseInt(process.env.LIMIT, 10) : 0;
const THUMBS_DIR = path.join(ROOT, "public/thumbs");
const THUMB_WIDTHS = [400, 800, 1200];

const log = (...args) => console.log(...args);

// ---------- slug + parse helpers ----------

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function deriveSlugFromRepo(repoName) {
  let s = repoName.toLowerCase().replace(/^omarchy-/, "").replace(/-theme$/, "");
  return slugify(s);
}

function deriveSlugFromPath(p) {
  return slugify(p.split("/").pop());
}

function parseOwnerRepo(url) {
  const m = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!m) throw new Error(`Invalid GitHub URL: ${url}`);
  return { owner: m[1], repo: m[2] };
}

// ---------- color helpers ----------

function hexToHSL(hex) {
  hex = hex.replace(/^(#|0x|0X)/, "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    default: h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function computeHueBucket(hex, bgHex) {
  const { h, s, l } = hexToHSL(hex);
  if (s < 10 || l > 95 || l < 5) {
    if (bgHex) {
      const bgL = hexToHSL(bgHex).l;
      if (bgL > 50) return "white";
      if (l > 50) return "grey";
      return "black";
    } else {
      if (l < 45) return "black";
      if (l > 65) return "white";
      return "grey";
    }
  }
  if (h >= 10 && h <= 55 && s <= 65 && l <= 52) return "brown";
  if (h > 175 && h <= 200 && s > 40) return "cyan";
  if (h <= 15 || h >= 340) return "red";
  if (h <= 40) return "orange";
  if (h <= 65) return "yellow";
  if (h <= 160) return "green";
  if (h <= 195) return "teal";
  if (h <= 250) return "blue";
  if (h <= 290) return "purple";
  return "pink";
}

function normalizeHex(value) {
  return value.startsWith("0x") || value.startsWith("0X") ? "#" + value.slice(2) : value;
}

const EXPECTED_COLOR_KEYS = [
  "accent", "cursor", "foreground", "background",
  "selection_foreground", "selection_background",
  ...Array.from({ length: 16 }, (_, i) => `color${i}`),
];

function parseColors(tomlContent) {
  try {
    const parsed = parseTOML(tomlContent);
    const colors = {};
    for (const key of EXPECTED_COLOR_KEYS) {
      if (typeof parsed[key] === "string") colors[key] = normalizeHex(parsed[key]);
    }
    return colors.accent ? colors : null;
  } catch { return null; }
}

const ALACRITTY_NORMAL_MAP = {
  black: "color0", red: "color1", green: "color2", yellow: "color3",
  blue: "color4", magenta: "color5", cyan: "color6", white: "color7",
};
const ALACRITTY_BRIGHT_MAP = {
  black: "color8", red: "color9", green: "color10", yellow: "color11",
  blue: "color12", magenta: "color13", cyan: "color14", white: "color15",
};

function parseAlacrittyColors(tomlContent) {
  try {
    const parsed = parseTOML(tomlContent);
    const section = parsed.colors;
    if (!section) return null;
    const colors = {};
    if (section.primary?.background) colors.background = normalizeHex(section.primary.background);
    if (section.primary?.foreground) colors.foreground = normalizeHex(section.primary.foreground);
    if (section.cursor?.cursor) colors.cursor = normalizeHex(section.cursor.cursor);
    if (section.selection?.background) colors.selection_background = normalizeHex(section.selection.background);
    if (section.selection?.text && section.selection.text !== "CellForeground") {
      colors.selection_foreground = normalizeHex(section.selection.text);
    }
    if (section.normal) {
      for (const [n, k] of Object.entries(ALACRITTY_NORMAL_MAP)) {
        if (section.normal[n]) colors[k] = normalizeHex(section.normal[n]);
      }
    }
    if (section.bright) {
      for (const [n, k] of Object.entries(ALACRITTY_BRIGHT_MAP)) {
        if (section.bright[n]) colors[k] = normalizeHex(section.bright[n]);
      }
    }
    if (!colors.accent) colors.accent = colors.color4 ?? colors.color5 ?? colors.foreground ?? "";
    return colors.accent ? colors : null;
  } catch { return null; }
}

// ---------- terminal style ----------

function stripQuotes(v) { return v.replace(/^["']|["']$/g, ""); }

function parseFlatConfig(content, mode) {
  const out = new Map();
  for (const raw of content.split("\n")) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    let key, value;
    if (mode === "equals") {
      const eq = line.indexOf("=");
      if (eq !== -1) { key = line.slice(0, eq).trim(); value = line.slice(eq + 1).trim(); }
      else { const m = line.match(/^(\S+)\s+(.+)$/); if (m) { key = m[1]; value = m[2]; } }
    } else {
      const m = line.match(/^(\S+)\s+(.+)$/); if (m) { key = m[1]; value = m[2]; }
    }
    if (key && value !== undefined) out.set(key, stripQuotes(value.trim()));
  }
  return out;
}

function clamp01(n) { return Number.isNaN(n) ? 1 : Math.max(0, Math.min(1, n)); }

function normalizeCursorStyle(v) {
  const s = v.toLowerCase();
  if (s.includes("beam") || s.includes("bar") || s.includes("ibeam")) return "beam";
  if (s.includes("underline") || s.includes("under")) return "underline";
  if (s.includes("block")) return "block";
  return undefined;
}

function parseGhosttyStyle(content) {
  const cfg = parseFlatConfig(content, "equals");
  const out = {};
  if (cfg.has("background-opacity")) out.background_opacity = clamp01(parseFloat(cfg.get("background-opacity")));
  const px = cfg.get("window-padding-x"), py = cfg.get("window-padding-y");
  if (px !== undefined || py !== undefined) {
    const a = parseFloat(px ?? py ?? "0"), b = parseFloat(py ?? px ?? "0");
    if (!Number.isNaN(a) && !Number.isNaN(b)) out.padding = Math.max(a, b);
  }
  if (cfg.has("font-family")) out.font_family = cfg.get("font-family");
  if (cfg.has("cursor-style")) out.cursor_style = normalizeCursorStyle(cfg.get("cursor-style"));
  return out;
}

function parseKittyStyle(content) {
  const cfg = parseFlatConfig(content, "space");
  const out = {};
  if (cfg.has("background_opacity")) out.background_opacity = clamp01(parseFloat(cfg.get("background_opacity")));
  if (cfg.has("window_padding_width")) {
    const n = parseFloat(cfg.get("window_padding_width").split(/\s+/)[0]);
    if (!Number.isNaN(n)) out.padding = n;
  }
  if (cfg.has("font_family")) out.font_family = cfg.get("font_family");
  if (cfg.has("cursor_shape")) out.cursor_style = normalizeCursorStyle(cfg.get("cursor_shape"));
  return out;
}

function parseAlacrittyStyle(tomlContent) {
  try {
    const parsed = parseTOML(tomlContent);
    const out = {};
    if (parsed.window) {
      if (typeof parsed.window.opacity === "number") out.background_opacity = clamp01(parsed.window.opacity);
      const pad = parsed.window.padding;
      if (pad && (typeof pad.x === "number" || typeof pad.y === "number")) {
        out.padding = Math.max(pad.x ?? 0, pad.y ?? 0);
      }
    }
    if (parsed.font?.normal?.family) out.font_family = parsed.font.normal.family;
    if (parsed.cursor) {
      const style = parsed.cursor.style;
      if (typeof style === "string") out.cursor_style = normalizeCursorStyle(style);
      else if (style && typeof style === "object" && typeof style.shape === "string") {
        out.cursor_style = normalizeCursorStyle(style.shape);
      }
    }
    return out;
  } catch { return null; }
}

function parseHyprlandRounding(content) {
  const m = content.match(/decoration\s*\{[^}]*?\brounding\s*=\s*(\d+(?:\.\d+)?)/s);
  if (m) { const n = parseFloat(m[1]); if (!Number.isNaN(n)) return n; }
  return undefined;
}

// ---------- preview image ----------

const IMAGE_EXTENSIONS = /\.(png|jpg|jpeg|webp)$/i;
const GITHUB_USER_ASSETS = /github\.com\/user-attachments\/assets\//;
const SCREENSHOT_KEYWORDS = /screenshot|screen|preview|theme/i;
const SKIP_KEYWORDS = /shields\.io|badge|logo|icon|banner|title|header/i;
const SKIP_HOSTS = /imgur\.com/i;

function isImageUrl(url) {
  return IMAGE_EXTENSIONS.test(url) || GITHUB_USER_ASSETS.test(url);
}

function extractReadmeImages(readme) {
  const out = [];
  for (const m of readme.matchAll(/!\[(.*?)\]\((.*?)\)/g)) out.push({ alt: m[1], src: m[2].trim() });
  for (const m of readme.matchAll(/<img\s[^>]*?src=["']([^"']+)["'][^>]*?>/gi)) {
    const alt = m[0].match(/alt=["']([^"']*?)["']/i)?.[1] ?? "";
    out.push({ alt, src: m[1].trim() });
  }
  return out;
}

function normalizeImageUrl(src, owner, repo, branch, pathPrefix) {
  if (src.startsWith("http://") || src.startsWith("https://")) {
    let url = src.replace(
      /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(blob|raw)\/(.+)/,
      "https://raw.githubusercontent.com/$1/$2/$4",
    );
    const re = new RegExp(`^https://raw\\.githubusercontent\\.com/${owner}/${repo}/([^/]+)/(.+)$`);
    const m = url.match(re);
    if (m && m[1] !== branch) url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${m[2]}`;
    return url;
  }
  const clean = src.replace(/^\.\//, "");
  const fullPath = pathPrefix ? `${pathPrefix}${clean}` : clean;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${fullPath}`;
}

function findPreviewImage(files, readme, owner, repo, branch, pathPrefix) {
  const rawUrl = (p) => `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${p}`;
  const prefix = pathPrefix.replace(/\/$/, "");

  for (const name of ["preview.png", "preview.jpg", "preview.webp", "theme.png", "theme.jpg"]) {
    const full = prefix ? `${prefix}/${name}` : name;
    if (files.has(full)) return rawUrl(full);
  }

  if (readme) {
    const imgs = extractReadmeImages(readme);
    for (const { alt, src } of imgs) {
      if (SKIP_KEYWORDS.test(src) || SKIP_KEYWORDS.test(alt) || SKIP_HOSTS.test(src) || !isImageUrl(src)) continue;
      if (SCREENSHOT_KEYWORDS.test(src) || SCREENSHOT_KEYWORDS.test(alt)) {
        return normalizeImageUrl(src, owner, repo, branch, pathPrefix);
      }
    }
  }

  for (const file of files) {
    if (!IMAGE_EXTENSIONS.test(file)) continue;
    const relative = prefix ? file.replace(`${prefix}/`, "") : file;
    if (relative.includes("/")) continue;
    if (SKIP_KEYWORDS.test(relative)) continue;
    return rawUrl(file);
  }

  if (readme) {
    const imgs = extractReadmeImages(readme);
    for (const { alt, src } of imgs) {
      if (SKIP_KEYWORDS.test(src) || SKIP_KEYWORDS.test(alt) || SKIP_HOSTS.test(src)) continue;
      if (src.endsWith(".svg") || !isImageUrl(src)) continue;
      return normalizeImageUrl(src, owner, repo, branch, pathPrefix);
    }
  }

  return null;
}

// ---------- apps + security ----------

const APP_FILE_MAP = {
  "alacritty.toml": "alacritty", "colors.toml": "alacritty",
  "btop.theme": "btop", "chromium.theme": "chromium",
  "ghostty.conf": "ghostty", "hyprland.conf": "hyprland", "hyprlock.conf": "hyprlock",
  "icons.theme": "icons", "kitty.conf": "kitty", "mako.ini": "mako",
  "neovim.lua": "neovim", "swayosd.css": "swayosd", "vscode.json": "vscode",
  "walker.css": "walker", "waybar.css": "waybar", "wofi.css": "wofi",
  "gtk-4.0.css": "gtk", "eza.yml": "eza",
};

function detectApps(files, pathPrefix) {
  const apps = new Set();
  for (const [filename, app] of Object.entries(APP_FILE_MAP)) {
    const full = pathPrefix ? `${pathPrefix}/${filename}` : filename;
    if (files.has(full)) apps.add(app);
  }
  const colorsTomlPath = pathPrefix ? `${pathPrefix}/colors.toml` : "colors.toml";
  if (files.has(colorsTomlPath)) {
    for (const app of ["hyprland", "hyprlock", "mako", "swayosd", "walker", "waybar", "ghostty"]) apps.add(app);
  }
  return [...apps].sort();
}

const SUSPICIOUS_EXTENSIONS = new Set([
  ".sh", ".bash", ".zsh", ".py", ".js", ".ts", ".rb", ".pl",
  ".exe", ".bin", ".elf", ".so", ".dll", ".dylib",
  ".AppImage", ".deb", ".rpm",
]);

function scanForSuspiciousFiles(files, pathPrefix) {
  const warnings = [];
  for (const file of files) {
    if (pathPrefix && !file.startsWith(pathPrefix)) continue;
    const name = file.split("/").pop() ?? file;
    const ext = name.includes(".") ? "." + name.split(".").pop().toLowerCase() : "";
    if (SUSPICIOUS_EXTENSIONS.has(ext)) warnings.push(`suspicious file: ${file}`);
    if (name.startsWith(".") && name !== ".gitignore" && name !== ".gitattributes" && !file.includes(".github/")) {
      if (![".toml", ".css", ".json", ".yaml", ".yml", ".conf", ".ini", ".theme", ".lua", ".fish"].includes(ext)) {
        warnings.push(`hidden file: ${file}`);
      }
    }
  }
  return warnings;
}

async function scanVscodeExtension(files, owner, repo, pathPrefix) {
  const p = pathPrefix ? `${pathPrefix}/vscode.json` : "vscode.json";
  if (!files.has(p)) return [];
  const content = await fetchFileContent(owner, repo, p);
  if (!content) return [];
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed.extension === "string" && parsed.extension.trim()) {
      return [`vscode.json installs extension: ${parsed.extension.trim()}`];
    }
  } catch {}
  return [];
}

async function scanLuaFiles(files, owner, repo, pathPrefix) {
  const warnings = [];
  const dangerous = /os\.execute|io\.popen|vim\.fn\.system|vim\.fn\.systemlist|loadstring|dofile/;
  for (const file of files) {
    if (pathPrefix && !file.startsWith(pathPrefix)) continue;
    if (!file.endsWith(".lua")) continue;
    const content = await fetchFileContent(owner, repo, file);
    if (content && dangerous.test(content)) {
      const m = content.match(dangerous);
      warnings.push(`dangerous lua code in ${file}: ${m?.[0]}`);
    }
  }
  return warnings;
}

// ---------- GitHub API ----------

async function githubFetch(url, opts = {}) {
  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "omarchy-theme-scraper",
    ...opts.headers,
  };
  if (GITHUB_TOKEN) headers.Authorization = `Bearer ${GITHUB_TOKEN}`;
  if (opts.body) headers["Content-Type"] = "application/json";
  const res = await fetch(url, { ...opts, headers });
  if (res.status === 429) {
    const reset = res.headers.get("X-RateLimit-Reset");
    const at = reset ? new Date(parseInt(reset, 10) * 1000).toISOString() : "unknown";
    throw new Error(`GitHub rate limit exceeded (429). Resets at ${at}`);
  }
  const remaining = res.headers.get("X-RateLimit-Remaining");
  if (remaining !== null) {
    const n = parseInt(remaining, 10);
    if (n === 0) {
      const reset = res.headers.get("X-RateLimit-Reset");
      const at = reset ? new Date(parseInt(reset, 10) * 1000).toISOString() : "unknown";
      throw new Error(`GitHub rate limit exhausted. Resets at ${at}`);
    }
  }
  return res;
}

async function fetchRepoMeta(owner, repo) {
  const res = await githubFetch(`https://api.github.com/repos/${owner}/${repo}`);
  if (!res.ok) {
    const err = new Error(`GitHub API ${res.status}: repos/${owner}/${repo}`);
    err.httpStatus = res.status;
    throw err;
  }
  const d = await res.json();
  return {
    description: d.description,
    stars: d.stargazers_count,
    default_branch: d.default_branch,
    pushed_at: d.pushed_at,
    full_name: d.full_name,
  };
}

async function fetchFileContent(owner, repo, path) {
  const res = await githubFetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.content) return null;
  return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf8");
}

async function fetchRepoTree(owner, repo, branch) {
  const res = await githubFetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
  if (!res.ok) return new Set();
  const d = await res.json();
  return new Set(d.tree.filter((e) => e.type === "blob").map((e) => e.path));
}

async function fetchTerminalStyle(owner, repo, pathPrefix) {
  let style = null, source;
  const ghostty = await fetchFileContent(owner, repo, `${pathPrefix}ghostty.conf`);
  if (ghostty) { style = parseGhosttyStyle(ghostty); source = "ghostty.conf"; }
  else {
    const kitty = await fetchFileContent(owner, repo, `${pathPrefix}kitty.conf`);
    if (kitty) { style = parseKittyStyle(kitty); source = "kitty.conf"; }
    else {
      const alacritty = await fetchFileContent(owner, repo, `${pathPrefix}alacritty.toml`);
      if (alacritty) { style = parseAlacrittyStyle(alacritty); if (style) source = "alacritty.toml"; }
    }
  }
  let rounding;
  const hypr = await fetchFileContent(owner, repo, `${pathPrefix}hyprland.conf`);
  if (hypr) rounding = parseHyprlandRounding(hypr);

  if (!style && rounding === undefined) return null;
  if (!source && rounding !== undefined) source = "alacritty.toml";
  const result = { source };
  if (style) Object.assign(result, style);
  if (rounding !== undefined) result.rounding = rounding;
  const hasAny = result.background_opacity !== undefined || result.padding !== undefined
    || result.font_family !== undefined || result.cursor_style !== undefined || result.rounding !== undefined;
  return hasAny ? result : null;
}

// ---------- main per-theme scrape ----------

async function scrapeTheme(entry, cachedBySlug) {
  const { owner, repo } = parseOwnerRepo(entry.url);
  let slug = entry.is_builtin && entry.path ? deriveSlugFromPath(entry.path) : deriveSlugFromRepo(repo);
  const overlaysBuiltin = entry.overlays_builtin ?? null;
  if (overlaysBuiltin) slug = `${slug}-${owner.toLowerCase()}`;

  const meta = await fetchRepoMeta(owner, repo);
  let canonicalGithubUrl = null;
  if (meta.full_name.toLowerCase() !== `${owner}/${repo}`.toLowerCase()) {
    canonicalGithubUrl = `https://github.com/${meta.full_name}`;
  }

  // Skip-if-unchanged optimization: if the repo hasn't been pushed since we
  // last scraped, reuse the cached deep-scrape data (colors, README, tree,
  // security scan) and just refresh the fast-moving fields (stars,
  // description, last_scraped_at) from the meta call we already paid for.
  // Saves ~7-10 API calls per unchanged theme.
  const cached = cachedBySlug?.get(slug);
  if (cached && cached.github_pushed_at === meta.pushed_at && cached.colors_json !== undefined) {
    const cachedColors = cached.colors_json ? JSON.parse(cached.colors_json) : null;
    return {
      ...cached,
      name: entry.name,                         // registry might rename
      stars: meta.stars,                        // refresh
      description: meta.description,            // refresh
      default_branch: meta.default_branch,      // catch branch renames
      canonical_github_url: canonicalGithubUrl, // catch repo renames
      primary_hue: cachedColors?.accent ? computeHueBucket(cachedColors.accent, cachedColors?.background) : null,
      last_scraped_at: new Date().toISOString(),
      _from_cache: true,
    };
  }

  const pathPrefix = entry.path ? `${entry.path}/` : "";
  const branch = meta.default_branch;

  let colors = null, colorsSource = "none";
  const colorsToml = await fetchFileContent(owner, repo, `${pathPrefix}colors.toml`);
  if (colorsToml) { colors = parseColors(colorsToml); if (colors) colorsSource = "colors.toml"; }
  if (!colors) {
    const alacrittyToml = await fetchFileContent(owner, repo, `${pathPrefix}alacritty.toml`);
    if (alacrittyToml) { colors = parseAlacrittyColors(alacrittyToml); if (colors) colorsSource = "alacritty.toml"; }
  }

  const primaryHue = colors?.accent ? computeHueBucket(colors.accent, colors?.background) : null;
  const terminalStyle = await fetchTerminalStyle(owner, repo, pathPrefix);
  const files = await fetchRepoTree(owner, repo, branch);
  const apps = detectApps(files, pathPrefix.replace(/\/$/, ""));

  const fileWarnings = scanForSuspiciousFiles(files, pathPrefix);
  const luaWarnings = await scanLuaFiles(files, owner, repo, pathPrefix.replace(/\/$/, ""));
  const vscodeWarnings = await scanVscodeExtension(files, owner, repo, pathPrefix.replace(/\/$/, ""));
  const allWarnings = [...fileWarnings, ...luaWarnings, ...vscodeWarnings];

  const readme = await fetchFileContent(owner, repo, `${pathPrefix}README.md`)
    ?? await fetchFileContent(owner, repo, `${pathPrefix}readme.md`);

  const previewUrl = findPreviewImage(files, readme, owner, repo, branch, pathPrefix);

  const githubUrl = entry.is_builtin ? `${entry.url}/tree/${branch}/${entry.path}` : entry.url;
  const nowIso = new Date().toISOString();

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
    apps_json: apps.length > 0 ? JSON.stringify(apps) : null,
    primary_hue: primaryHue,
    is_builtin: entry.is_builtin ? 1 : 0,
    is_curated: entry.is_curated ? 1 : 0,
    stars: meta.stars,
    readme_text: readme,
    default_branch: branch,
    last_scraped_at: nowIso,
    created_at: nowIso,
    updated_at: nowIso,
    github_pushed_at: meta.pushed_at,
    canonical_github_url: canonicalGithubUrl,
    overlays_builtin: overlaysBuiltin,
    security_warnings: allWarnings.length > 0 ? JSON.stringify(allWarnings) : null,
    terminal_style_json: terminalStyle ? JSON.stringify(terminalStyle) : null,
    colors_source: colorsSource,
  };
}

// ---------- concurrency-limited batch runner ----------

async function runBatched(items, fn, concurrency) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      try { results[i] = { ok: true, value: await fn(items[i], i) }; }
      catch (err) { results[i] = { ok: false, error: err }; }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return results;
}

// ---------- thumbnail generation ----------

// Generates one file per target width (capped at the source width, deduped),
// named {slug}-{actualWidth}.webp. Returns the list of actual widths so the
// renderer can emit a truthful srcset.
async function generateThumbnail(previewUrl, slug) {
  try {
    const res = await fetch(previewUrl, {
      headers: { "User-Agent": "omarchy-theme-scraper" },
      redirect: "follow",
    });
    if (!res.ok) {
      log(`[thumb] ${slug}: HTTP ${res.status} — skipped`);
      return null;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const meta = await sharp(buffer).metadata();
    const widths = [];
    for (const target of THUMB_WIDTHS) {
      const actual = Math.min(target, meta.width ?? target);
      if (widths.includes(actual)) continue;
      await sharp(buffer)
        .resize(actual)
        .webp({ quality: 80 })
        .toFile(path.join(THUMBS_DIR, `${slug}-${actual}.webp`));
      widths.push(actual);
    }
    return widths;
  } catch (err) {
    log(`[thumb] ${slug}: ${err.message} — skipped`);
    return null;
  }
}

function thumbVariantsExist(record) {
  return Array.isArray(record.thumbnail_widths) && record.thumbnail_widths.length > 0 &&
    record.thumbnail_widths.every((w) => fs.existsSync(path.join(THUMBS_DIR, `${record.slug}-${w}.webp`)));
}

async function generateThumbnails(rawRecords) {
  fs.mkdirSync(THUMBS_DIR, { recursive: true });

  const withPreview = rawRecords.filter((r) => r.preview_url);
  const toGenerate = withPreview.filter((r) => !(r._from_cache && thumbVariantsExist(r)));

  if (toGenerate.length > 0) {
    log(`[thumb] generating ${toGenerate.length} thumbnails (${withPreview.length - toGenerate.length} cached)`);
    let done = 0;
    await runBatched(toGenerate, async (record) => {
      const widths = await generateThumbnail(record.preview_url, record.slug);
      if (widths) record.thumbnail_widths = widths;
      else delete record.thumbnail_widths;
      done++;
      if (widths) log(`[thumb] (${done}/${toGenerate.length}) ${record.slug} [${widths.join(",")}]`);
    }, CONCURRENCY);
  } else {
    log("[thumb] all thumbnails up to date");
  }

  if (LIMIT > 0) return;

  const validFiles = new Set();
  for (const r of withPreview) {
    for (const w of r.thumbnail_widths ?? []) validFiles.add(`${r.slug}-${w}.webp`);
  }
  for (const file of fs.readdirSync(THUMBS_DIR)) {
    if (!validFiles.has(file)) {
      fs.unlinkSync(path.join(THUMBS_DIR, file));
      log(`[thumb] removed orphan: ${file}`);
    }
  }
}

// ---------- dead-repo issue filing ----------

const SITE_REPO = process.env.GITHUB_REPOSITORY || "limehawk/omarchy-theme-website";

async function fileDeadRepoIssues(deadRepos) {
  if (!GITHUB_TOKEN) {
    log("[scrape] no GITHUB_TOKEN — skipping issue filing");
    return;
  }

  // Ensure the dead-theme label exists
  const labelRes = await githubFetch(`https://api.github.com/repos/${SITE_REPO}/labels/dead-theme`);
  if (labelRes.status === 404) {
    await githubFetch(`https://api.github.com/repos/${SITE_REPO}/labels`, {
      method: "POST",
      body: JSON.stringify({ name: "dead-theme", color: "B60205", description: "Theme repo is no longer accessible" }),
    });
  }

  // Check existing open issues to avoid duplicates
  const existingRes = await githubFetch(`https://api.github.com/repos/${SITE_REPO}/issues?labels=dead-theme&state=open&per_page=100`);
  const existing = existingRes.ok ? await existingRes.json() : [];
  const existingUrls = new Set(existing.map((i) => i.body).filter(Boolean).flatMap((b) => {
    const m = b.match(/https:\/\/github\.com\/[^\s)]+/g);
    return m || [];
  }));

  for (const dead of deadRepos) {
    if (existingUrls.has(dead.url)) {
      log(`[scrape] issue already open for ${dead.entry} — skipping`);
      continue;
    }

    const body = `The theme **${dead.entry}** returned HTTP 404 during the nightly scrape.

` +
      `- **URL:** ${dead.url}
` +
      `- **Action needed:** Check if the repo was renamed/moved. Update \`themes.json\` with the new URL or mark as \`"dead": true\` if permanently gone.
`;

    const createRes = await githubFetch(`https://api.github.com/repos/${SITE_REPO}/issues`, {
      method: "POST",
      body: JSON.stringify({ title: `Dead theme repo: ${dead.entry}`, body, labels: ["dead-theme"] }),
    });

    if (createRes.ok) {
      const issue = await createRes.json();
      log(`[scrape] filed issue #${issue.number} for dead repo: ${dead.entry}`);
    } else {
      console.warn(`[scrape] failed to file issue for ${dead.entry}: ${createRes.status}`);
    }
  }
}

// ---------- main ----------

async function main() {
  log(`[scrape] reading ${REGISTRY_PATH}`);
  const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf8"));

  const entries = [];
  const builtinSlugs = new Set();
  for (const t of registry.builtin) {
    const url = t.url.replace(/\/$/, "");
    entries.push({ url, name: t.name, path: t.path, is_builtin: true, is_curated: false });
    builtinSlugs.add(deriveSlugFromPath(t.path));
  }
  for (const t of registry.curated) {
    if (t.dead) continue;
    const url = t.url.replace(/\/$/, "");
    const { repo } = parseOwnerRepo(url);
    const baseSlug = deriveSlugFromRepo(repo);
    const overlaysBuiltin = builtinSlugs.has(baseSlug) ? baseSlug : undefined;
    entries.push({ url, name: t.name, is_builtin: false, is_curated: true, overlays_builtin: overlaysBuiltin });
  }

  // Load the existing scraped data so we can fall back to cached records
  // for any theme that fails to scrape (e.g. transient GitHub error or rate
  // limit). Dropping a theme from the output silently is a correctness bug —
  // we'd rather ship slightly stale data than no data.
  const cachedBySlug = new Map();
  if (fs.existsSync(OUTPUT_PATH)) {
    try {
      const cached = JSON.parse(fs.readFileSync(OUTPUT_PATH, "utf8"));
      for (const r of cached) cachedBySlug.set(r.slug, r);
      log(`[scrape] cached records: ${cachedBySlug.size}`);
    } catch (err) {
      console.warn("[scrape] could not parse existing themes-data.json:", err.message);
    }
  }

  const targets = LIMIT > 0 ? entries.slice(0, LIMIT) : entries;
  log(`[scrape] ${targets.length}${LIMIT > 0 ? ` (limited from ${entries.length})` : ""} themes to scrape (auth: ${GITHUB_TOKEN ? "yes" : "anonymous"})`);
  if (!GITHUB_TOKEN) {
    console.warn("[scrape] WARNING: no GITHUB_TOKEN set — anonymous rate limit is 60 req/hr");
  }

  let done = 0;
  let skipped = 0;
  const results = await runBatched(targets, async (entry) => {
    const record = await scrapeTheme(entry, cachedBySlug);
    done++;
    if (record._from_cache) skipped++;
    log(`[scrape] (${done}/${targets.length}) ${record.slug}${record._from_cache ? " [cached]" : ""}`);
    return record;
  }, CONCURRENCY);

  const rawRecords = [];
  const errors = [];
  const reusedFromCache = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].ok) {
      rawRecords.push(results[i].value);
    } else {
      const entry = targets[i];
      const { owner, repo } = parseOwnerRepo(entry.url);
      const slug = entry.is_builtin && entry.path
        ? deriveSlugFromPath(entry.path)
        : (entry.overlays_builtin ? deriveSlugFromRepo(repo) + "-" + owner.toLowerCase() : deriveSlugFromRepo(repo));
      const cached = cachedBySlug.get(slug);
      if (cached) {
        rawRecords.push({ ...cached, _from_cache: true });
        reusedFromCache.push(entry.name);
      }
      errors.push({ entry: entry.name, url: entry.url, error: results[i].error.message, httpStatus: results[i].error.httpStatus });
    }
  }

  await generateThumbnails(rawRecords);

  const records = rawRecords.map(({ _from_cache, ...clean }) => {
    delete clean.thumbnail_url; // legacy single-width field
    return clean;
  });

  records.sort((a, b) => b.stars - a.stars);

  // LIMIT mode (test only): merge results with the rest of the cached set so
  // we don't truncate the production file during a partial run.
  if (LIMIT > 0) {
    const touchedSlugs = new Set(records.map((r) => r.slug));
    for (const cached of cachedBySlug.values()) {
      if (!touchedSlugs.has(cached.slug)) records.push(cached);
    }
    log(`[scrape] LIMIT mode — merged ${cachedBySlug.size - touchedSlugs.size} unchanged cached records into output`);
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(records, null, 2));
  log(`[scrape] wrote ${records.length} themes → ${OUTPUT_PATH}`);
  if (skipped > 0) {
    log(`[scrape] skipped ${skipped} themes with unchanged pushed_at (cache hit, ~${skipped * 7} API calls saved)`);
  }
  if (reusedFromCache.length > 0) {
    log(`[scrape] reused ${reusedFromCache.length} cached records for failed scrapes (data preserved)`);
  }
  if (errors.length > 0) {
    console.warn(`[scrape] ${errors.length} errors:`);
    for (const e of errors) console.warn(`  ${e.entry}: ${e.error}`);
  }

  // File GitHub issues for dead repos (404s only, not transient errors)
  const deadRepos = errors.filter((e) => e.httpStatus === 404);
  if (deadRepos.length > 0) {
    log(`[scrape] ${deadRepos.length} dead repo(s) detected — filing issues`);
    await fileDeadRepoIssues(deadRepos);
  }
}

main().catch((err) => { console.error("[scrape] fatal:", err); process.exit(1); });
