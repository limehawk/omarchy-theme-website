import { expect, test } from "bun:test";
import { loadLiveThemes } from "../src/lib/themes.js";
import {
  fieldsFromTheme,
  scoreTerm,
  filterAndSort,
  themeToFilterCard,
} from "../src/lib/search.js";

const themes = loadLiveThemes();
const catppuccin = themes.find((t) => t.slug === "catppuccin");

test("a name query matches the theme name and misses junk", () => {
  const fields = fieldsFromTheme(catppuccin);
  expect(scoreTerm(fields, "catppuccin")).toBe(6);
  expect(scoreTerm(fields, "zzzznotatheme")).toBe(0);
});

test("a README-only hit scores lower than a name hit", () => {
  let hit = null;
  for (const theme of themes) {
    if (!theme.readme_text) continue;
    const fields = fieldsFromTheme(theme);
    const word = fields.words.readme.find((w) => {
      if (w.length < 4) return false;
      if (fields.name.includes(w) || fields.desc.includes(w)) return false;
      return scoreTerm(fields, w) === 2;
    });
    if (!word) continue;
    const nameWord = theme.name.toLowerCase().split(/[^a-z0-9]+/).find((w) => w.length >= 3);
    if (!nameWord) continue;
    hit = { fields, word, nameWord, slug: theme.slug };
    break;
  }
  expect(hit).toBeTruthy();
  expect(scoreTerm(hit.fields, hit.word)).toBe(2);
  expect(scoreTerm(hit.fields, hit.nameWord)).toBeGreaterThan(scoreTerm(hit.fields, hit.word));
});

test("filterAndSort keeps a name match and drops non-matches", () => {
  const cards = themes.map(themeToFilterCard);
  const { passing } = filterAndSort(cards, {
    q: "catppuccin",
    sort: "newest",
    source: "all",
    color: [],
    brightness: "",
    author: "",
  });
  expect(passing.some((c) => c.slug === "catppuccin")).toBe(true);
  expect(passing.length).toBeGreaterThan(0);
  expect(passing.length).toBeLessThan(cards.length);
});

test("source=builtin keeps only builtin themes", () => {
  const cards = themes.map(themeToFilterCard);
  const { passing } = filterAndSort(cards, {
    q: "",
    sort: "newest",
    source: "builtin",
    color: [],
    brightness: "",
    author: "",
  });
  expect(passing.length).toBeGreaterThan(0);
  expect(passing.every((c) => c.isBuiltin)).toBe(true);
});
