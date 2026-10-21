import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLiveThemes } from "./src/lib/themes.js";
import { sitemapXml, ROBOTS_TXT, PROSE_PAGES } from "./src/lib/site.js";
import { themeRecord, homeMarkdown, browseMarkdown, themeMarkdown, llmsTxt, OPENAPI, API_CATALOG } from "./src/lib/agents.js";
import { writeThemeOgImages } from "./src/lib/og.js";

function write(out, rel, body) {
  const file = path.join(out, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof body === "string" ? body : JSON.stringify(body));
}

// Markdown mirrors, the JSON API, and agent discovery files. See src/lib/agents.js.
function writeAgentFiles(out, themes) {
  const byStars = [...themes].sort((a, b) => b.stars - a.stars);
  write(out, "index.md", homeMarkdown(themes));
  write(out, "themes/index.md", browseMarkdown(themes));
  write(out, "llms.txt", llmsTxt(themes));
  write(out, "openapi.json", OPENAPI);
  write(out, ".well-known/api-catalog", API_CATALOG);
  write(out, "api/v1/themes.json", { count: themes.length, themes: byStars.map(themeRecord) });
  for (const t of themes) {
    write(out, `themes/${t.slug}/index.md`, themeMarkdown(t));
    write(out, `api/v1/themes/${t.slug}.json`, themeRecord(t));
  }
  for (const page of PROSE_PAGES) {
    const src = fs.readFileSync(new URL(`./src/pages/${page}.md`, import.meta.url), "utf8");
    write(out, `${page}/index.md`, src.replace(/^---\n[\s\S]*?\n---\n+/, ""));
  }
}

function writeSeoFiles() {
  return {
    name: "write-seo-files",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const out = fileURLToPath(dir);
        const themes = loadLiveThemes();
        fs.writeFileSync(path.join(out, "sitemap.xml"), sitemapXml(themes));
        fs.writeFileSync(path.join(out, "robots.txt"), ROBOTS_TXT);
        writeAgentFiles(out, themes);
        await writeThemeOgImages(themes, fileURLToPath(new URL("./public", import.meta.url)), out);
      },
    },
  };
}

export default defineConfig({
  site: "https://omarchytheme.com",
  trailingSlash: "always",
  outDir: "out",
  output: "static",
  compressHTML: true,
  build: {
    format: "directory",
    inlineStylesheets: "never",
  },
  integrations: [writeSeoFiles()],
  vite: {
    plugins: [tailwindcss()],
    build: {
      assetsInlineLimit: 0,
    },
  },
});
