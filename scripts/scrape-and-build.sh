#!/usr/bin/env bash
set -euo pipefail

SCRAPER_URL="https://omarchy-theme-scraper.limehawk.workers.dev"
MAX_WAIT=600  # 10 minutes max

# ---------------------------------------------------------------------------
# 1. Deploy scraper worker (ensures code changes go live before scraping)
# ---------------------------------------------------------------------------
echo "Deploying scraper worker..."
if cd worker && npx wrangler deploy && cd ..; then
  echo "Scraper deployed."
else
  echo "Warning: scraper deploy failed — using existing deployed version."
  cd "$(git rev-parse --show-toplevel)"
fi

# ---------------------------------------------------------------------------
# 2. Count expected themes
# ---------------------------------------------------------------------------
EXPECTED=$(node -e "
const t = require('./src/data/themes.json');
let count = t.builtin.length;
for (const c of t.curated) { if (!c.dead) count++; }
console.log(count);
")
echo "Expected themes: $EXPECTED"

# ---------------------------------------------------------------------------
# 3. Validate, scrape, and dump via scraper API
# ---------------------------------------------------------------------------
if [ -z "${SCRAPER_AUTH_TOKEN:-}" ]; then
  echo "SCRAPER_AUTH_TOKEN not set — skipping scrape, using existing themes-data.json"
  if [ ! -f src/data/themes-data.json ]; then
    echo "ERROR: No themes-data.json and no SCRAPER_AUTH_TOKEN. Cannot build." >&2
    exit 1
  fi
else
  # Check for slug collisions via scraper (single source of slug logic)
  echo "Validating themes.json..."
  VALIDATE=$(curl -s -X POST "$SCRAPER_URL/validate" \
    -H "Authorization: Bearer $SCRAPER_AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d @src/data/themes.json)
  IS_OK=$(echo "$VALIDATE" | node -e "const r=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(r.ok?'yes':'no')")
  if [ "$IS_OK" = "no" ]; then
    echo "SLUG COLLISIONS FOUND:"
    echo "$VALIDATE" | node -e "const r=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));r.collisions.forEach(c=>console.error('  ' + c))"
    exit 1
  fi
  echo "No slug collisions."

  echo "Triggering scraper with local themes.json..."
  RESULT=$(curl -s -X POST "$SCRAPER_URL/run-force" \
    -H "Authorization: Bearer $SCRAPER_AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d @src/data/themes.json)
  echo "Scraper response: $RESULT"

  ENQUEUED=$(echo "$RESULT" | node -e "
    const r = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    console.log(r.enqueued || 0);
  ")

  if [ "$ENQUEUED" -gt 0 ]; then
    echo "Waiting for $ENQUEUED themes to be scraped..."
    ELAPSED=0
    DUMPED=0
    while [ $ELAPSED -lt $MAX_WAIT ]; do
      sleep 15
      ELAPSED=$((ELAPSED + 15))

      # Poll using /dump — checks exact slugs we need, not stale DB total
      curl -s -X POST "$SCRAPER_URL/dump" \
        -H "Authorization: Bearer $SCRAPER_AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d @src/data/themes.json > src/data/themes-data.json

      DUMPED=$(node -e "try{const d=require('./src/data/themes-data.json');console.log(Array.isArray(d)?d.length:0)}catch{console.log(0)}")
      echo "  $DUMPED / $EXPECTED themes available (${ELAPSED}s elapsed)"

      if [ "$DUMPED" -ge "$EXPECTED" ]; then
        echo "All themes scraped and dumped."
        break
      fi
    done

    if [ "$DUMPED" -lt "$EXPECTED" ]; then
      MISSING=$((EXPECTED - DUMPED))
      echo "Warning: $MISSING themes still missing after ${ELAPSED}s. Building with $DUMPED available."
    fi
  else
    # Nothing enqueued — just dump current data
    echo "Dumping themes from D1..."
    curl -s -X POST "$SCRAPER_URL/dump" \
      -H "Authorization: Bearer $SCRAPER_AUTH_TOKEN" \
      -H "Content-Type: application/json" \
      -d @src/data/themes.json > src/data/themes-data.json

    DUMPED=$(node -e "try{const d=require('./src/data/themes-data.json');console.log(Array.isArray(d)?d.length:0)}catch{console.log(0)}")
    echo "Dumped $DUMPED themes"
  fi
fi

# ---------------------------------------------------------------------------
# 6. Build
# ---------------------------------------------------------------------------
npm run build
