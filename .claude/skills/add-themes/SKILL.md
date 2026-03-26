---
name: add-themes
description: "Add community themes to the Omarchy theme gallery. Use this skill whenever the user provides GitHub URLs for Omarchy theme repos to add — whether via /add-themes, 'new theme: <url>', 'add this theme', or just pasting a GitHub URL that looks like an Omarchy theme repo. Also use when the user says 'check submissions', 'any new themes?', or wants to review pending theme-submission issues. Handles the full pipeline: issue triage, duplicate detection, security review, name derivation, alphabetical JSON insertion, commit, push, and issue closing."
---

# Add Themes

Add one or more community themes to the Omarchy theme gallery in a single pass.

## Modes

### Mode A: URLs provided as arguments

```
/add-themes https://github.com/user/repo1
/add-themes https://github.com/user/repo1 https://github.com/user/repo2
/add-themes https://github.com/user/repo1 "Custom Name"
```

Skip straight to the Pipeline below.

### Mode B: No arguments — triage from GitHub Issues

When invoked with no URLs (just `/add-themes`), pull pending submissions from the repo's issue tracker:

1. Run: `gh issue list --state open --label theme-submission --json number,title,body,url`
2. For each issue, extract the repo URL from the body (it's under the "GitHub Repository URL" heading)
3. Present a numbered summary table to the user:

```
# | Issue | Theme URL | Status
1 | #20 Untitled | github.com/user/repo | Ready
2 | #9  Miasma (original) | github.com/OldJobobo/... | Skip: builtin duplicate
```

For the Status column, do a quick pre-check:
- **Ready** — URL found, not already in themes.json
- **Skip: duplicate** — URL or similar name already in themes.json
- **Skip: builtin** — theme already exists in the `builtin` array
- **Skip: no URL** — couldn't extract a repo URL from the issue body
- **Skip: dead** — repo 404s

4. Ask the user which themes to add (by number, e.g. "1, 3" or "all ready ones")
5. Proceed to the Pipeline below with the selected URLs
6. After successful addition, close the processed issues with a comment: `Added to the gallery — will appear on the site after the next build.`
7. For skipped issues that are duplicates/builtins, ask the user if they want those closed too (with an appropriate comment explaining why).

## Pipeline

Run these steps for every URL being added. When adding multiple themes, parallelize the security reviews using subagents — one per theme.

### 1. Duplicate Check

Read `src/data/themes.json` once. For each URL check:

- **Exact URL match** — theme already listed (skip it, tell the user)
- **Slug collision** — another theme would produce the same slug after the name-derivation rules below
- **Similar name** — close enough to an existing name to cause confusion (e.g. "IBM" vs "IBM Dark")
- **Repo rename** — URL differs but points to what looks like a renamed version of an existing theme (same author, similar name pattern)

If any collision is found, report it and skip that theme. Never add a duplicate.

### 2. Security Review

Fetch the repo's file tree and key files from GitHub. Check for:

| Check | Pass | Flag |
|-------|------|------|
| File types | Only config files (TOML, CSS, JSON, YAML, Lua, conf, ini), images, markdown | Executables, shell scripts (.sh/.bash/.zsh), binaries, .py/.js files |
| Theme colors | `colors.toml` or `alacritty.toml` present | Neither exists — not a valid Omarchy theme |
| Code in .lua files | Only `require()`, `vim.cmd`, standard Neovim config | `os.execute`, `io.popen`, `vim.fn.system`, shell calls |
| External URLs | CSS `@import` from GitHub Pages, shields.io, etc. | Fetch calls to unknown domains, script loading |
| Hidden files | None, or standard (.gitignore, .github/) | Unexpected dotfiles or hidden directories |

**If anything is flagged:** stop and report findings before proceeding. Ask the user whether to continue.

**If clean:** summarize in one line (e.g. "22 files, all config/images, colors.toml present") and continue.

#### Trusted authors

These contributors have many clean themes in the gallery already. Still review their repos, but treat the review as a quick sanity check — only flag genuine anomalies:

- HANCORE-linux, OldJobobo, bjornramberg, atif-1402, bjarneo, tahfizhabib, RiO7MAKK3R, Grey-007, dotsilva, imbypass, hipsterusername

### 3. Derive Theme Name

If no name was provided as an argument, derive it from the GitHub repo name:

1. Take the repo name (last path segment of the URL)
2. Strip prefix: `omarchy-` or `Omarchy-`
3. Strip suffix: `-theme` or `-themes`
4. Strip leading `omarchy-` again (catches patterns like `omarchy-foo`)
5. Replace hyphens and underscores with spaces
6. Title-case each word
7. Preserve fully-uppercase words as-is (IBM, NYC, GTA, NES, C64, etc.)

Present the derived name so the user can catch mistakes, but don't block on confirmation — proceed unless something looks obviously wrong.

### 4. Insert into themes.json

Add each new theme to the `curated` array in `src/data/themes.json`:

- Entry shape: `{ "name": "<Name>", "url": "<GitHub URL>" }`
- Insert in alphabetical position by name (case-insensitive)
- Preserve existing 2-space-indent JSON formatting

### 5. Commit and Push

- Stage only `src/data/themes.json`
- Commit message:
  - Single theme: `Add <Name> theme to curated gallery`
  - Multiple themes: `Add <Name1>, <Name2>[, ...] themes to curated gallery`
- Push to `main`

No PR needed — this is a direct-to-main workflow.

### 6. Close Issues (Mode B only)

If themes came from GitHub Issues:

- For each successfully added theme, close its issue with comment: `Added to the gallery — will appear on the site after the next build.`
- For issues that were skipped as duplicates/builtins, ask the user whether to close them too (with an explanatory comment like `This theme is already available as a builtin.`)

## Known Gotchas

- **Silent slug collisions:** The scraper upserts by slug. Two themes producing the same slug means one silently overwrites the other. The dupe check in step 1 catches this.
- **Repo renames cause recurring dupes:** If a URL looks like a renamed version of an existing entry (same author, similar name), flag it. This has happened before and been fixed multiple times.
- **Dead repos:** Entries with `"dead": true` are skipped by the scraper. Don't set this flag on new additions — it's only for repos that have since 404'd.
