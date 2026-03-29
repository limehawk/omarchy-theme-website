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
