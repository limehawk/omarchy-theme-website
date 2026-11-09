// Turns themes.json into the list of themes to scrape and names each one's slug.
// No dependencies: the publish job imports this next to the write token.

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function slugFromRepo(repoName) {
  return slugify(repoName.toLowerCase().replace(/^omarchy-/, "").replace(/-theme$/, ""));
}

export function parseOwnerRepo(url) {
  const m = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!m) throw new Error(`Invalid GitHub URL: ${url}`);
  return { owner: m[1], repo: m[2] };
}

export function entrySlug(entry) {
  const { owner, repo } = parseOwnerRepo(entry.url);
  if (entry.is_builtin && entry.path) return slugify(entry.path.split("/").pop());
  const slug = slugFromRepo(repo);
  return entry.overlays_builtin ? `${slug}-${owner.toLowerCase()}` : slug;
}

// Live entries only: a theme marked dead is not scraped.
export function registryEntries(registry) {
  const entries = [];
  const builtinSlugs = new Set();
  for (const t of registry.builtin) {
    const entry = { url: t.url.replace(/\/$/, ""), name: t.name, path: t.path, is_builtin: true, is_curated: false };
    entries.push(entry);
    builtinSlugs.add(entrySlug(entry));
  }
  for (const t of registry.curated) {
    if (t.dead) continue;
    const url = t.url.replace(/\/$/, "");
    const baseSlug = slugFromRepo(parseOwnerRepo(url).repo);
    const overlaysBuiltin = builtinSlugs.has(baseSlug) ? baseSlug : undefined;
    entries.push({ url, name: t.name, is_builtin: false, is_curated: true, overlays_builtin: overlaysBuiltin });
  }
  return entries;
}

// Every listed URL, dead ones included, lowercased with no trailing slash.
export function listedUrls(registry) {
  return new Set([...registry.builtin, ...registry.curated].map((t) => t.url.toLowerCase().replace(/\/$/, "")));
}
