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
- `src/lib/` — Utilities (colors, db, turnstile, fingerprint)
- `src/data/` — Static data (themes.json registry)
- `worker/` — Scraper Worker (separate wrangler config)

## Key Patterns

- Dark mode by default (class-based via `.dark` on `<html>`)
- D1 database binding: `DB`
- Color bucketing: hex → HSL → hue bucket (red/orange/yellow/green/teal/blue/purple/pink/monochrome)
- Upvotes: Turnstile + browser fingerprint hash + IP rate limiting, no login required
- Theme colors come from `colors.toml` files in theme repos (23 color values)

## Commands

- `bun run dev` — local dev server
- `bun run build` — production build
- `bunx opennextjs-cloudflare build` — build for Cloudflare
- `bunx wrangler deploy` — deploy main app
- `cd worker && bunx wrangler deploy` — deploy scraper
