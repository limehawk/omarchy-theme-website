# Static Migration Design

## Goal

Migrate omarchytheme.com from Cloudflare Workers (SSR via @opennextjs/cloudflare) to a fully static site on Cloudflare Pages. Zero server-side code at request time. Minimized attack surface.

## Architecture

```
Scraper Worker (unchanged) → D1 Database
                                ↓ (build time only)
                         wrangler d1 execute
                                ↓
                         themes data JSON
                                ↓
                    Next.js static export → Cloudflare Pages
```

## Build Pipeline

1. `wrangler d1 execute` dumps all themes from D1 to a JSON file
2. `next build` with `output: "export"` reads that JSON and generates static HTML
3. Deploy the `out/` directory to Cloudflare Pages via `wrangler pages deploy`

## Pages

| Route | Strategy |
|-------|----------|
| `/` (Home) | Static — top 6 by stars from build-time data |
| `/themes` (Browse) | Static shell + client-side filtering on full JSON bundle |
| `/themes/[slug]` (Detail) | Pre-rendered per theme via `generateStaticParams` |
| `/colors/[color]` | Removed — color filtering happens client-side on browse page |
| `/sitemap.xml` | Generated at build time from theme data |
| `/robots.txt` | Static file |

## Browse Page (Client-Side Filtering)

- All ~220 themes shipped as inline JSON prop or imported JSON module
- SearchBar, SortSelect, SourceFilter, ColorFilter all filter/sort client-side
- URL params updated for shareability but rendering is instant (no server round-trips)
- No pagination needed (220 items renders fine with lazy-loaded images)

## What Gets Removed

- `@opennextjs/cloudflare` dependency
- `wrangler.jsonc` for the main app (scraper keeps its own)
- `/api/themes` route
- All `getCloudflareContext()` calls
- All `export const dynamic = "force-dynamic"`
- D1 binding on the main app
- `next.config.ts` custom headers function

## What Stays

- Scraper Worker (unchanged, separate deploy)
- All UI components (ThemeCard, ColorPalette, ReadmeContent, etc.)
- shadcn/ui, Tailwind, React 19
- Security headers (via Cloudflare Pages `_headers` file)
- `src/data/themes.json` registry (used by scraper)

## Security Headers

Move from `next.config.ts` headers() to `public/_headers`:

```
/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'
```

## CI/CD (GitHub Actions)

- **Daily cron** at 6:30 AM UTC (30min after scraper's 6 AM cron)
- **Manual trigger** via `workflow_dispatch`
- Steps: dump D1 → next build → deploy to Cloudflare Pages
- Secrets stored in GitHub repo: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`

## Data Flow at Build Time

1. Build script runs `wrangler d1 execute --remote` with SELECT query
2. Pipes result to `src/data/themes-data.json`
3. Pages import this JSON at build time
4. Next.js generates static HTML for all routes
5. `out/` directory deployed to Cloudflare Pages
