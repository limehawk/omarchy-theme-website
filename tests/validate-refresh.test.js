import { afterEach, beforeEach, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { validateRefresh } from "../scripts/validate-refresh.js";

const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 ")]);
const url = "https://github.com/author/omarchy-one-theme";
let tmp, dir, root;

const record = (over = {}) => ({
  name: "One", slug: "one", github_url: url, github_owner: "author", github_repo: "omarchy-one-theme",
  preview_url: `https://raw.githubusercontent.com/author/omarchy-one-theme/main/preview.png`, thumbnail_widths: [400], ...over,
});
const put = (base, name, value) => fs.writeFileSync(path.join(base, name), JSON.stringify(value));
const noLookup = async () => null;
const check = (repoName = noLookup) => validateRefresh(dir, { root, repoName });

beforeEach(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), "refresh-"));
  dir = path.join(tmp, "out");
  root = path.join(tmp, "repo");
  fs.mkdirSync(path.join(dir, "thumbs"), { recursive: true });
  fs.mkdirSync(path.join(root, "src/data"), { recursive: true });
  put(path.join(root, "src/data"), "themes.json", { builtin: [], curated: [{ name: "One", url }] });
  put(path.join(root, "src/data"), "themes-data.json", [record()]);
  put(path.join(root, "src/data"), "theme-owners.json", { [url]: 1 });
  put(dir, "themes-data.json", [record()]);
  put(dir, "scrape-404s.json", {});
  put(dir, "theme-owners.json", { [url]: 1 });
  put(dir, "repo-alerts.json", []);
  fs.writeFileSync(path.join(dir, "thumbs/one-400.webp"), WEBP);
});
afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }));

test("a normal refresh passes", async () => {
  expect(await check()).toEqual([]);
});

test("an extra file in the artifact is refused", async () => {
  fs.writeFileSync(path.join(dir, "extra.sh"), "x");
  expect((await check())[0]).toContain("unexpected artifact contents");
});

test("a symlink in place of a data file is refused", async () => {
  fs.rmSync(path.join(dir, "repo-alerts.json"));
  fs.symlinkSync("/etc/passwd", path.join(dir, "repo-alerts.json"));
  expect((await check())[0]).toContain("not a regular file");
});

test("a thumbnail with a path-like or unknown name is refused", async () => {
  fs.writeFileSync(path.join(dir, "thumbs/two-400.webp"), WEBP);
  expect(await check()).toContain("unexpected thumbnail: two-400.webp");
});

test("a symlinked thumbnail is refused", async () => {
  fs.rmSync(path.join(dir, "thumbs/one-400.webp"));
  fs.symlinkSync("/etc/passwd", path.join(dir, "thumbs/one-400.webp"));
  expect(await check()).toContain("not a regular file: one-400.webp");
});

test("a file that isn't WebP is refused", async () => {
  fs.writeFileSync(path.join(dir, "thumbs/one-400.webp"), "<svg></svg>");
  expect(await check()).toContain("not a WebP file: one-400.webp");
});

test("an install URL pointing at an unlisted repo is refused", async () => {
  put(dir, "themes-data.json", [record({ github_url: "https://github.com/attacker/x", github_owner: "attacker", github_repo: "x" })]);
  expect((await check()).join()).toContain("is not where the listed repo lives");
});

test("a repo GitHub confirms has moved is accepted", async () => {
  put(dir, "themes-data.json", [record({ github_url: "https://github.com/renamed/x", github_owner: "renamed", github_repo: "x" })]);
  expect(await check(async () => "renamed/x")).toEqual([]);
});

test("an install URL that disagrees with its owner fields is refused", async () => {
  put(dir, "themes-data.json", [record({ github_url: "https://github.com/author/omarchy-one-theme", github_owner: "other" })]);
  expect((await check()).join()).toContain("does not match");
});

test("a preview on an author's server is refused", async () => {
  put(dir, "themes-data.json", [record({ preview_url: "https://evil.example/a.png" })]);
  expect((await check()).join()).toContain("preview_url host not allowed");
});

test("rewriting a recorded owner is refused", async () => {
  put(dir, "theme-owners.json", { [url]: 666 });
  expect((await check()).join()).toContain("recorded owner changed");
});

test("an alert for a repo that isn't listed is refused", async () => {
  put(dir, "repo-alerts.json", [{ url: "https://github.com/attacker/x", reason: "gone" }]);
  expect((await check()).join()).toContain("bad repo alert");
});
