# omarchytheme.com

Theme gallery for the Omarchy Linux desktop environment.

## Stack

- **Framework**: Next.js 16 + React 19 + TypeScript (static export)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Package manager**: Bun locally (`bun` / `bunx`), npm on CF Pages build
- **Deploy**: Cloudflare Pages (fully static, Git-integrated auto-builds on push)
- **Database**: Cloudflare D1 (read at build time via dump script)
- **Scraper**: Separate CF Worker, source in `worker/` (tracked in git, deployed separately)

## Project Structure

- `src/app/` — Next.js App Router pages and API routes
- `src/components/` — React components (shadcn/ui in `ui/`)
- `src/lib/` — Utilities (colors, db)
- `src/data/` — Static data (themes.json registry, themes-data.json generated at build)
- `worker/` — Scraper Worker (tracked in git, deployed separately to CF Workers)

## Data Pipeline

1. `src/data/themes.json` — source of truth for which themes exist
2. Scraper worker fetches `themes.json` from GitHub raw URL **at runtime** (no redeploy needed)
3. Scraper reads theme repos → writes to D1
4. `scripts/dump-themes.sh` reads D1 → writes `src/data/themes-data.json` (during Pages build)
5. Next.js static build uses `themes-data.json`

**Adding a theme:** update themes.json → push → done (Pages build auto-triggers scraper)

## Key Patterns

- Dark mode by default (class-based via `.dark` on `<html>`)
- Color bucketing: hex → HSL → hue bucket (red/orange/yellow/green/teal/blue/purple/pink/monochrome)
- Popularity sorted by GitHub stars
- Theme colors come from `colors.toml` or `alacritty.toml` files in theme repos
- Client-side filtering via ThemeBrowser component (`useMemo` + `useSearchParams`)
- `parseColors()` lives in `@/lib/colors` (shared by card + detail page)
- `src/lib/db.ts` reads from static JSON import, not D1

## Commands

- `bun run dev` — local dev server (data from themes-data.json)
- `bun run build` — production build
- Deploy scraper: `cd worker && CLOUDFLARE_ACCOUNT_ID=$(cat /tmp/.cf-account-id) CLOUDFLARE_API_TOKEN=$(cat /tmp/.cf-token) bunx wrangler deploy`
- Refresh local data: `SCRAPER_AUTH_TOKEN=$(cat /tmp/.scraper-token) bash scripts/scrape-and-build.sh` (also needs CF env vars for dump)

## Adding New Themes

1. Check for collisions/dupes before any changes — search themes.json for matching URLs, slugs, and similar names
2. Security review the repo (check for exec calls, scripts, suspicious files)
3. Add to `src/data/themes.json` alphabetically in `curated` array
4. Push to main
5. Pages build auto-triggers scraper, waits for completion, then builds

## Scraper Operations

- Scraper skips themes scraped within 12 hours (use `/run-force` to override)
- Scraper endpoints: `/run` (POST, returns JSON results), `/run-force` (POST, clears cache), `/status` (GET, diagnostics)
- `themes.json` entries with `"dead": true` are skipped by scraper (repo deleted/404)
- Scraper uses Cloudflare Queues (batch size 5) — after deploy, re-scrape may need a full queue drain cycle

## Gotchas

- shadcn/ui (base-nova style) uses `render` prop for polymorphic components, NOT `asChild`
- base-ui Select `onValueChange` signature: `(value: string | null, eventDetails: SelectRootChangeEventDetails) => void`
- Install command format: `omarchy-theme-install <github-url>.git` (hyphenated, with .git suffix)
- basecamp/omarchy uses `master` branch (not `main`) for builtin theme raw URLs
- README rendering uses `rehype-raw` + `rehype-sanitize` — raw HTML in markdown is supported
- CSP `img-src` is `https:` (any HTTPS) because community READMEs link images from imgur, shields.io, vercel, etc.
- Scraper `fetchFileContent()` must decode base64 via `Uint8Array` + `TextDecoder` (not bare `atob`) for proper UTF-8
- Scraper uses Cloudflare Queues (batch size 5) — after deploy, re-scrape may need a full queue drain cycle
- `worker/` is excluded from tsconfig.json — CF Workers types (D1Database, Queue) break Next.js build
- Node 25 has ESM/CJS issues with path-scurry/lru-cache — CF Pages uses Node 22 (works fine)
- Duplicate theme entries in themes.json cause silent slug collisions — scraper upserts by slug
- Talisman pre-push hook flags React `key={}`, bun.lock checksums, crypto code — update `.talismanrc` checksums
- Renovate: closing PRs without merging permanently ignores that major version — rename or check dashboard checkbox to recreate
- CF Pages build env uses npm/node, NOT bun — scripts use `npx` not `bunx`

## Live URLs

- Site: https://omarchytheme.com
- Scraper: https://omarchy-theme-scraper.limehawk.workers.dev
