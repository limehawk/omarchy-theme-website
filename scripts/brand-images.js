// Renders the static brand images in public/: the default link-preview card
// (og-default.png) and the iOS home-screen icon (apple-touch-icon.png).
// Output is committed; re-run with `bun scripts/brand-images.js` after
// changing the logo. Text uses whatever monospace font fontconfig resolves.
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { OG_WIDTH, OG_HEIGHT } from "../src/lib/og.js";

const PUBLIC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const BG = "#0a0a0a";
const LOGO = ["#22c55e", "#a855f7", "#3b82f6", "#f97316"];

// The header logo's four tiles, scaled to `size` and placed at (x, y).
function logoTiles(x, y, size) {
  const s = size / 32;
  const pos = [[4, 6], [18, 6], [4, 18], [18, 18]];
  return pos
    .map(([px, py], i) =>
      `<rect x="${x + px * s}" y="${y + py * s}" width="${10 * s}" height="${10 * s}" rx="${2 * s}" fill="${LOGO[i]}"/>`)
    .join("");
}

const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_WIDTH}" height="${OG_HEIGHT}">
  <rect width="100%" height="100%" fill="${BG}"/>
  <rect x="96" y="171" width="288" height="288" rx="54" fill="#ffffff" fill-opacity="0.06"/>
  ${logoTiles(96, 162, 288)}
  <g font-family="JetBrains Mono, DejaVu Sans Mono, monospace" fill="#fafafa">
    <text x="448" y="292" font-size="72" font-weight="700" letter-spacing="-2">omarchy themes</text>
    <text x="450" y="356" font-size="30" fill="#a1a1a1">browse &amp; install community</text>
    <text x="450" y="398" font-size="30" fill="#a1a1a1">themes for Omarchy</text>
    <text x="450" y="470" font-size="24" fill="#737373">omarchytheme.com</text>
  </g>
</svg>`;

// iOS rounds the corners itself, so the icon is a full-bleed square.
const touchSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">
  <rect width="100%" height="100%" fill="${BG}"/>
  ${logoTiles(14, 10, 152)}
</svg>`;

await sharp(Buffer.from(ogSvg)).png({ compressionLevel: 9 }).toFile(path.join(PUBLIC, "og-default.png"));
await sharp(Buffer.from(touchSvg)).png({ compressionLevel: 9 }).toFile(path.join(PUBLIC, "apple-touch-icon.png"));
console.log("wrote public/og-default.png and public/apple-touch-icon.png");
