import themesData from "../data/themes-data.json" with { type: "json" };
import registry from "../data/themes.json" with { type: "json" };
import strikes from "../data/scrape-404s.json" with { type: "json" };
import { isDeadBy404s } from "../../scripts/scrape-404s.js";

const POPULAR_STAR_THRESHOLD = 50;

export function normalizeGithubUrl(url) {
  return (url || "").replace(/\/$/, "").toLowerCase();
}

export function loadRegistry() {
  return registry;
}

export function loadRawThemes() {
  return themesData;
}

export function omitDeadThemes(themes, reg = registry) {
  const deadUrls = new Set(
    (reg.curated || [])
      .filter((t) => t.dead)
      .map((t) => normalizeGithubUrl(t.url)),
  );
  if (deadUrls.size === 0) return themes;
  return themes.filter((t) => !deadUrls.has(normalizeGithubUrl(t.github_url)));
}

export function omitDownThemes(themes, s = strikes) {
  return themes.filter((t) => !isDeadBy404s(s[t.slug]));
}

let liveCache;
export function loadLiveThemes() {
  if (!liveCache) {
    liveCache = omitDownThemes(omitDeadThemes(loadRawThemes()));
  }
  return liveCache;
}

export function themeStaticPaths() {
  const themes = loadLiveThemes();
  return themes.map((theme) => ({
    params: { slug: theme.slug },
    props: { theme, ...overlayContext(themes, theme) },
  }));
}

export function dailyShuffle(items, seed = new Date().toISOString().slice(0, 10)) {
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

export function getNewestThemes(themes, limit = 6) {
  return themes
    .filter((t) => t.is_builtin === 0)
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .slice(0, limit);
}

export function getFeaturedThemes(themes, limit = 6) {
  const community = themes.filter((t) => t.is_builtin === 0);
  const pool = community.filter((t) => t.stars > POPULAR_STAR_THRESHOLD);
  const selection = pool.length >= limit
    ? dailyShuffle(pool)
    : [...community].sort((a, b) => b.stars - a.stars);
  return selection.slice(0, limit);
}

export function getRandomThemes(themes, count, exclude) {
  const candidates = themes.filter((t) => t.is_builtin === 0 && !exclude.has(t.id));
  return dailyShuffle(candidates).slice(0, count);
}

export function getFeaturedAuthor(themes, exclude) {
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

export function getOverlaysOf(themes, builtinSlug) {
  return themes.filter((t) => t.overlays_builtin === builtinSlug);
}

export function getBuiltinForOverlay(themes, theme) {
  if (!theme.overlays_builtin) return null;
  return themes.find((t) => t.slug === theme.overlays_builtin && t.is_builtin === 1) ?? null;
}

export function overlayContext(themes, theme) {
  const overlayBase = getBuiltinForOverlay(themes, theme);
  const overlayVariants = theme.is_builtin
    ? getOverlaysOf(themes, theme.slug)
    : theme.overlays_builtin
      ? getOverlaysOf(themes, theme.overlays_builtin).filter((t) => t.slug !== theme.slug)
      : [];
  return { overlayBase, overlayVariants };
}

export function homeSections(themes) {
  const newest = getNewestThemes(themes, 6);
  const featured = getFeaturedThemes(themes, 6);
  const featuredIds = new Set(featured.map((t) => t.id));
  const discover = getRandomThemes(themes, 6, featuredIds);
  const discoverIds = new Set([...featuredIds, ...discover.map((t) => t.id)]);
  const authorSpotlight = getFeaturedAuthor(themes, discoverIds);
  return { newest, featured, discover, authorSpotlight };
}

export function browseThemes(themes) {
  const pushedAt = (t) => new Date(t.github_pushed_at ?? t.created_at).getTime();
  return [...themes].sort((a, b) => pushedAt(b) - pushedAt(a));
}

export function readmePathPrefix(theme) {
  if (!theme.is_builtin) return "";
  const m = theme.github_url.match(/\/tree\/[^/]+\/(.+)/);
  return m ? m[1] : "";
}
