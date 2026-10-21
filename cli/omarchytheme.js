#!/usr/bin/env node
// omarchytheme: search and install Omarchy themes from omarchytheme.com.
import { spawnSync } from "node:child_process";
import { parseArgs } from "node:util";

const API = process.env.OMARCHYTHEME_API ?? "https://omarchytheme.com/api/v1";
const USAGE = `Usage:
  omarchytheme search [text] [--hue <hue>] [--limit <n>] [--json]
  omarchytheme show <slug> [--json]
  omarchytheme install <slug>

Docs: https://omarchytheme.com/docs/`;

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { hue: { type: "string" }, limit: { type: "string" }, json: { type: "boolean" }, help: { type: "boolean", short: "h" } },
});
const [command, arg] = positionals;

async function get(path) {
  const res = await fetch(`${API}${path}`);
  const body = await res.json();
  if (!res.ok) throw new Error(`${body.detail ?? res.statusText} ${body.resolution ?? ""}`.trim());
  return body;
}

const theme = (slug) => {
  if (!slug) throw new Error(`Give a theme slug.\n\n${USAGE}`);
  return get(`/themes/${encodeURIComponent(slug)}.json`);
};

const out = (data, text) => console.log(values.json ? JSON.stringify(data, null, 2) : text);

const commands = {
  async search() {
    const q = new URLSearchParams({ limit: values.limit ?? "20" });
    if (arg) q.set("q", arg);
    if (values.hue) q.set("hue", values.hue);
    const data = await get(`/themes.json?${q}`);
    out(data, data.themes.map((t) => `${t.slug.padEnd(32)} ${String(t.stars).padStart(6)}★  ${t.name} by ${t.author}`).join("\n") || "No themes match.");
  },
  async show() {
    const t = await theme(arg);
    out(t, [`${t.name} by ${t.author}`, t.description, t.page_url, "", `  ${t.install_command}`, ...t.security_warnings.map((w) => `  ! ${w}`)].filter((l) => l != null).join("\n"));
  },
  async install() {
    const t = await theme(arg);
    for (const w of t.security_warnings) console.log(`! ${w}`);
    const [cmd, ...args] = t.install_command.split(" ");
    const r = spawnSync(cmd, args, { stdio: "inherit" });
    if (r.error) throw new Error(`Could not run ${cmd}. Is this an Omarchy machine?`);
    process.exitCode = r.status ?? 1;
  },
};

if (values.help || !commands[command]) {
  console.log(USAGE);
  process.exitCode = values.help ? 0 : 1;
} else {
  commands[command]().catch((e) => {
    console.error(`omarchytheme: ${e.message}`);
    process.exitCode = 1;
  });
}
