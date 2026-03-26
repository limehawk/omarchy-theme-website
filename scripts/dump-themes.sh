#!/usr/bin/env bash
set -euo pipefail

# Compute valid slugs from themes.json
VALID_SLUGS=$(node -e "
const t = require('./src/data/themes.json');
const slugs = [];
const builtinSlugs = new Set();
for (const b of t.builtin) {
  const s = b.path.split('/').pop().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/-+$/,'').replace(/^-+/,'');
  slugs.push(s);
  builtinSlugs.add(s);
}
for (const c of t.curated) {
  if (c.dead) continue;
  const match = c.url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  const owner = match[1];
  const repo = match[2];
  let s = repo.toLowerCase().replace(/^omarchy-/,'').replace(/-theme$/,'').replace(/[^a-z0-9]+/g,'-').replace(/-+$/,'').replace(/^-+/,'');
  if (builtinSlugs.has(s)) {
    s = s + '-' + owner.toLowerCase();
  }
  slugs.push(s);
}
console.log(slugs.join(','));
")

# Build SQL IN clause from valid slugs
IN_CLAUSE=$(node -e "
const slugs = process.argv[1].split(',');
console.log(slugs.map(s => \"'\" + s + \"'\").join(','));
" "$VALID_SLUGS")

# Dump only themes whose slugs match themes.json
QUERY="SELECT id, name, slug, github_url, github_owner, github_repo, description, preview_url, colors_json, apps_json, primary_hue, is_builtin, is_curated, stars, readme_text, default_branch, last_scraped_at, created_at, updated_at, github_pushed_at, overlays_builtin FROM themes WHERE slug IN ($IN_CLAUSE) ORDER BY stars DESC"

RAW=$(npx wrangler d1 execute omarchytheme --remote --command "$QUERY" --json 2>/dev/null)

echo "$RAW" | node -e "
const raw = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
const themes = raw[0].results;
process.stdout.write(JSON.stringify(themes, null, 2));
" > src/data/themes-data.json

echo "Dumped $(echo "$RAW" | node -e "const r=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));console.log(r[0].results.length)") themes to src/data/themes-data.json"
