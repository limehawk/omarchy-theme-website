import { COLOR_BUCKETS } from "@/lib/colors";
import themesData from "@/data/themes-data.json";

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
  apps_json: string | null;
  primary_hue: string | null;
  is_builtin: number;
  is_curated: number;
  stars: number;
  readme_text: string | null;
  default_branch: string;
  last_scraped_at: string | null;
  created_at: string;
  updated_at: string;
  github_pushed_at: string | null;
  overlays_builtin: string | null;
  security_warnings: string | null;
}

const allThemes = themesData as Theme[];

export function getAllThemes(): Theme[] {
  return allThemes;
}

export function getThemeBySlug(slug: string): Theme | null {
  return allThemes.find((t) => t.slug === slug) ?? null;
}

export function getFeaturedThemes(limit: number = 6): Theme[] {
  return allThemes
    .filter((t) => t.is_builtin === 0)
    .sort((a, b) => b.stars - a.stars)
    .slice(0, limit);
}

/** Seeded random themes — stable within a build, rotates each deploy */
export function getRandomThemes(count: number = 6, exclude: Set<string> = new Set()): ThemeListItem[] {
  const candidates = allThemes
    .filter((t) => t.is_builtin === 0 && !exclude.has(t.id))
    .map(({ readme_text, default_branch, last_scraped_at, ...rest }) => rest);

  // Simple seeded shuffle using build date
  const seed = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }

  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash + i) | 0;
    const j = ((hash >>> 0) % (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

/** Featured author — cycles through authors with 6+ themes, one per day */
export function getFeaturedAuthor(exclude: Set<string> = new Set()): { author: string; themes: ThemeListItem[] } | null {
  // Group community themes by author
  const byAuthor = new Map<string, ThemeListItem[]>();
  for (const t of allThemes) {
    if (t.is_builtin === 1 || exclude.has(t.id)) continue;
    const { readme_text, default_branch, last_scraped_at, ...rest } = t;
    const list = byAuthor.get(t.github_owner) ?? [];
    list.push(rest);
    byAuthor.set(t.github_owner, list);
  }

  // Filter to authors with 6+ themes
  const eligible = [...byAuthor.entries()]
    .filter(([, themes]) => themes.length >= 6)
    .sort(([a], [b]) => a.localeCompare(b)); // deterministic order

  if (eligible.length === 0) return null;

  // Day-of-year index — cycles through authors deterministically, one per day
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const index = dayOfYear % eligible.length;
  const [author, themes] = eligible[index];

  // Sort by stars descending, cap at 6
  const sorted = themes.sort((a, b) => b.stars - a.stars).slice(0, 6);
  return { author, themes: sorted };
}

/** Themes list for the browse page — excludes readme_text to keep bundle small */
export interface ThemeListItem {
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
  created_at: string;
  updated_at: string;
  github_pushed_at: string | null;
  overlays_builtin: string | null;
}

export function getThemeList(): ThemeListItem[] {
  return allThemes.map(({ readme_text, default_branch, last_scraped_at, ...rest }) => rest);
}

/** Get all community themes that overlay a given builtin */
export function getOverlaysOf(builtinSlug: string): Theme[] {
  return allThemes.filter((t) => t.overlays_builtin === builtinSlug);
}

/** Get the builtin theme that this overlay enhances */
export function getBuiltinForOverlay(theme: Theme): Theme | null {
  if (!theme.overlays_builtin) return null;
  return allThemes.find((t) => t.slug === theme.overlays_builtin && t.is_builtin === 1) ?? null;
}
