import { cssHex } from "../../scripts/colors.js";
import { escapeHtml } from "./escape.js";

const COLOR_ORDER = [
  "background","foreground","accent","cursor","selection_background","selection_foreground",
  "color0","color1","color2","color3","color4","color5","color6","color7",
  "color8","color9","color10","color11","color12","color13","color14","color15",
];

export function colorPaletteLarge(colors) {
  const items = COLOR_ORDER.filter((k) => colors[k]).map((k) => {
    const hex = cssHex(colors[k]);
    const label = k.replaceAll("_", " ");
    return `<div class="flex items-center gap-3 min-w-0">
  <span class="inline-block size-[1.125rem] rounded-md border border-white/15 shrink-0" style="background-color:${escapeHtml(hex)}" title="${escapeHtml(`${label}: ${hex}`)}" aria-hidden="true"></span>
  <span class="font-mono text-xs text-foreground/80 truncate flex-1">${escapeHtml(label)}</span>
  <code class="font-mono text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded shrink-0">${escapeHtml(hex)}</code>
</div>`;
  }).join("");
  return `<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-2.5">${items}</div>`;
}
