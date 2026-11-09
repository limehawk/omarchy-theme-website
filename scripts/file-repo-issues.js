// Opens an issue for each theme repo that disappeared or changed owner.
// Runs in the write job on validated alerts: Node built-ins and fixed text only.
// Theme names and URLs come from themes.json, not from the scrape job.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEAD_AFTER_404S } from "./scrape-404s.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = process.env.GITHUB_REPOSITORY || "limehawk/omarchy-theme-website";
const TOKEN = process.env.GITHUB_TOKEN;
const API = "https://api.github.com";

function github(url, opts = {}) {
  const headers = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "omarchy-theme-scraper",
    Authorization: `Bearer ${TOKEN}`,
  };
  if (opts.body) headers["Content-Type"] = "application/json";
  return fetch(url, { ...opts, headers, signal: AbortSignal.timeout(30_000) });
}

async function goneIssue(entry) {
  // Tag the author so they can weigh in, but only if the account still exists:
  // @mentioning a deleted handle notifies no one.
  const owner = entry.url.split("/")[3];
  const user = await github(`${API}/users/${owner}`);
  const authorLine = user.ok
    ? `- **Author:** @${owner}. Can you confirm whether this repo moved or was taken down?`
    : `- **Author:** \`${owner}\` (GitHub account no longer exists)`;
  return {
    title: `Dead theme repo: ${entry.name}`,
    body: `The theme **${entry.name}** returned HTTP 404 on ${DEAD_AFTER_404S} consecutive nightly scrapes.

- **URL:** ${entry.url}
- **Site:** omitted from the gallery after ${DEAD_AFTER_404S} consecutive 404s
${authorLine}
- **Action needed:** Check if the repo was renamed or moved. Update \`themes.json\` with the new URL, or mark as \`"dead": true\` if permanently gone.
`,
  };
}

function ownerChangedIssue(entry) {
  return {
    title: `Theme repo changed owner: ${entry.name}`,
    body: `The GitHub account behind **${entry.name}** is not the one recorded when it was listed. The name may have been taken over by someone else.

- **URL:** ${entry.url}
- **Site:** omitted from the gallery until this is reviewed
- **Action needed:** Review the repo. If this is a legitimate transfer, delete its row from \`src/data/theme-owners.json\`. Otherwise mark it \`"dead": true\` in \`themes.json\`.
`,
  };
}

const alerts = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
if (alerts.length === 0) process.exit(0);

const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/themes.json"), "utf8"));
const listed = [...registry.builtin, ...registry.curated];

const label = await github(`${API}/repos/${REPO}/labels/dead-theme`);
if (label.status === 404) {
  await github(`${API}/repos/${REPO}/labels`, {
    method: "POST",
    body: JSON.stringify({ name: "dead-theme", color: "B60205", description: "Theme repo is no longer accessible" }),
  });
}

const openRes = await github(`${API}/repos/${REPO}/issues?labels=dead-theme&state=open&per_page=100`);
const open = openRes.ok ? await openRes.json() : [];
const alreadyOpen = new Set(open.flatMap((i) => i.body?.match(/https:\/\/github\.com\/[^\s)]+/g) ?? []));

for (const alert of alerts) {
  const entry = listed.find((t) => t.url.toLowerCase().replace(/\/$/, "") === alert.url.toLowerCase());
  if (!entry || alreadyOpen.has(entry.url)) continue;
  const issue = alert.reason === "owner-changed" ? ownerChangedIssue(entry) : await goneIssue(entry);
  const res = await github(`${API}/repos/${REPO}/issues`, {
    method: "POST",
    body: JSON.stringify({ ...issue, labels: ["dead-theme"] }),
  });
  if (!res.ok) console.warn(`[issues] could not file issue for ${entry.name}: ${res.status}`);
}
