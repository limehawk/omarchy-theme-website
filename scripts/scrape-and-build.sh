#!/usr/bin/env bash
set -euo pipefail

SCRAPER_URL="https://omarchy-theme-scraper.limehawk.workers.dev"
MAX_WAIT=180  # 3 minutes max

# ---------------------------------------------------------------------------
# 1. Deploy scraper worker (ensures code changes go live before scraping)
# ---------------------------------------------------------------------------
echo "Deploying scraper worker..."
cd worker && npx wrangler deploy && cd ..

# ---------------------------------------------------------------------------
# 2. Check for slug collisions in themes.json
# ---------------------------------------------------------------------------
node -e "
const t = require('./src/data/themes.json');
const slugs = new Map();
const builtinSlugs = new Set();
let collisions = 0;
for (const b of t.builtin) {
  const slug = b.path.split('/').pop().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-+$/,'').replace(/^-+/,'');
  slugs.set(slug, 'builtin: ' + b.name);
  builtinSlugs.add(slug);
}
for (const c of t.curated) {
  if (c.dead) continue;
  const match = c.url.match(/github\.com\/([^/]+)\/([^/]+)/);
  const owner = match[1];
  const repo = match[2];
  let slug = repo.toLowerCase().replace(/^omarchy-/,'').replace(/-theme$/,'').replace(/[^a-z0-9]+/g,'-').replace(/-+$/,'').replace(/^-+/,'');
  if (builtinSlugs.has(slug)) {
    console.log('OVERLAY: ' + c.name + ' by ' + owner + ' overlays builtin ' + slug + ' -> slug: ' + slug + '-' + owner.toLowerCase());
    slug = slug + '-' + owner.toLowerCase();
  }
  if (slugs.has(slug)) {
    console.error('SLUG COLLISION: ' + slug + ' -> ' + slugs.get(slug) + ' vs curated: ' + c.name);
    collisions++;
  }
  slugs.set(slug, 'curated: ' + c.name);
}
if (collisions > 0) { console.error(collisions + ' slug collision(s) found. Fix themes.json before deploying.'); process.exit(1); }
console.log('No slug collisions detected.');
"

# ---------------------------------------------------------------------------
# 3. Count expected themes from themes.json
# ---------------------------------------------------------------------------
EXPECTED=$(node -e "
const t = require('./src/data/themes.json');
let count = t.builtin.length;
for (const c of t.curated) { if (!c.dead) count++; }
console.log(count);
")
echo "Expected themes: $EXPECTED"

# ---------------------------------------------------------------------------
# 4. Trigger scraper (force mode to ensure fresh data)
# ---------------------------------------------------------------------------
if [ -z "${SCRAPER_AUTH_TOKEN:-}" ]; then
  echo "SCRAPER_AUTH_TOKEN not set, skipping scrape — using existing D1 data"
else
  echo "Triggering scraper..."
  RESULT=$(curl -s -X POST "$SCRAPER_URL/run-force" \
    -H "Authorization: Bearer $SCRAPER_AUTH_TOKEN")
  echo "Scraper response: $RESULT"

  ENQUEUED=$(echo "$RESULT" | node -e "
    const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    console.log(r.enqueued || 0);
  ")

  if [ "$ENQUEUED" -gt 0 ]; then
    echo "Waiting for $ENQUEUED themes to be scraped..."
    ELAPSED=0
    while [ $ELAPSED -lt $MAX_WAIT ]; do
      sleep 10
      ELAPSED=$((ELAPSED + 10))

      CURRENT=$(curl -s "$SCRAPER_URL/status" \
        -H "Authorization: Bearer $SCRAPER_AUTH_TOKEN" | \
        node -e "
          const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
          console.log(r.total || 0);
        ")

      echo "  $CURRENT / $EXPECTED themes in DB (${ELAPSED}s elapsed)"

      if [ "$CURRENT" -ge "$EXPECTED" ]; then
        echo "All themes scraped."
        break
      fi
    done

    if [ "$CURRENT" -lt "$EXPECTED" ]; then
      echo "Warning: timed out waiting for scraper ($CURRENT / $EXPECTED). Building with available data."
    fi
  fi
fi

# ---------------------------------------------------------------------------
# 5. Dump D1 to JSON
# ---------------------------------------------------------------------------
bash scripts/dump-themes.sh

# ---------------------------------------------------------------------------
# 6. Build
# ---------------------------------------------------------------------------
npm run build
