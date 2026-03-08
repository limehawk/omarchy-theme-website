# omarchytheme.com

Theme gallery for the Omarchy Linux desktop environment.

## Stack

- **Framework**: Next.js + React 19 + TypeScript
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **Package manager**: Bun (always use `bun` / `bunx`, never npm/npx/yarn)
- **Deploy**: Cloudflare Workers via @opennextjs/cloudflare
- **Database**: Cloudflare D1 (SQLite)
- **Scraper**: Separate Cloudflare Worker in `worker/` directory

## Project Structure

- `src/app/` — Next.js App Router pages and API routes
- `src/components/` — React components (shadcn/ui in `ui/`)
- `src/lib/` — Utilities (colors, db)
- `src/data/` — Static data (themes.json registry)
- `worker/` — Scraper Worker (separate wrangler config)

## Key Patterns

- Dark mode by default (class-based via `.dark` on `<html>`)
- D1 database binding: `DB`
- Color bucketing: hex → HSL → hue bucket (red/orange/yellow/green/teal/blue/purple/pink/monochrome)
- Popularity sorted by GitHub stars
- Theme colors come from `colors.toml` or `alacritty.toml` files in theme repos

## Commands

- `bun run dev` — local dev server
- `bun run build` — production build
- `bunx opennextjs-cloudflare build` — build for Cloudflare
- Deploy main app: `CLOUDFLARE_ACCOUNT_ID=$(op read "op://Dev/omarchytheme/cloudflare-account-id") CLOUDFLARE_API_TOKEN=$(op read "op://Dev/omarchytheme/cloudflare-api-token") bunx wrangler deploy`
- Deploy scraper: `cd worker && CLOUDFLARE_ACCOUNT_ID=$(op read "op://Dev/omarchytheme/cloudflare-account-id") CLOUDFLARE_API_TOKEN=$(op read "op://Dev/omarchytheme/cloudflare-api-token") bunx wrangler deploy`

## Scraper Operations

- Cloudflare free tier: 1000 subrequests per Worker invocation — each theme needs ~5 fetches
- Scraper skips themes scraped within 12 hours (use `/run-force` to override)
- Scraper endpoints: `/run` (POST, returns JSON results), `/run-force` (POST, clears cache), `/status` (GET, diagnostics)
- `themes.json` entries with `"dead": true` are skipped by scraper (repo deleted/404)
- With 200+ themes, scraper needs multiple sequential `/run` calls to process all (subrequest limit)

## Gotchas

- shadcn/ui (base-nova style) uses `render` prop for polymorphic components, NOT `asChild`
- base-ui Select `onValueChange` signature: `(value: string | null, eventDetails: SelectRootChangeEventDetails) => void`
- Install command format: `omarchy-theme-install <github-url>.git` (hyphenated, with .git suffix)
- basecamp/omarchy uses `master` branch (not `main`) for builtin theme raw URLs
- README rendering uses `rehype-raw` + `rehype-sanitize` — raw HTML in markdown is supported
- CSP `img-src` is `https:` (any HTTPS) because community READMEs link images from imgur, shields.io, vercel, etc.
- Scraper `fetchFileContent()` must decode base64 via `Uint8Array` + `TextDecoder` (not bare `atob`) for proper UTF-8
- `next dev` cannot access D1 — `getCloudflareContext()` needs Cloudflare Workers runtime
- Scraper uses Cloudflare Queues (batch size 5) — after deploy, re-scrape may need a full queue drain cycle

## Live URLs

- Site: https://omarchytheme.com
- Scraper: https://omarchy-theme-scraper.limehawk.workers.dev
