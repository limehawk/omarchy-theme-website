// Checks the scrape job's output before the write job commits it.
// The scrape job decodes images from theme authors, so its output is untrusted.
// This file runs next to the write token: Node built-ins only, and it never
// decodes an image.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isAllowedPreviewUrl } from "./preview-hosts.js";
import { entrySlug, listedUrls, parseOwnerRepo, registryEntries } from "./registry.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENTRIES = ["repo-alerts.json", "scrape-404s.json", "theme-owners.json", "themes-data.json", "thumbs"];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const GITHUB_URL = /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(\/tree\/[^\s]+)?$/;
const MAX_THUMB_BYTES = 5 * 1024 * 1024;
const MAX_WIDTH = 1200;

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const repoBase = (url) => url.toLowerCase().replace(/\/$/, "").split("/").slice(0, 5).join("/");

function isPlainFile(file) {
  const stat = fs.lstatSync(file);
  return stat.isFile() && stat.nlink === 1;
}

function isWebp(file) {
  const fd = fs.openSync(file, "r");
  const head = Buffer.alloc(12);
  fs.readSync(fd, head, 0, 12, 0);
  fs.closeSync(fd);
  return head.toString("latin1", 0, 4) === "RIFF" && head.toString("latin1", 8, 12) === "WEBP";
}

async function githubRepoName(owner, repo) {
  const headers = { Accept: "application/vnd.github.v3+json", "User-Agent": "omarchy-theme-scraper" };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers, signal: AbortSignal.timeout(30_000) });
  return res.ok ? (await res.json()).full_name : null;
}

// Returns a list of problems. Empty means safe to commit.
export async function validateRefresh(dir, { root = ROOT, repoName = githubRepoName } = {}) {
  const errors = [];

  const found = fs.readdirSync(dir).sort();
  if (found.join() !== ENTRIES.join()) return [`unexpected artifact contents: ${found.join(", ")}`];
  for (const name of ENTRIES.filter((e) => e !== "thumbs")) {
    if (!isPlainFile(path.join(dir, name))) return [`${name} is not a regular file`];
  }
  if (!fs.lstatSync(path.join(dir, "thumbs")).isDirectory()) return ["thumbs is not a directory"];

  const registry = readJson(path.join(root, "src/data/themes.json"));
  const listed = listedUrls(registry);
  const entries = new Map(registryEntries(registry).map((e) => [entrySlug(e), e]));
  const previous = new Map(readJson(path.join(root, "src/data/themes-data.json")).map((r) => [r.slug, r]));

  const records = readJson(path.join(dir, "themes-data.json"));
  if (!Array.isArray(records)) return ["themes-data.json is not a list"];

  const seen = new Set();
  const expectedThumbs = new Set();
  for (const r of records) {
    const label = String(r?.slug);
    if (typeof r?.slug !== "string" || !SLUG.test(r.slug)) { errors.push(`bad slug: ${label}`); continue; }
    if (seen.has(r.slug)) errors.push(`duplicate slug: ${label}`);
    seen.add(r.slug);

    // Each record is tied to its own listing, so one theme can't carry another's install URL.
    const entry = entries.get(r.slug);
    if (!entry) { errors.push(`${label}: not a listed theme`); continue; }
    if (r.name !== entry.name) errors.push(`${label}: name does not match themes.json`);

    const m = typeof r.github_url === "string" ? r.github_url.match(GITHUB_URL) : null;
    if (!m || m[1] !== r.github_owner || m[2] !== r.github_repo) {
      errors.push(`${label}: github_url does not match its owner and repo`);
    } else {
      const known = [entry.url, previous.get(r.slug)?.github_url].filter(Boolean).map(repoBase);
      if (!known.includes(repoBase(r.github_url))) {
        // A repo that moved is the only reason for a new URL. Ask GitHub directly.
        const { owner, repo } = parseOwnerRepo(entry.url);
        const actual = await repoName(owner, repo);
        if (actual?.toLowerCase() !== `${m[1]}/${m[2]}`.toLowerCase()) {
          errors.push(`${label}: ${r.github_url} is not where the listed repo lives`);
        }
      }
    }

    if (r.preview_url !== null && !isAllowedPreviewUrl(r.preview_url)) errors.push(`${label}: preview_url host not allowed`);

    const widths = r.thumbnail_widths ?? [];
    if (!Array.isArray(widths)) { errors.push(`${label}: thumbnail_widths is not a list`); continue; }
    for (const w of widths) {
      if (!Number.isInteger(w) || w < 1 || w > MAX_WIDTH) errors.push(`${label}: bad thumbnail width`);
      else expectedThumbs.add(`${r.slug}-${w}.webp`);
    }
  }

  const thumbsDir = path.join(dir, "thumbs");
  const thumbs = new Set(fs.readdirSync(thumbsDir));
  for (const file of expectedThumbs) if (!thumbs.has(file)) errors.push(`missing thumbnail: ${file}`);
  for (const file of thumbs) {
    const full = path.join(thumbsDir, file);
    if (!expectedThumbs.has(file)) errors.push(`unexpected thumbnail: ${file}`);
    else if (!isPlainFile(full)) errors.push(`not a regular file: ${file}`);
    else if (fs.statSync(full).size > MAX_THUMB_BYTES) errors.push(`too large: ${file}`);
    else if (!isWebp(full)) errors.push(`not a WebP file: ${file}`);
  }

  const strikes = readJson(path.join(dir, "scrape-404s.json"));
  for (const [slug, count] of Object.entries(strikes)) {
    if (!SLUG.test(slug) || !Number.isInteger(count)) errors.push(`bad strike entry: ${slug}`);
  }

  // Owners may be added but never changed: that record is what catches a hijacked name.
  const ownersFile = path.join(root, "src/data/theme-owners.json");
  const before = fs.existsSync(ownersFile) ? readJson(ownersFile) : {};
  const owners = readJson(path.join(dir, "theme-owners.json"));
  for (const [url, id] of Object.entries(before)) {
    if (listed.has(url) && owners[url] !== id) errors.push(`recorded owner changed for ${url}`);
  }
  for (const [url, id] of Object.entries(owners)) {
    if (!listed.has(url) || !Number.isInteger(id)) errors.push(`bad owner entry: ${url}`);
  }

  const alerts = readJson(path.join(dir, "repo-alerts.json"));
  if (!Array.isArray(alerts)) return [...errors, "repo-alerts.json is not a list"];
  for (const a of alerts) {
    if (!listed.has(String(a?.url).toLowerCase()) || !["gone", "owner-changed"].includes(a?.reason)) {
      errors.push(`bad repo alert: ${String(a?.url)}`);
    }
  }

  return errors;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = await validateRefresh(process.argv[2]);
  for (const e of errors) console.error(`[validate] ${e}`);
  if (errors.length > 0) process.exit(1);
  console.log("[validate] refresh output is safe to commit");
}
