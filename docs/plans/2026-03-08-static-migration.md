# Static Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate omarchytheme.com from Cloudflare Workers SSR to a fully static site on Cloudflare Pages — zero runtime server code, zero attack surface.

**Architecture:** Build-time script dumps all theme data from D1 to a JSON file. Next.js static export generates all pages. Browse page filters client-side on the full dataset. Deployed to Cloudflare Pages as static files.

**Tech Stack:** Next.js 16 (static export), React 19, Tailwind CSS 4, Cloudflare Pages, wrangler CLI

---

### Task 1: Build-time data dump script

**Files:**
- Create: `scripts/dump-themes.sh`

**Step 1: Write the dump script**

```bash
#!/usr/bin/env bash
set -euo pipefail

# Dump all themes from D1 to JSON for static build
QUERY="SELECT id, name, slug, github_url, github_owner, github_repo, description, preview_url, colors_json, apps_json, primary_hue, is_builtin, is_curated, stars, readme_text, default_branch, last_scraped_at, created_at, updated_at FROM themes ORDER BY stars DESC"

RAW=$(CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID}" CLOUDFLARE_API_TOKEN="${CLOUDFLARE_API_TOKEN}" bunx wrangler d1 execute omarchytheme --remote --command "$QUERY" --json 2>/dev/null)

echo "$RAW" | node -e "
const raw = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const themes = raw[0].results;
process.stdout.write(JSON.stringify(themes, null, 2));
" > src/data/themes-data.json

echo "Dumped $(echo "$RAW" | node -e "const r=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(r[0].results.length)") themes to src/data/themes-data.json"
```

**Step 2: Test the script**

Run: `CLOUDFLARE_ACCOUNT_ID=$(cat /tmp/.cf-account-id) CLOUDFLARE_API_TOKEN=$(cat /tmp/.cf-token) bash scripts/dump-themes.sh`
Expected: `Dumped 218 themes to src/data/themes-data.json` (or similar count)

**Step 3: Add themes-data.json to gitignore**

Append to `.gitignore`:
```
# Build-time generated theme data
src/data/themes-data.json
```

**Step 4: Commit**

```bash
git add scripts/dump-themes.sh .gitignore
git commit -m "Add build-time D1 data dump script"
```

---

### Task 2: Create static data layer

Replace the D1-dependent `src/lib/db.ts` with a static JSON import.

**Files:**
- Rewrite: `src/lib/db.ts`

**Step 1: Rewrite db.ts to read from JSON**

The new `db.ts` exports the same `Theme` type and provides functions that read from the dumped JSON file instead of D1. All filtering/sorting logic moves here for reuse by both build-time pages and the client-side browse component.

```typescript
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
}

export function getThemeList(): ThemeListItem[] {
  return allThemes.map(({ readme_text, default_branch, last_scraped_at, ...rest }) => rest);
}
```

**Step 2: Verify import works**

Run: `bunx tsc --noEmit` (may need themes-data.json to exist first — run dump script from Task 1)
Expected: No type errors

**Step 3: Commit**

```bash
git add src/lib/db.ts
git commit -m "Replace D1 queries with static JSON data layer"
```

---

### Task 3: Convert home page to static

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Rewrite page.tsx**

Remove `force-dynamic`, `getCloudflareContext`, D1 access. Import from static data layer:

```typescript
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getFeaturedThemes } from "@/lib/db";
import { COLOR_BUCKETS, BUCKET_COLORS } from "@/lib/colors";
import { ThemeGrid } from "@/components/theme-grid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const featured = getFeaturedThemes(6);
  // ... rest of JSX unchanged, just remove async
```

Key changes: remove `export const dynamic`, remove `async`, remove `getCloudflareContext`/D1, call `getFeaturedThemes()` directly (no db param). Update color quick-links to use `/themes?color=X` (already correct).

**Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "Convert home page to static data"
```

---

### Task 4: Convert browse page to client-side filtering

This is the biggest change. The browse page becomes a static shell that passes all themes to a client component.

**Files:**
- Rewrite: `src/app/themes/page.tsx`
- Create: `src/components/theme-browser.tsx` (client component with all filtering logic)
- Modify: `src/components/search-bar.tsx` (use callbacks instead of router.push)
- Modify: `src/components/sort-select.tsx` (use callbacks instead of router.push)
- Modify: `src/components/source-filter.tsx` (use callbacks instead of router.push)
- Modify: `src/components/color-filter.tsx` (use callbacks instead of router.push)

**Step 1: Create ThemeBrowser client component**

`src/components/theme-browser.tsx` — a `"use client"` component that receives all themes as a prop, manages filter state with URL search params, and renders the grid.

```typescript
"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { ThemeListItem } from "@/lib/db";
import { ThemeGrid } from "@/components/theme-grid";
import { SearchBar } from "@/components/search-bar";
import { SortSelect } from "@/components/sort-select";
import { SourceFilter } from "@/components/source-filter";
import { ColorFilter } from "@/components/color-filter";

interface ThemeBrowserProps {
  themes: ThemeListItem[];
}

export function ThemeBrowser({ themes }: ThemeBrowserProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const q = searchParams.get("q") ?? "";
  const sort = searchParams.get("sort") ?? "stars";
  const source = searchParams.get("source") ?? "community";
  const color = searchParams.get("color") ?? "";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`/themes${params.toString() ? `?${params}` : ""}`, { scroll: false });
  }

  const filtered = useMemo(() => {
    let result = themes;

    // Source filter
    if (source === "community") {
      result = result.filter((t) => t.is_builtin === 0);
    } else if (source === "builtin") {
      result = result.filter((t) => t.is_builtin === 1);
    }

    // Color filter
    if (color) {
      result = result.filter((t) => t.primary_hue === color);
    }

    // Search
    if (q) {
      const lower = q.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(lower) ||
          (t.description?.toLowerCase().includes(lower) ?? false)
      );
    }

    // Sort
    switch (sort) {
      case "name":
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "newest":
        result = [...result].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        break;
      case "stars":
      default:
        result = [...result].sort((a, b) => b.stars - a.stars);
        break;
    }

    return result;
  }, [themes, q, sort, source, color]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground">themes</h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {filtered.length} theme{filtered.length !== 1 ? "s" : ""} available
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchBar value={q} onChange={(v) => updateParam("q", v)} />
          </div>
          <SortSelect value={sort} onChange={(v) => updateParam("sort", v)} />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <SourceFilter value={source} onChange={(v) => updateParam("source", v)} />
          <ColorFilter value={color} onChange={(v) => updateParam("color", v)} />
        </div>
      </div>

      <ThemeGrid themes={filtered} />
    </div>
  );
}
```

**Step 2: Rewrite filter components to use callback props**

Each filter component changes from `useRouter`/`useSearchParams` to receiving `value` and `onChange` props. Example for `SearchBar`:

```typescript
"use client";

import { useCallback, useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value: externalValue, onChange }: SearchBarProps) {
  const [value, setValue] = useState(externalValue);

  useEffect(() => {
    const timeout = setTimeout(() => onChange(value), 300);
    return () => clearTimeout(timeout);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="search themes..."
        className="pl-9 font-mono text-sm"
      />
    </div>
  );
}
```

Apply similar pattern to `SortSelect`, `SourceFilter`, `ColorFilter` — replace router/searchParams with `value`/`onChange` props.

**Step 3: Rewrite themes/page.tsx as static shell**

```typescript
import type { Metadata } from "next";
import { Suspense } from "react";
import { getThemeList } from "@/lib/db";
import { ThemeBrowser } from "@/components/theme-browser";

export const metadata: Metadata = {
  title: "Browse Themes",
};

export default function ThemesPage() {
  const themes = getThemeList();

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <Suspense>
        <ThemeBrowser themes={themes} />
      </Suspense>
    </div>
  );
}
```

**Step 4: Verify build**

Run: `bun run build`
Expected: Static export succeeds

**Step 5: Commit**

```bash
git add src/app/themes/page.tsx src/components/theme-browser.tsx src/components/search-bar.tsx src/components/sort-select.tsx src/components/source-filter.tsx src/components/color-filter.tsx
git commit -m "Convert browse page to client-side filtering"
```

---

### Task 5: Convert theme detail pages to static

**Files:**
- Modify: `src/app/themes/[slug]/page.tsx`

**Step 1: Rewrite detail page**

Remove `force-dynamic`, `getCloudflareContext`, D1 access. Add `generateStaticParams`. Import from static data layer.

Key changes:
- Remove `export const dynamic = "force-dynamic"`
- Remove all `getCloudflareContext` / D1 code
- Add `generateStaticParams()` that returns all slugs
- `getThemeBySlug()` now takes just slug (no db param)
- Page function becomes non-async

```typescript
import type { Metadata } from "next";
import { notFound } from "next/navigation";
// ... other imports unchanged
import { getAllThemes, getThemeBySlug } from "@/lib/db";
import { parseColors } from "@/lib/colors";
// Remove: getCloudflareContext import

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllThemes().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const theme = getThemeBySlug(slug);
  if (!theme) return { title: "Theme Not Found" };
  return {
    title: theme.name,
    description: theme.description ?? `Preview and install the ${theme.name} color scheme for Omarchy.`,
  };
}

export default async function ThemeDetailPage({ params }: Props) {
  const { slug } = await params;
  const theme = getThemeBySlug(slug);
  if (!theme) notFound();

  const colors = parseColors(theme.colors_json);
  // ... rest of JSX unchanged
```

**Step 2: Commit**

```bash
git add src/app/themes/[slug]/page.tsx
git commit -m "Convert theme detail pages to static generation"
```

---

### Task 6: Remove /colors/[color] route and /api/themes route

**Files:**
- Delete: `src/app/colors/[color]/page.tsx`
- Delete: `src/app/api/themes/route.ts`

**Step 1: Delete the files**

Color filtering is now handled client-side on the browse page. The API route is no longer needed.

```bash
gio trash src/app/colors/[color]/page.tsx
gio trash src/app/api/themes/route.ts
# Clean up empty directories
rmdir src/app/colors/\[color\] src/app/colors src/app/api/themes src/app/api
```

**Step 2: Commit**

```bash
git add -A src/app/colors src/app/api
git commit -m "Remove /colors and /api routes — filtering is client-side"
```

---

### Task 7: Convert sitemap to static

**Files:**
- Modify: `src/app/sitemap.ts`

**Step 1: Rewrite sitemap**

```typescript
import type { MetadataRoute } from "next";
import { getAllThemes } from "@/lib/db";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://omarchytheme.com";

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/themes`, changeFrequency: "daily", priority: 0.9 },
  ];

  const themePages: MetadataRoute.Sitemap = getAllThemes().map((theme) => ({
    url: `${baseUrl}/themes/${theme.slug}`,
    lastModified: theme.updated_at,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...themePages];
}
```

Remove: `force-dynamic`, `getCloudflareContext`, D1 access, color pages from sitemap.

**Step 2: Commit**

```bash
git add src/app/sitemap.ts
git commit -m "Convert sitemap to static generation"
```

---

### Task 8: Configure Next.js for static export

**Files:**
- Modify: `next.config.ts`
- Create: `public/_headers`

**Step 1: Update next.config.ts**

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
```

Key changes:
- Add `output: "export"` for static generation
- Add `images: { unoptimized: true }` (required for static export — no image optimization server)
- Remove `remotePatterns` (not used with unoptimized)
- Remove `headers()` function (moved to `_headers` file)

**Step 2: Create Cloudflare Pages `_headers` file**

`public/_headers`:
```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'
```

**Step 3: Commit**

```bash
git add next.config.ts public/_headers
git commit -m "Configure Next.js static export and Cloudflare Pages headers"
```

---

### Task 9: Remove Workers dependencies and config

**Files:**
- Modify: `package.json`
- Delete: `wrangler.jsonc` (main app config — scraper keeps its own)

**Step 1: Remove @opennextjs/cloudflare and @cloudflare/workers-types**

```bash
bun remove @opennextjs/cloudflare @cloudflare/workers-types
```

**Step 2: Update package.json scripts**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "deploy": "bun run build && wrangler pages deploy out/ --project-name=omarchy-theme-website",
    "deploy:scraper": "cd worker && wrangler deploy",
    "start": "next start",
    "lint": "eslint",
    "dump-data": "bash scripts/dump-themes.sh"
  }
}
```

Remove `build:worker` script. Update `deploy` to use `wrangler pages deploy`.

**Step 3: Delete main app wrangler.jsonc**

```bash
gio trash wrangler.jsonc
```

**Step 4: Verify full build**

Run: `bun run build`
Expected: Static export to `out/` directory with all theme pages

**Step 5: Commit**

```bash
git add package.json bun.lock
git add -A wrangler.jsonc
git commit -m "Remove Workers dependencies, configure Pages deploy"
```

---

### Task 10: Create GitHub Actions workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

**Step 1: Write the workflow**

```yaml
name: Build and Deploy

on:
  schedule:
    # Daily at 6:30 AM UTC (30min after scraper cron)
    - cron: "30 6 * * *"
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Dump theme data from D1
        run: bash scripts/dump-themes.sh
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Build static site
        run: bun run build

      - name: Deploy to Cloudflare Pages
        run: bunx wrangler pages deploy out/ --project-name=omarchy-theme-website
        env:
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

**Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "Add GitHub Actions workflow for daily build and deploy"
```

---

### Task 11: Create Cloudflare Pages project and do first deploy

**Step 1: Create the Pages project**

```bash
CLOUDFLARE_ACCOUNT_ID=$(cat /tmp/.cf-account-id) CLOUDFLARE_API_TOKEN=$(cat /tmp/.cf-token) bunx wrangler pages project create omarchy-theme-website --production-branch main
```

**Step 2: Run full build and deploy**

```bash
CLOUDFLARE_ACCOUNT_ID=$(cat /tmp/.cf-account-id) CLOUDFLARE_API_TOKEN=$(cat /tmp/.cf-token) bash scripts/dump-themes.sh
bun run build
CLOUDFLARE_ACCOUNT_ID=$(cat /tmp/.cf-account-id) CLOUDFLARE_API_TOKEN=$(cat /tmp/.cf-token) bunx wrangler pages deploy out/ --project-name=omarchy-theme-website
```

**Step 3: Configure custom domain**

Point `omarchytheme.com` to the Pages project in Cloudflare dashboard (or via API).

**Step 4: Verify the live site**

Open https://omarchytheme.com and verify:
- Home page loads with featured themes
- Browse page filters work client-side
- Theme detail pages render correctly with README and colors
- Security headers present (check DevTools Network tab)

**Step 5: Commit**

```bash
git commit --allow-empty -m "First Cloudflare Pages deploy — static site live"
```

---

### Task 12: Update CLAUDE.md and footer

**Files:**
- Modify: `CLAUDE.md`
- Modify: `src/components/footer.tsx`

**Step 1: Update CLAUDE.md**

Update deploy section, remove Workers references, document new static architecture and build process.

**Step 2: Update footer contribution link**

Change "contribute a theme" link to point to the new GitHub Issues template URL:
```
https://github.com/limehawk/omarchy-theme-website/issues/new?template=submit-theme.yml
```

**Step 3: Commit**

```bash
git add CLAUDE.md src/components/footer.tsx
git commit -m "Update docs and footer for static Pages architecture"
```

---

### Task 13: Create GitHub repo and push

**Step 1: Create the repo**

```bash
gh repo create omarchy-theme-website --public --source=. --push
```

**Step 2: Add GitHub secrets for CI/CD**

```bash
gh secret set CLOUDFLARE_ACCOUNT_ID --body "$(op read 'op://Dev/omarchytheme/cloudflare-account-id')"
gh secret set CLOUDFLARE_API_TOKEN --body "$(op read 'op://Dev/omarchytheme/cloudflare-api-token')"
```

**Step 3: Enable branch protection on main**

```bash
gh api repos/limehawk/omarchy-theme-website/branches/main/protection -X PUT -f "required_status_checks=null" -f "enforce_admins=true" -f "required_pull_request_reviews=null" -f "restrictions=null" -F "allow_force_pushes=false" -F "allow_deletions=false"
```

**Step 4: Verify GitHub Actions can trigger manually**

```bash
gh workflow run deploy.yml
gh run list --workflow=deploy.yml --limit 1
```

**Step 5: Final commit if needed**

```bash
git add -A
git commit -m "Final setup: GitHub repo, CI/CD, branch protection"
git push
```
