import { beforeAll, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLiveThemes, themeStaticPaths } from "../src/lib/themes.js";
import { canonicalUrl, installCmd, pageTitle } from "../src/lib/site.js";
import { DEAD_AFTER_404S, load404Strikes } from "../scripts/scrape-404s.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "out");

function readOut(rel) {
  return readFileSync(path.join(OUT, rel), "utf8");
}

function titleOf(html) {
  const m = html.match(/<title>([^<]*)<\/title>/i);
  return m ? m[1].replace(/&amp;/g, "&") : "";
}

function canonicalOf(html) {
  const m = html.match(/<link[^>]*rel=["']canonical["'][^>]*>/i);
  if (!m) return "";
  const href = m[0].match(/href=["']([^"']+)["']/i);
  return href ? href[1] : "";
}

function descriptionOf(html) {
  const m = html.match(/<meta[^>]*name=["']description["'][^>]*>/i);
  if (!m) return "";
  const content = m[0].match(/content=["']([^"']*)["']/i);
  return content ? content[1] : "";
}

beforeAll(() => {
  const r = spawnSync("bun", ["run", "build"], {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 300000,
  });
  if (r.status !== 0) {
    throw new Error(`bun run build failed (status ${r.status}):\n${r.stdout}\n${r.stderr}`);
  }
}, 300000);

test("astro is the page compiler", () => {
  const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
  expect(pkg.scripts.build).toContain("astro");
  expect(existsSync(path.join(ROOT, "scripts/build.js"))).toBe(false);
  expect(existsSync(path.join(ROOT, "scripts/render.js"))).toBe(false);
  expect(existsSync(path.join(ROOT, "src/pages/index.astro"))).toBe(true);
  expect(existsSync(path.join(ROOT, "src/pages/themes/index.astro"))).toBe(true);
  expect(existsSync(path.join(ROOT, "src/pages/themes/[slug].astro"))).toBe(true);
  const slugPage = readFileSync(path.join(ROOT, "src/pages/themes/[slug].astro"), "utf8");
  expect(slugPage).toContain("themeStaticPaths");
});

test("omitted dead and 404 slugs have no built page", () => {
  const slugs = new Set(themeStaticPaths().map((p) => p.params.slug));
  const strikes = load404Strikes();
  for (const [slug, n] of Object.entries(strikes)) {
    if (n < DEAD_AFTER_404S) continue;
    expect(slugs.has(slug)).toBe(false);
    expect(existsSync(path.join(OUT, "themes", slug, "index.html"))).toBe(false);
  }
  expect(existsSync(path.join(OUT, "themes/blood-moon/index.html"))).toBe(false);
  expect(existsSync(path.join(OUT, "themes/gruvu/index.html"))).toBe(false);
  expect(existsSync(path.join(OUT, "themes/catppu-mocha/index.html"))).toBe(false);
});

test("live theme HTML has a distinct title, canonical, and visible name", () => {
  const live = loadLiveThemes();
  const theme = live.find((t) => t.slug === "catppuccin") ?? live[0];
  const home = readOut("index.html");
  const browse = readOut("themes/index.html");
  const detail = readOut(`themes/${theme.slug}/index.html`);

  expect(titleOf(home)).toBe(pageTitle("home"));
  expect(titleOf(browse)).toBe(pageTitle("Browse Themes"));
  expect(titleOf(detail)).toBe(pageTitle(theme.name));
  expect(titleOf(home)).not.toBe(titleOf(browse));
  expect(titleOf(detail)).not.toBe(titleOf(home));
  expect(titleOf(detail)).not.toBe(titleOf(browse));

  expect(canonicalOf(home)).toBe(canonicalUrl("/"));
  expect(canonicalOf(browse)).toBe(canonicalUrl("/themes/"));
  expect(canonicalOf(detail)).toBe(canonicalUrl(`/themes/${theme.slug}/`));

  expect(descriptionOf(home).length).toBeGreaterThan(20);
  expect(descriptionOf(browse).length).toBeGreaterThan(20);
  expect(descriptionOf(detail).length).toBeGreaterThan(10);

  expect(detail).toContain(theme.name);
  expect(detail).toContain(`/themes/${theme.slug}/`);
  expect(detail).toContain(installCmd(theme.github_url));
});

test("browse HTML contains multiple live theme names as markup", () => {
  const browse = readOut("themes/index.html");
  const live = loadLiveThemes();
  const sample = live.slice(0, 8);
  expect(sample.length).toBeGreaterThan(5);
  for (const t of sample) {
    expect(browse).toContain(t.name);
    expect(browse).toContain(`/themes/${t.slug}/`);
  }
  expect(browse).toContain('name="q"');
  expect(browse).toContain('name="author"');
  expect(browse).toContain('name="color"');
  expect(browse).toContain('data-theme-card');
});

test("sitemap and robots list the live URLs", () => {
  const sitemap = readOut("sitemap.xml");
  const robots = readOut("robots.txt");
  const live = loadLiveThemes();
  const theme = live.find((t) => t.slug === "catppuccin") ?? live[0];
  expect(robots).toContain("Sitemap: https://omarchytheme.com/sitemap.xml");
  expect(sitemap).toContain("https://omarchytheme.com/");
  expect(sitemap).toContain("https://omarchytheme.com/themes/");
  expect(sitemap).toContain(`https://omarchytheme.com/themes/${theme.slug}/`);
  expect(sitemap).not.toContain("https://omarchytheme.com/themes/blood-moon/");
});
