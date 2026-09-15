import { expect, test } from "bun:test";
import {
  loadLiveThemes,
  loadRawThemes,
  loadRegistry,
  normalizeGithubUrl,
  omitDeadThemes,
  omitDownThemes,
  themeStaticPaths,
} from "../src/lib/themes.js";
import { DEAD_AFTER_404S, load404Strikes } from "../scripts/scrape-404s.js";

test("dead registry urls are dropped from live themes", () => {
  const raw = loadRawThemes();
  const live = omitDeadThemes(raw);
  const deadUrls = new Set(
    (loadRegistry().curated || [])
      .filter((t) => t.dead)
      .map((t) => normalizeGithubUrl(t.url)),
  );
  for (const t of live) {
    expect(deadUrls.has(normalizeGithubUrl(t.github_url))).toBe(false);
  }
  const rawDead = raw.filter((t) => deadUrls.has(normalizeGithubUrl(t.github_url)));
  expect(live.length).toBe(raw.length - rawDead.length);
});

test("3-consecutive-404 slugs are omitted from static paths", () => {
  const slugs = new Set(themeStaticPaths().map((p) => p.params.slug));
  const strikes = load404Strikes();
  for (const [slug, n] of Object.entries(strikes)) {
    if (n >= DEAD_AFTER_404S) expect(slugs.has(slug)).toBe(false);
  }
  expect(slugs.has("catppuccin")).toBe(true);
  expect(omitDownThemes(loadRawThemes()).every((t) => !strikes[t.slug] || strikes[t.slug] < DEAD_AFTER_404S)).toBe(true);
});

test("loadLiveThemes is omitDead then omitDown of the committed JSON", () => {
  const expected = omitDownThemes(omitDeadThemes(loadRawThemes()));
  const live = loadLiveThemes();
  expect(live.map((t) => t.slug)).toEqual(expected.map((t) => t.slug));
  expect(live.length).toBeGreaterThan(10);
});
