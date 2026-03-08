CREATE TABLE IF NOT EXISTS themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  github_url TEXT NOT NULL UNIQUE,
  github_owner TEXT NOT NULL,
  github_repo TEXT NOT NULL,
  description TEXT,
  preview_url TEXT,
  colors_json TEXT,
  apps_json TEXT,
  primary_hue TEXT,
  is_builtin INTEGER DEFAULT 0,
  is_curated INTEGER DEFAULT 0,
  stars INTEGER DEFAULT 0,
  readme_text TEXT,
  default_branch TEXT DEFAULT 'main',
  github_pushed_at TEXT,
  last_scraped_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_themes_primary_hue ON themes(primary_hue);
CREATE INDEX IF NOT EXISTS idx_themes_slug ON themes(slug);
CREATE INDEX IF NOT EXISTS idx_themes_github_pushed_at ON themes(github_pushed_at);
