# Screenshot Hero Cards Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace generated terminal preview cards with screenshot hero images, add author display and app badges showing which apps each theme covers.

**Architecture:** Add `apps_json` column to D1, detect config files in scraper, update theme-card.tsx to show screenshot with generated fallback, author, and app badges.

**Tech Stack:** Next.js, Cloudflare D1, Cloudflare Workers (scraper with Queues)

---

### Task 1: Add apps_json column to D1

**Files:**
- Modify: `worker/schema.sql` (reference only, D1 doesn't use migrations)

**Step 1: Add the column via wrangler**

Run:
```bash
CLOUDFLARE_API_TOKEN=$(op read "op://Dev/omarchytheme-cloudflare-api-token/credential") \
  bunx wrangler d1 execute omarchytheme --remote \
  --command "ALTER TABLE themes ADD COLUMN apps_json TEXT"
```

Expected: Column added successfully.

**Step 2: Update schema.sql to reflect new column**

In `worker/schema.sql`, add `apps_json TEXT` after `colors_json TEXT,`:
```sql
  apps_json TEXT,
```

**Step 3: Commit**

```bash
git add worker/schema.sql
git commit -m "Add apps_json column to themes table"
```

---

### Task 2: Add app detection to scraper

**Files:**
- Modify: `worker/scraper.ts`

The scraper needs to check which config files exist in each theme repo and store them as a JSON array.

**Step 1: Add apps_json to ThemeRecord interface**

After `colors_json: string | null;`:
```typescript
  apps_json: string | null;
```

**Step 2: Add detectApps function**

After `parseAlacrittyColors`, add:

```typescript
const APP_FILE_MAP: Record<string, string> = {
  "alacritty.toml": "alacritty",
  "colors.toml": "alacritty",
  "btop.theme": "btop",
  "chromium.theme": "chromium",
  "ghostty.conf": "ghostty",
  "hyprland.conf": "hyprland",
  "hyprlock.conf": "hyprlock",
  "icons.theme": "icons",
  "kitty.conf": "kitty",
  "mako.ini": "mako",
  "neovim.lua": "neovim",
  "swayosd.css": "swayosd",
  "vscode.json": "vscode",
  "walker.css": "walker",
  "waybar.css": "waybar",
  "wofi.css": "wofi",
  "gtk-4.0.css": "gtk",
  "eza.yml": "eza",
};

async function detectApps(
  owner: string,
  repo: string,
  pathPrefix: string,
  branch: string,
  token?: string,
): Promise<string[]> {
  const apps = new Set<string>();

  // Fetch repo tree in one API call instead of checking each file
  const res = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
    token,
  );
  if (!res.ok) return [];

  const data = (await res.json()) as { tree: { path: string; type: string }[] };
  const files = new Set(data.tree.filter(e => e.type === "blob").map(e => e.path));

  for (const [filename, app] of Object.entries(APP_FILE_MAP)) {
    const fullPath = pathPrefix ? `${pathPrefix}/${filename}` : filename;
    if (files.has(fullPath)) {
      apps.add(app);
    }
  }

  // Builtin themes with colors.toml get all the auto-generated apps
  if (files.has(pathPrefix ? `${pathPrefix}/colors.toml` : "colors.toml")) {
    for (const app of ["hyprland", "hyprlock", "mako", "swayosd", "walker", "waybar", "ghostty"]) {
      apps.add(app);
    }
  }

  return [...apps].sort();
}
```

Note: This uses the git trees API (1 call) instead of checking each file individually (~18 calls), saving subrequests.

**Step 3: Call detectApps in scrapeTheme**

In `scrapeTheme`, after the README fetch and before building the record, add:

```typescript
  const apps = await detectApps(owner, repo, pathPrefix.replace(/\/$/, ""), meta.default_branch, token);
```

**Step 4: Add apps_json to the record object**

In the `record` construction, after `colors_json`:
```typescript
    apps_json: apps.length > 0 ? JSON.stringify(apps) : null,
```

**Step 5: Update upsertTheme SQL**

Add `apps_json` to the INSERT columns, VALUES placeholders, and ON CONFLICT SET clause. Add the bind parameter after `colors_json`.

**Step 6: Commit**

```bash
git add worker/scraper.ts
git commit -m "Detect themed apps per repo and store as apps_json"
```

---

### Task 3: Update Theme interface and DB queries

**Files:**
- Modify: `src/lib/db.ts`

**Step 1: Add apps_json to Theme interface**

After `colors_json: string | null;`:
```typescript
  apps_json: string | null;
```

**Step 2: Add apps_json to THEME_LIST_COLUMNS**

Include `apps_json` in the column list string.

**Step 3: Commit**

```bash
git add src/lib/db.ts
git commit -m "Add apps_json to Theme interface and list query"
```

---

### Task 4: Rewrite theme-card.tsx with screenshot hero

**Files:**
- Modify: `src/components/theme-card.tsx`

Replace the entire ThemeCard component with:

1. **Screenshot hero**: Use `preview_url` as full-bleed card image with `aspect-ratio: 16/10`, `object-fit: cover`. Subtle scale on hover.
2. **Fallback**: When no `preview_url`, render the existing `TerminalPreview` (keep it as the fallback).
3. **Card info section**: Theme name + stars (existing) + author line showing `github_owner`.
4. **App badges**: Parse `apps_json`, render as small mono badges below info.
5. **Color bar**: Keep as-is at bottom.

The screenshot uses a raw `<img>` tag (not Next.js Image) since these are external GitHub URLs and we don't need optimization for card thumbnails.

**Step 1: Implement the new card**

Key structure:
```tsx
<Card>
  {/* Hero: screenshot or terminal fallback */}
  <div className="relative aspect-[16/10] overflow-hidden">
    {theme.preview_url ? (
      <img src={theme.preview_url} alt={theme.name}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
    ) : (
      <TerminalPreview colors={colors} slug={theme.slug} />
    )}
  </div>

  {/* Info */}
  <CardContent>
    <div className="flex items-start justify-between gap-2">
      <h3 className="font-mono text-sm font-medium truncate">{theme.name}</h3>
      {stars badge}
    </div>
    <p className="font-mono text-[10px] text-muted-foreground">{theme.github_owner}</p>
  </CardContent>

  {/* App badges */}
  {apps && <div className="flex flex-wrap gap-1 px-4 pb-3">
    {apps.map(app => <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">{app}</span>)}
  </div>}

  {/* Color bar */}
  <div className="flex h-1.5">{color strips}</div>
</Card>
```

**Step 2: Commit**

```bash
git add src/components/theme-card.tsx
git commit -m "Switch theme cards to screenshot hero with app badges and author"
```

---

### Task 5: Deploy scraper, run scrape, deploy main app

**Step 1: Deploy scraper**

```bash
cd worker && CLOUDFLARE_API_TOKEN=$(op read "op://Dev/omarchytheme-cloudflare-api-token/credential") bunx wrangler deploy
```

**Step 2: Trigger scrape to populate apps_json**

```bash
curl -s -X POST -H "Authorization: Bearer $(op read 'op://Dev/omarchytheme-scraper-auth-token/credential')" \
  https://omarchy-theme-scraper.limehawk.workers.dev/run-force | jq '{enqueued,skipped,total}'
```

Wait ~45s for queue to process, then verify:
```bash
curl -s -H "Authorization: Bearer $(op read 'op://Dev/omarchytheme-scraper-auth-token/credential')" \
  https://omarchy-theme-scraper.limehawk.workers.dev/status | jq '{total, never_scraped: (.never_scraped | length)}'
```

**Step 3: Build and deploy main app**

```bash
cd /home/limehawk/dev/omarchy-theme-website
CLOUDFLARE_API_TOKEN=$(op read "op://Dev/omarchytheme-cloudflare-api-token/credential") bunx opennextjs-cloudflare build && \
CLOUDFLARE_API_TOKEN=$(op read "op://Dev/omarchytheme-cloudflare-api-token/credential") bunx wrangler deploy
```

**Step 4: Verify on live site**

Check https://omarchytheme.com/themes — cards should show screenshots with fallback terminals, author names, and app badges.

**Step 5: Commit all remaining changes**

```bash
git add -A && git commit -m "Deploy screenshot hero cards with app badges"
```
