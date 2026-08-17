// Consecutive GitHub 404 counts for theme repos.
// A theme is omitted from the site only after DEAD_AFTER_404S strikes.
// Transient scrape errors (rate limit, 5xx) do not increment this file.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

export const STRIKES_PATH = path.join(ROOT, "src/data/scrape-404s.json");
export const DEAD_AFTER_404S = 3;

export function load404Strikes() {
  if (!fs.existsSync(STRIKES_PATH)) return {};
  try {
    const data = JSON.parse(fs.readFileSync(STRIKES_PATH, "utf8"));
    return data && typeof data === "object" && !Array.isArray(data) ? data : {};
  } catch {
    return {};
  }
}

export function save404Strikes(strikes) {
  const sorted = {};
  for (const key of Object.keys(strikes).sort()) sorted[key] = strikes[key];
  fs.writeFileSync(STRIKES_PATH, JSON.stringify(sorted, null, 2) + "\n");
}

// Cap at the threshold so nightly re-404s don't churn the file (3 → 4 → 5…).
export function bump404Strike(prev) {
  const next = (prev || 0) + 1;
  return next > DEAD_AFTER_404S ? DEAD_AFTER_404S : next;
}

export function isDeadBy404s(count) {
  return (count || 0) >= DEAD_AFTER_404S;
}
