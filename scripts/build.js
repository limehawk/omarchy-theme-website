import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  homePage,
  browsePage,
  themeDetailPage,
  notFoundPage,
} from "./render.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "out");
const PUBLIC = path.join(ROOT, "public");
const DATA = path.join(ROOT, "src/data/themes-data.json");
const SITE_URL = "https://omarchytheme.com";

const log = (msg) => console.log(`[build] ${msg}`);

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeFile(rel, content) {
  const full = path.join(OUT, rel);
  ensureDir(path.dirname(full));
  fs.writeFileSync(full, content);
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    ensureDir(dest);
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }
}

// ---------- data selection (ported from src/lib/db.ts) ----------

// Deterministic daily shuffle: same order for a given UTC day, reshuffles each day.
function dailyShuffle(items) {
  const seed = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash + i) | 0;
    const j = (hash >>> 0) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const POPULAR_STAR_THRESHOLD = 50;

function getFeaturedThemes(themes, limit = 6) {
  const community = themes.filter((t) => t.is_builtin === 0);
  const pool = community.filter((t) => t.stars > POPULAR_STAR_THRESHOLD);
  // Shuffle among all "popular" themes so the section rotates daily. If too few
  // clear the threshold to fill the section, fall back to top themes by stars.
  const selection = pool.length >= limit
    ? dailyShuffle(pool)
    : [...community].sort((a, b) => b.stars - a.stars);
  return selection.slice(0, limit);
}

function getRandomThemes(themes, count, exclude) {
  const candidates = themes.filter((t) => t.is_builtin === 0 && !exclude.has(t.id));
  return dailyShuffle(candidates).slice(0, count);
}

function getFeaturedAuthor(themes, exclude) {
  const byAuthor = new Map();
  for (const t of themes) {
    if (t.is_builtin === 1 || exclude.has(t.id)) continue;
    const list = byAuthor.get(t.github_owner) ?? [];
    list.push(t);
    byAuthor.set(t.github_owner, list);
  }
  const eligible = [...byAuthor.entries()]
    .filter(([, ts]) => ts.length >= 6)
    .sort(([a], [b]) => a.localeCompare(b));
  if (eligible.length === 0) return null;
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const [author, themesForAuthor] = eligible[dayOfYear % eligible.length];
  return { author, themes: themesForAuthor.sort((a, b) => b.stars - a.stars).slice(0, 6) };
}

function getOverlaysOf(themes, builtinSlug) {
  return themes.filter((t) => t.overlays_builtin === builtinSlug);
}

function getBuiltinForOverlay(themes, theme) {
  if (!theme.overlays_builtin) return null;
  return themes.find((t) => t.slug === theme.overlays_builtin && t.is_builtin === 1) ?? null;
}

// ---------- sitemap + robots ----------

function sitemapXml(themes) {
  const urls = [
    { loc: `${SITE_URL}/`, changefreq: "weekly", priority: "1.0" },
    { loc: `${SITE_URL}/themes/`, changefreq: "daily", priority: "0.9" },
    ...themes.map((t) => ({
      loc: `${SITE_URL}/themes/${t.slug}/`,
      lastmod: t.updated_at,
      changefreq: "weekly",
      priority: "0.8",
    })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url>
  <loc>${u.loc}</loc>
  ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}
  <changefreq>${u.changefreq}</changefreq>
  <priority>${u.priority}</priority>
</url>`).join("\n")}
</urlset>`;
}

const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

// ---------- tailwind ----------

function runTailwind() {
  log("running tailwindcss");
  const input = path.join(ROOT, "src/styles.css");
  const output = path.join(OUT, "styles.css");
  execSync(`npx @tailwindcss/cli -i ${input} -o ${output} --minify`, {
    cwd: ROOT,
    stdio: "inherit",
  });
}

// ---------- main ----------

function main() {
  log("clean out/");
  rmrf(OUT);
  ensureDir(OUT);

  log("read themes-data.json");
  const themes = JSON.parse(fs.readFileSync(DATA, "utf8"));
  log(`${themes.length} themes`);

  log("copy public/");
  copyRecursive(PUBLIC, OUT);

  const favicon = path.join(ROOT, "src/app/favicon.ico");
  if (fs.existsSync(favicon)) fs.copyFileSync(favicon, path.join(OUT, "favicon.ico"));

  log("render home");
  const featured = getFeaturedThemes(themes, 6);
  const featuredIds = new Set(featured.map((t) => t.id));
  const discover = getRandomThemes(themes, 6, featuredIds);
  const discoverIds = new Set([...featuredIds, ...discover.map((t) => t.id)]);
  const authorSpotlight = getFeaturedAuthor(themes, discoverIds);
  writeFile("index.html", homePage({ featured, discover, authorSpotlight }));

  log("render browse");
  const authors = [...new Set(themes.map((t) => t.github_owner))].sort((a, b) => a.localeCompare(b));
  writeFile("themes/index.html", browsePage({ themes, authors }));

  log(`render ${themes.length} theme detail pages`);
  for (const theme of themes) {
    const overlayBase = getBuiltinForOverlay(themes, theme);
    const overlayVariants = theme.is_builtin
      ? getOverlaysOf(themes, theme.slug)
      : theme.overlays_builtin
        ? getOverlaysOf(themes, theme.overlays_builtin).filter((t) => t.slug !== theme.slug)
        : [];
    writeFile(
      `themes/${theme.slug}/index.html`,
      themeDetailPage(theme, { overlayBase, overlayVariants }),
    );
  }

  log("render 404");
  writeFile("404.html", notFoundPage());

  log("write sitemap.xml + robots.txt");
  writeFile("sitemap.xml", sitemapXml(themes));
  writeFile("robots.txt", robotsTxt);

  runTailwind();

  log("done");
}

main();
