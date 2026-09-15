import { getThemeBrightness } from "../../scripts/colors.js";

export function searchText(theme) {
  const raw = `${theme.name} ${theme.slug} ${theme.description ?? ""} ${theme.readme_text ?? ""}`;
  const words = raw.toLowerCase().replace(/https?:\/\/\S+/g, " ").split(/[^a-z0-9]+/);
  return [...new Set(words.filter((w) => w.length > 2))].join(" ");
}

export function fieldsFromTheme(theme) {
  const name = theme.name.toLowerCase();
  const desc = (theme.description ?? "").toLowerCase();
  return {
    name,
    desc,
    words: {
      name: name.split(/[^a-z0-9]+/),
      desc: desc.split(" "),
      readme: searchText(theme).split(" "),
    },
  };
}

export function fieldsFromDataset(dataset) {
  return {
    name: dataset.name.toLowerCase(),
    desc: dataset.desc,
    words: {
      name: dataset.name.toLowerCase().split(/[^a-z0-9]+/),
      desc: dataset.desc.split(" "),
      readme: dataset.search.split(" "),
    },
  };
}

export function themeToFilterCard(theme) {
  return {
    name: theme.name,
    slug: theme.slug,
    isBuiltin: theme.is_builtin === 1,
    hue: theme.primary_hue ?? "",
    brightness: getThemeBrightness(theme.colors_json),
    author: theme.github_owner,
    stars: theme.stars,
    pushed: new Date(theme.github_pushed_at ?? theme.created_at).getTime(),
    fields: fieldsFromTheme(theme),
  };
}

export function near(word, term) {
  const d = word.length - term.length;
  if (d < -1 || d > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < word.length && j < term.length) {
    if (word[i] === term[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (d === 1) i++;
    else if (d === -1) j++;
    else if (word[i] === term[j + 1] && word[i + 1] === term[j]) { i += 2; j += 2; }
    else { i++; j++; }
  }
  return edits + (word.length - i) + (term.length - j) <= 1;
}

export function scoreTerm(fields, term) {
  const w = fields.words;
  if (fields.name.includes(term)) return 6;
  if (fields.desc.includes(term)) return 4;
  if (w.readme.some((x) => x.startsWith(term))) return 2;
  if (term.length < 4) return 0;
  if (w.name.some((x) => near(x, term))) return 5;
  if (w.desc.some((x) => near(x, term))) return 3;
  if (w.readme.some((x) => near(x, term))) return 1;
  return 0;
}

export function score(fields, terms) {
  let total = 0;
  for (const t of terms) {
    const s = scoreTerm(fields, t);
    if (!s) return 0;
    total += s;
  }
  return total;
}

export function filterAndSort(cards, state) {
  const terms = (state.q || "").toLowerCase().split(/\s+/).filter(Boolean);
  const scores = new Map();
  const named = new Set();
  const passing = cards.filter((card) => {
    if (state.source === "community" && card.isBuiltin) return false;
    if (state.source === "builtin" && !card.isBuiltin) return false;
    if (state.color?.length > 0) {
      if (!card.hue || !state.color.includes(card.hue)) return false;
    }
    if (state.brightness && card.brightness !== state.brightness) return false;
    if (state.author && !card.author.toLowerCase().includes(state.author.toLowerCase())) return false;
    if (terms.length) {
      const s = score(card.fields, terms);
      if (!s) return false;
      scores.set(card, s);
      if (terms.every((t) => scoreTerm(card.fields, t) >= 5)) named.add(card);
    }
    return true;
  });

  const order = state.sort || "newest";
  passing.sort((a, b) => {
    const byName = (named.has(b) ? 1 : 0) - (named.has(a) ? 1 : 0);
    if (byName) return byName;
    const diff = (scores.get(b) || 0) - (scores.get(a) || 0);
    if (diff) return diff;
    if (order === "name") return a.name.localeCompare(b.name);
    if (order === "newest") return (b.pushed || 0) - (a.pushed || 0);
    return (b.stars || 0) - (a.stars || 0);
  });

  return { passing, named, scores };
}
