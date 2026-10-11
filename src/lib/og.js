import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { SITE_URL } from "./site.js";

// Link-preview cards (Messenger, iMessage, Slack, X, ...) expect ~1.91:1.
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
export const OG_DEFAULT = `${SITE_URL}/og-default.png`;

function largestThumbWidth(theme) {
  const widths = Array.isArray(theme.thumbnail_widths) ? theme.thumbnail_widths : [];
  return widths.length > 0 ? Math.max(...widths) : null;
}

// Themes without a screenshot fall back to the site-wide default card.
export function themeOgImage(theme) {
  return largestThumbWidth(theme) ? `${SITE_URL}/og/${theme.slug}.jpg` : null;
}

// Crops each theme's largest thumbnail to a 1200x630 JPEG at out/og/{slug}.jpg.
// JPEG rather than WebP because some link unfurlers still skip WebP.
export async function writeThemeOgImages(themes, publicDir, outDir, concurrency = 8) {
  const ogDir = path.join(outDir, "og");
  fs.mkdirSync(ogDir, { recursive: true });
  const queue = themes.filter((t) => largestThumbWidth(t));
  async function worker() {
    for (let theme = queue.shift(); theme; theme = queue.shift()) {
      const src = path.join(publicDir, "thumbs", `${theme.slug}-${largestThumbWidth(theme)}.webp`);
      await sharp(src)
        .resize(OG_WIDTH, OG_HEIGHT, { fit: "cover" })
        .flatten({ background: "#0a0a0a" })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(path.join(ogDir, `${theme.slug}.jpg`));
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
}
