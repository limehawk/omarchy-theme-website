import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLiveThemes } from "./src/lib/themes.js";
import { sitemapXml, ROBOTS_TXT } from "./src/lib/site.js";

function writeSeoFiles() {
  return {
    name: "write-seo-files",
    hooks: {
      "astro:build:done": ({ dir }) => {
        const out = fileURLToPath(dir);
        const themes = loadLiveThemes();
        fs.writeFileSync(path.join(out, "sitemap.xml"), sitemapXml(themes));
        fs.writeFileSync(path.join(out, "robots.txt"), ROBOTS_TXT);
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
