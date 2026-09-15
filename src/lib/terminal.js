import { hexToRgba } from "../../scripts/colors.js";
import { escapeHtml } from "./escape.js";

const OMARCHY_LOGO = `██████████████████████████████████████████████████████
██████████████████████████████████████████████████████
████                     ████                     ████
████                     ████                     ████
████    █████████████████████         ████████    ████
████    █████████████████████         ████████    ████
████    ████                              ████    ████
████    ████                              ████    ████
████    ████                              ████    ████
████    ████                              ████    ████
████    ████                              ████    ████
████    ████                              ████    ████
████████████                              ████    ████
████████████                              ████    ████
████    ████                              ████    ████
████    ████                              ████    ████
████    ████                              ████    ████
████    ████                              ████    ████
████    ████                              ████    ████
████    ████                              ████    ████
████    ██████████████████████████████████████    ████
████    ██████████████████████████████████████    ████
████                     ████                     ████
████                     ████                     ████
█████████████████████████████     ████████████████████
█████████████████████████████     ████████████████████`;

const HW_TOP = "┌──────────────────────Hardware──────────────────────┐";
const SW_TOP = "┌──────────────────────Software──────────────────────┐";
const AU_TOP = "┌─────────────────Age / Uptime / Update───────────────┐";
const BOT = "└────────────────────────────────────────────────────┘";
const NF = (cp) => String.fromCodePoint(cp);

function fastfetchRows(colors, themeName, opts) {
  const dim = colors.color8 ?? "#666";
  const green = colors.color2 ?? "#50fa7b";
  const blue = colors.color4 ?? "#6272a4";
  const magenta = colors.color5 ?? "#ff79c6";
  const dotKeys = ["color8","color7","color6","color5","color4","color3","color2","color1"];
  const termName = opts.termName ?? "ghostty";
  const fontDisplay = opts.fontDisplay ?? "JetBrainsMono Nerd Font (9pt)";

  const row = (key, color, value) =>
    `<div><span style="color:${escapeHtml(color)}">${escapeHtml(key)}</span><span>:</span> ${value}</div>`;

  const dots = dotKeys.map((k) =>
    `<span style="color:${escapeHtml(colors[k] ?? "#888")}">●</span>`
  ).join("");

  const dimDiv = (content) => `<div style="color:${escapeHtml(dim)}">${content}</div>`;
  const spacer = `<div style="height:0.75rem"></div>`;
  return [
    dimDiv(HW_TOP),
    row(NF(0xf109) + " PC", green, "omarchy-host"),
    row("│ ├" + NF(0xf4bc), green, "x86_64 (8 cores) @ 4.00 GHz"),
    row("│ ├" + NF(0xe266), green, "Integrated Graphics"),
    row("│ ├" + NF(0xf1104), green, "1920x1080 @ 60 Hz"),
    row("│ ├" + NF(0xf02ca), green, "120 / 500 GiB (24%)"),
    row("│ ├" + NF(0xefc5), green, "8 / 16 GiB (50%)"),
    row("└ └" + NF(0xf04e1) + " ", green, "0 / 4 GiB (0%)"),
    dimDiv(BOT),
    spacer,
    dimDiv(SW_TOP),
    row(NF(0xf303) + " OS", blue, "Omarchy 3.6.0"),
    row("│ ├" + NF(0xf062c), blue, "master"),
    row("│ ├" + NF(0xf052b), blue, "stable"),
    row("│ ├" + NF(0xf013), blue, "linux-arch"),
    row("│ ├" + NF(0xf488), blue, "Hyprland (Wayland)"),
    row("│ ├" + NF(0xf489), blue, escapeHtml(termName)),
    row("│ ├" + NF(0xf03d6), blue, "1024 (pacman)"),
    row("│ ├" + NF(0xf0e0c), blue, `${escapeHtml(themeName)} ${dots}`),
    row("└ └" + NF(0xf031), blue, escapeHtml(fontDisplay)),
    dimDiv(BOT),
    spacer,
    dimDiv(AU_TOP),
    row(NF(0xf199f) + " OS Age", magenta, "0 days"),
    row(NF(0xf1ad0) + " Uptime", magenta, "2 hours, 13 mins"),
    row(NF(0xeb29) + " Update", magenta, "Today"),
    dimDiv(BOT),
  ].join("");
}

export function terminalPreviewCard({ colors, slug, themeName }) {
  const bg = colors?.background ?? "#1a1a2e";
  const fg = colors?.foreground ?? "#e0e0e0";
  const green = colors?.color2 ?? "#50fa7b";
  if (!colors) return `<div class="w-full h-full" style="background:${bg}"></div>`;

  return `<div class="w-full h-full flex flex-col overflow-hidden" style="background:${escapeHtml(bg)}">
  <div class="flex items-center gap-1.5 px-3 py-1.5 border-b border-white/5 shrink-0">
    <span class="size-1.5 rounded-full bg-red-500/70"></span>
    <span class="size-1.5 rounded-full bg-yellow-500/70"></span>
    <span class="size-1.5 rounded-full bg-green-500/70"></span>
    <span class="ml-1.5 font-mono text-[8px]" style="color:${escapeHtml(fg)};opacity:0.5">~/${escapeHtml(slug)}</span>
  </div>
  <div class="flex-1 p-3 text-[5px] leading-[1.15] whitespace-pre overflow-hidden" style="color:${escapeHtml(fg)};font-family:'JetBrains Mono','Symbols Nerd Font',monospace">
    <div class="flex gap-2 items-start">
      <pre class="text-[3.5px] leading-[1.05] whitespace-pre select-none shrink-0" style="color:${escapeHtml(green)}" aria-hidden="true">${escapeHtml(OMARCHY_LOGO)}</pre>
      <div>${fastfetchRows(colors, themeName, {})}</div>
    </div>
  </div>
</div>`;
}

export function terminalPreviewLarge({ colors, slug, themeName, termStyle }) {
  if (!colors) return "";
  const opacity = termStyle?.background_opacity ?? 1;
  const cardBg = opacity < 1 ? hexToRgba(colors.background ?? "#1a1a2e", opacity) : (colors.background ?? "#1a1a2e");
  const cardRadius = termStyle?.rounding;
  const innerPadding = termStyle?.padding;
  const termFont = termStyle?.font_family;
  const cursorStyle = termStyle?.cursor_style ?? "block";
  const fg = colors.foreground ?? "#ccc";
  const accent = colors.color2 ?? colors.accent ?? "#50fa7b";

  const termName = termStyle?.source === "ghostty.conf" ? "ghostty"
    : termStyle?.source === "kitty.conf" ? "kitty"
    : termStyle?.source === "alacritty.toml" ? "alacritty"
    : "ghostty";
  const fontDisplay = termFont ? `${termFont} (9pt)` : "JetBrainsMono Nerd Font (9pt)";

  const fontFamily = termFont
    ? `"${termFont}", "JetBrains Mono", "Fira Code", "Hack", monospace`
    : `"JetBrains Mono", "Symbols Nerd Font", monospace`;

  const innerFontFamily = `${termFont ? `"${termFont}", ` : ""}"JetBrains Mono", "Symbols Nerd Font", monospace`;

  const cardStyle = [
    `background-color:${cardBg}`,
    cardRadius !== undefined ? `border-radius:${cardRadius}px` : "",
    `font-family:${fontFamily}`,
    opacity < 1 ? "backdrop-filter:blur(8px)" : "",
  ].filter(Boolean).join(";");

  const innerStyle = [
    `color:${fg}`,
    `padding:${innerPadding !== undefined ? `${innerPadding}px` : "20px"}`,
    `font-family:${innerFontFamily}`,
  ].join(";");

  const cursorWidth = cursorStyle === "beam" ? "1px" : "8px";
  const cursorHeight = cursorStyle === "underline" ? "2px" : "16px";
  const cursorAlign = cursorStyle === "underline" ? "bottom" : "middle";

  return `<div class="overflow-hidden p-0 border border-border/40 rounded-xl" style="${escapeHtml(cardStyle)}">
  <div class="flex items-center gap-2 px-4 py-2 border-b border-white/5">
    <span class="size-2.5 rounded-full bg-red-500/70"></span>
    <span class="size-2.5 rounded-full bg-yellow-500/70"></span>
    <span class="size-2.5 rounded-full bg-green-500/70"></span>
    <span class="ml-2 font-mono text-[10px]" style="color:${escapeHtml(fg)}">~/${escapeHtml(slug)}</span>
  </div>
  <div class="text-[8px] sm:text-[9px] md:text-[10px] lg:text-[11px] leading-[1.2] overflow-hidden" style="${escapeHtml(innerStyle)}">
    <div class="flex gap-6 items-start">
      <pre class="hidden lg:block text-[9px] leading-[1.2] whitespace-pre select-none shrink-0" style="color:${escapeHtml(accent)}" aria-hidden="true">${escapeHtml(OMARCHY_LOGO)}</pre>
      <div class="whitespace-pre">${fastfetchRows(colors, themeName, { termName, fontDisplay })}</div>
    </div>
    <div class="pt-4">
      <span style="color:${escapeHtml(accent)}">user@omarchy</span><span>:</span><span style="color:${escapeHtml(colors.color4 ?? "#6272a4")}">~</span><span> $ </span>
      <span class="inline-block align-middle animate-pulse" style="background-color:${escapeHtml(colors.cursor ?? colors.accent ?? "#4a9eff")};width:${cursorWidth};height:${cursorHeight};vertical-align:${cursorAlign}"></span>
    </div>
  </div>
</div>`;
}
