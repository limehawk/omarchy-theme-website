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
  primary_hue TEXT,
  is_builtin INTEGER DEFAULT 0,
  is_curated INTEGER DEFAULT 0,
  stars INTEGER DEFAULT 0,
  upvote_count INTEGER DEFAULT 0,
  readme_html TEXT,
  last_scraped_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS upvotes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  theme_id TEXT NOT NULL REFERENCES themes(id),
  fingerprint_hash TEXT NOT NULL,
  ip_hash TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(theme_id, fingerprint_hash)
);

CREATE INDEX IF NOT EXISTS idx_themes_primary_hue ON themes(primary_hue);
CREATE INDEX IF NOT EXISTS idx_themes_slug ON themes(slug);
CREATE INDEX IF NOT EXISTS idx_upvotes_theme_id ON upvotes(theme_id);
