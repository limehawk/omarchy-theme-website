# Queue-Based Scraper Design

## Problem

The scraper hits Cloudflare's 50 external subrequest limit per invocation. Each theme needs ~5 GitHub API calls, so only ~10 themes process per run. With 218+ themes, this requires 15+ manual `/run` calls.

## Solution

Use Cloudflare Queues (free tier, 10,000 ops/day) so the scraper's producer enqueues all themes and the consumer processes them in batches of 5, each in a separate invocation with its own subrequest budget.

## Architecture

```
POST /run (or cron)
  → enqueueThemes(): read themes.json, skip recently scraped, publish messages to Queue
  → return immediately with enqueued count

Queue consumer (same Worker):
  → receive batch of up to 5 messages
  → scrapeTheme() + upsertTheme() for each
  → ack batch on success
```

## Wrangler Config

Add queue binding to worker/wrangler.jsonc:
- Producer binding: `SCRAPE_QUEUE` → queue `omarchy-theme-scrape`
- Consumer: `max_batch_size: 5`, `max_batch_timeout: 5`

## Budget

- 218 themes x 3 ops (write/read/delete) = 654 ops/day (free tier: 10,000)
- 5 themes/batch x 5 subrequests = 25 external subrequests/invocation (limit: 50)
- ~44 consumer invocations to process all themes

## Changes

1. Create queue via wrangler CLI
2. Add queue bindings to wrangler.jsonc
3. Add `SCRAPE_QUEUE` to Env interface
4. Replace `runScraper()` with `enqueueThemes()` (produces messages)
5. Add `queue()` export handler (consumes messages, scrapes + upserts)
6. Update `/run`, `/run-force`, cron to call `enqueueThemes()`
7. `/run` returns enqueued count immediately (async processing)
8. `/status` unchanged (reads D1)

## Message Shape

```ts
{ url: string; name: string; path?: string; is_builtin: boolean; is_curated: boolean; force: boolean }
```
