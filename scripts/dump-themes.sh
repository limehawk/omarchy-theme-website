#!/usr/bin/env bash
set -euo pipefail

# Dump all themes from D1 to JSON for static build
QUERY="SELECT id, name, slug, github_url, github_owner, github_repo, description, preview_url, colors_json, apps_json, primary_hue, is_builtin, is_curated, stars, readme_text, default_branch, last_scraped_at, created_at, updated_at FROM themes ORDER BY stars DESC"

RAW=$(npx wrangler d1 execute omarchytheme --remote --command "$QUERY" --json 2>/dev/null)

echo "$RAW" | node -e "
const raw = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const themes = raw[0].results;
process.stdout.write(JSON.stringify(themes, null, 2));
" > src/data/themes-data.json

echo "Dumped $(echo "$RAW" | node -e "const r=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(r[0].results.length)") themes to src/data/themes-data.json"
