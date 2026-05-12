import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import {
  COLOR_BUCKETS,
  BUCKET_COLORS,
  parseColors,
  getThemeBrightness,
  cssHex,
  hexToRgba,
} from "./colors.js";

// ---------- primitives ----------

export function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const attr = (v) => escapeHtml(v);
const styleAttr = (s) => `style="${escapeHtml(s)}"`;

// ---------- shell ----------

const HEAD_FONTS = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Workbench&display=swap" rel="stylesheet">
`.trim();

export function layout({ title, description, path, body, ogImage }) {
  const fullTitle = title === "home"
    ? "Omarchy Themes — Browse & Install Terminal Color Schemes"
    : `${title} | Omarchy Themes`;
  const desc = description ?? "Discover, preview, and install terminal color schemes for the Omarchy Linux desktop environment. One-command installation for curated themes.";
  const canonical = `https://omarchytheme.com${path}`;
  const og = ogImage ?? "https://omarchytheme.com/og-default.png";

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(fullTitle)}</title>
<meta name="description" content="${attr(desc)}">
<link rel="canonical" href="${attr(canonical)}">
<link rel="icon" href="/favicon.ico">
<meta property="og:type" content="website">
<meta property="og:title" content="${attr(fullTitle)}">
<meta property="og:description" content="${attr(desc)}">
<meta property="og:url" content="${attr(canonical)}">
<meta property="og:site_name" content="Omarchy Themes">
<meta property="og:image" content="${attr(og)}">
<meta name="twitter:card" content="summary_large_image">
${HEAD_FONTS}
<link rel="stylesheet" href="/styles.css">
</head>
<body class="font-sans antialiased min-h-screen flex flex-col">
${header()}
<main class="flex-1">${body}</main>
${footer()}
<script src="/app.js" defer></script>
</body>
</html>`;
}

function header() {
  return `<header class="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
  <div class="mx-auto max-w-6xl flex items-center justify-between px-6 h-14">
    <a href="/" class="flex items-center gap-2 font-mono text-sm tracking-tight text-foreground hover:text-foreground/80 transition-colors">
      <svg viewBox="0 0 32 32" class="size-5" aria-hidden="true">
        <rect width="32" height="32" rx="6" fill="currentColor" opacity="0.15"/>
        <rect x="4" y="6" width="10" height="10" rx="2" fill="#22c55e"/>
        <rect x="18" y="6" width="10" height="10" rx="2" fill="#a855f7"/>
        <rect x="4" y="18" width="10" height="10" rx="2" fill="#3b82f6"/>
        <rect x="18" y="18" width="10" height="10" rx="2" fill="#f97316"/>
      </svg>
      <span class="font-semibold">omarchy themes</span>
    </a>
    <nav class="flex items-center gap-6">
      <a href="/themes/" class="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors">browse</a>
      <a href="https://github.com/limehawk/omarchy-theme-website" target="_blank" rel="noopener noreferrer" class="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors">github</a>
    </nav>
  </div>
</header>`;
}

function footer() {
  return `<footer class="border-t border-border/50 mt-auto">
  <div class="mx-auto max-w-6xl px-6 py-8 flex flex-col gap-6">
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
      <p class="font-mono text-xs text-muted-foreground sm:flex-1">
        <a href="/" class="hover:text-foreground transition-colors">omarchy themes</a>
      </p>
      <a href="https://limehawk.io" target="_blank" rel="noopener noreferrer" class="group flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors">
        <span class="text-xs uppercase tracking-[0.3em] font-thin">A</span>
        <span class="text-2xl text-green-500 group-hover:text-green-400 transition-colors" style="font-family: 'Workbench', system-ui;">LIMEHAWK</span>
        <span class="text-xs uppercase tracking-[0.3em] font-thin">Project</span>
      </a>
      <div class="flex items-center justify-end gap-6 sm:flex-1">
        <a href="https://omarchy.org/" target="_blank" rel="noopener noreferrer" class="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors">omarchy</a>
        <a href="https://github.com/limehawk/omarchy-theme-website/issues/new?template=submit-theme.yml" target="_blank" rel="noopener noreferrer" class="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors">contribute a theme</a>
      </div>
    </div>
    <p class="text-center text-[10px] text-muted-foreground/60 leading-relaxed">
      This is an independent community site, not affiliated with or endorsed by the Omarchy project, 37signals, Hyprland, or Arch Linux. All trademarks belong to their respective owners.
    </p>
  </div>
</footer>`;
}

// ---------- terminal preview ----------

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
  // Small preview used inside theme cards.
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
  <div class="text-[11px] leading-[1.2] overflow-hidden" style="${escapeHtml(innerStyle)}">
    <div class="flex gap-6 items-start">
      <pre class="text-[9px] leading-[1.2] whitespace-pre select-none shrink-0" style="color:${escapeHtml(accent)}" aria-hidden="true">${escapeHtml(OMARCHY_LOGO)}</pre>
      <div class="whitespace-pre">${fastfetchRows(colors, themeName, { termName, fontDisplay })}</div>
    </div>
    <div class="pt-4">
      <span style="color:${escapeHtml(accent)}">user@omarchy</span><span>:</span><span style="color:${escapeHtml(colors.color4 ?? "#6272a4")}">~</span><span> $ </span>
      <span class="inline-block align-middle animate-pulse" style="background-color:${escapeHtml(colors.cursor ?? colors.accent ?? "#4a9eff")};width:${cursorWidth};height:${cursorHeight};vertical-align:${cursorAlign}"></span>
    </div>
  </div>
</div>`;
}

// ---------- color palette ----------

const COLOR_ORDER = [
  "background","foreground","accent","cursor","selection_background","selection_foreground",
  "color0","color1","color2","color3","color4","color5","color6","color7",
  "color8","color9","color10","color11","color12","color13","color14","color15",
];

export function colorPaletteLarge(colors) {
  const items = COLOR_ORDER.filter((k) => colors[k]).map((k) => {
    const hex = colors[k];
    return `<div class="flex items-center gap-2.5">
  <div class="rounded-sm border border-white/10 shrink-0 size-6" style="background-color:${escapeHtml(cssHex(hex))}" title="${attr(`${k}: ${hex}`)}"></div>
  <div class="min-w-0">
    <p class="font-mono text-xs text-muted-foreground truncate">${escapeHtml(k.replace("_", " "))}</p>
    <p class="font-mono text-[10px] text-muted-foreground/50">${escapeHtml(hex)}</p>
  </div>
</div>`;
  }).join("");
  return `<div class="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">${items}</div>`;
}

// ---------- theme card ----------

export function themeCard(theme) {
  const colors = parseColors(theme.colors_json);
  const accent = colors?.accent ?? "#4a9eff";
  const brightness = getThemeBrightness(theme.colors_json);
  const pushed = new Date(theme.github_pushed_at ?? theme.created_at).getTime();
  const colorBar = colors
    ? `<div class="flex h-1.5 overflow-hidden">${
        [...Array(16)].map((_, i) => {
          const hex = colors[`color${i}`];
          return hex ? `<div class="flex-1" style="background-color:${escapeHtml(hex)}"></div>` : "";
        }).join("")
      }</div>`
    : "";

  const hero = theme.preview_url
    ? `<div class="hero-screenshot relative aspect-[16/10] overflow-hidden"><img src="${attr(theme.preview_url)}" alt="${attr(theme.name)}" loading="lazy" class="w-full h-full object-cover"></div>
       <div class="hero-terminal relative aspect-[16/10] overflow-hidden">${terminalPreviewCard({ colors, slug: theme.slug, themeName: theme.name })}</div>`
    : `<div class="relative aspect-[16/10] overflow-hidden">${terminalPreviewCard({ colors, slug: theme.slug, themeName: theme.name })}</div>`;

  const stars = theme.stars > 0
    ? `<span class="badge font-mono text-xs gap-1 shrink-0 inline-flex items-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15 8.5 22 9.3 17 14 18 21 12 17.8 6 21 7 14 2 9.3 9 8.5 12 2"/></svg>${theme.stars}</span>`
    : "";

  const overlayNote = theme.overlays_builtin
    ? `<span class="font-mono text-[10px] text-muted-foreground">enhances ${escapeHtml(theme.overlays_builtin)}</span>`
    : "";

  return `<a data-theme-card
  data-name="${attr(theme.name)}"
  data-author="${attr(theme.github_owner)}"
  data-hue="${attr(theme.primary_hue ?? "")}"
  data-brightness="${attr(brightness)}"
  data-stars="${attr(theme.stars)}"
  data-pushed="${attr(pushed)}"
  data-builtin="${attr(theme.is_builtin)}"
  href="/themes/${attr(theme.slug)}/"
  class="theme-card group flex flex-col rounded-xl border border-border/40 bg-card overflow-hidden hover:border-[var(--card-accent)] transition-colors"
  style="--card-accent:${escapeHtml(accent)}">
  ${hero}
  <div class="p-3 space-y-1 grow">
    <div class="flex items-start justify-between gap-2">
      <h3 class="font-mono text-sm font-medium text-foreground truncate">${escapeHtml(theme.name)}</h3>
      ${stars}
    </div>
    <span class="font-mono text-[10px] text-muted-foreground truncate block">${escapeHtml(theme.github_owner)}</span>
    ${overlayNote}
  </div>
  ${colorBar}
</a>`;
}

export function themeGrid(themes, { forceTerminal } = {}) {
  if (themes.length === 0) {
    return `<div class="py-20 text-center"><p class="font-mono text-sm text-muted-foreground">no themes found</p></div>`;
  }
  const cls = forceTerminal ? "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 view-terminal" : "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3";
  return `<div ${forceTerminal ? "" : `data-theme-grid`} class="${cls}">${themes.map(themeCard).join("")}</div>`;
}

// ---------- install command ----------

export function installCommand(githubUrl) {
  const gitUrl = githubUrl.endsWith(".git") ? githubUrl : `${githubUrl}.git`;
  const cmd = `omarchy-theme-install ${gitUrl}`;
  return `<div data-install-command="${attr(cmd)}" class="bg-black/40 p-4 font-mono text-sm cursor-pointer hover:bg-black/55 hover:border-white/15 transition-all rounded-xl border border-border/40">
  <div class="flex items-start gap-3">
    <div class="flex-1 min-w-0">
      <div><span class="text-green-400/60 select-none mr-2">$</span><span class="text-foreground/90 font-medium">omarchy-theme-install</span></div>
      <div class="text-muted-foreground text-xs pl-5 mt-1 break-all">${escapeHtml(gitUrl)}</div>
    </div>
    <button data-install-copy type="button" aria-label="Copy install command" class="size-7 inline-flex items-center justify-center rounded hover:bg-white/5 text-muted-foreground hover:text-foreground transition-colors">
      <span data-install-icon><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg></span>
    </button>
  </div>
</div>`;
}

// ---------- README markdown ----------

function resolveReadmeUrl(src, owner, repo, branch, pathPrefix) {
  if (!src) return src;
  if (/^(https?:)?\/\//.test(src) || src.startsWith("data:")) {
    let url = src.replace(
      /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(blob|raw)\/(.+)/,
      "https://raw.githubusercontent.com/$1/$2/$4",
    );
    const re = new RegExp(`^https://raw\\.githubusercontent\\.com/${owner}/${repo}/([^/]+)/(.+)$`);
    const m = url.match(re);
    if (m && m[1] !== branch) {
      url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${m[2]}`;
    }
    return url;
  }
  const clean = src.replace(/^\.\//, "");
  const fullPath = pathPrefix ? `${pathPrefix}/${clean}` : clean;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${fullPath}`;
}

const SANITIZE_OPTS = {
  allowedTags: [
    "h1","h2","h3","h4","h5","h6",
    "p","br","hr","ul","ol","li","blockquote","pre","code",
    "strong","em","del","a","img",
    "table","thead","tbody","tr","th","td",
    "kbd","sub","sup","details","summary","span","div",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    code: ["class"],
    pre: ["class"],
    span: ["class"],
    div: ["class"],
    th: ["align"],
    td: ["align"],
  },
  allowedSchemes: ["http", "https", "mailto", "data"],
  transformTags: {
    a: (tag, attrs) => ({
      tagName: "a",
      attribs: { ...attrs, target: "_blank", rel: "noopener noreferrer" },
    }),
  },
};

export function renderReadme(content, owner, repo, branch, pathPrefix = "") {
  const renderer = new marked.Renderer();
  renderer.image = function ({ href, title, text }) {
    const resolved = resolveReadmeUrl(href, owner, repo, branch, pathPrefix);
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
    return `<img src="${attr(resolved)}" alt="${attr(text)}" loading="lazy" class="rounded-lg max-w-full h-auto my-2"${titleAttr}>`;
  };
  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const cls = {
      1: "font-mono text-lg font-semibold text-foreground",
      2: "font-mono text-base font-semibold text-foreground border-b border-border/40 pb-2",
      3: "font-mono text-sm font-semibold text-foreground",
    }[depth] ?? "font-mono text-sm font-semibold text-foreground";
    return `<h${depth} class="${cls}">${text}</h${depth}>`;
  };
  renderer.code = function ({ text, lang }) {
    return `<pre class="bg-muted/30 rounded-lg p-4 overflow-x-auto max-h-50 text-xs subpixel-antialiased"><code class="block whitespace-pre${lang ? ` language-${escapeHtml(lang)}` : ""}">${escapeHtml(text)}</code></pre>`;
  };
  renderer.codespan = function ({ text }) {
    return `<code class="bg-muted/50 px-1.5 py-0.5 rounded font-mono text-xs">${text}</code>`;
  };
  renderer.blockquote = function ({ tokens }) {
    return `<blockquote class="border-l-2 border-border/60 pl-4 italic text-muted-foreground/80">${this.parser.parse(tokens)}</blockquote>`;
  };
  renderer.table = function ({ header, rows }) {
    const headHtml = header.map((cell) => `<th class="border border-border/40 px-3 py-1.5 text-left text-foreground font-medium bg-muted/30">${this.parser.parseInline(cell.tokens)}</th>`).join("");
    const bodyHtml = rows.map((row) => `<tr>${row.map((cell) => `<td class="border border-border/40 px-3 py-1.5">${this.parser.parseInline(cell.tokens)}</td>`).join("")}</tr>`).join("");
    return `<div class="overflow-x-auto"><table class="w-full text-xs font-mono border-collapse"><thead><tr>${headHtml}</tr></thead><tbody>${bodyHtml}</tbody></table></div>`;
  };

  const rawHtml = marked.parse(content, { renderer, gfm: true, breaks: false });

  const sanitized = sanitizeHtml(rawHtml, {
    ...SANITIZE_OPTS,
    transformTags: {
      ...SANITIZE_OPTS.transformTags,
      img: (tag, attrs) => ({
        tagName: "img",
        attribs: {
          ...attrs,
          src: resolveReadmeUrl(attrs.src, owner, repo, branch, pathPrefix),
          loading: "lazy",
        },
      }),
    },
  });

  return `<div class="space-y-4 text-sm text-muted-foreground leading-relaxed break-words">${sanitized}</div>`;
}

// ---------- pages ----------

export function homePage({ featured, discover, authorSpotlight }) {
  const heroButtons = `<div class="flex flex-wrap items-center gap-3 pt-2">
    <a href="/themes/" class="btn-primary inline-flex items-center gap-2 font-mono px-3 h-8 rounded-md">browse themes <span aria-hidden="true">→</span></a>
    <a href="https://omarchy.org/" target="_blank" rel="noopener noreferrer" class="btn-outline inline-flex items-center gap-2 font-mono px-3 h-8 rounded-md">get omarchy</a>
    <a href="https://github.com/limehawk/omarchy-theme-website/issues/new?template=submit-theme.yml" target="_blank" rel="noopener noreferrer" class="btn-outline inline-flex items-center gap-2 font-mono px-3 h-8 rounded-md">contribute a theme</a>
  </div>`;

  const section = (title, themes, viewAll) => themes.length === 0 ? "" : `<section class="pb-20">
    <div class="flex items-center justify-between mb-6">
      <h2 class="font-mono text-xs text-muted-foreground uppercase tracking-wider">${title}</h2>
      <a href="${viewAll}" class="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors">view all →</a>
    </div>
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">${themes.map(themeCard).join("")}</div>
  </section>`;

  const authorSection = authorSpotlight ? `<section class="pb-20">
    <div class="flex items-center justify-between mb-6">
      <h2 class="font-mono text-xs text-muted-foreground uppercase tracking-wider">
        author spotlight — <a href="/themes/?author=${encodeURIComponent(authorSpotlight.author)}" class="text-foreground hover:underline underline-offset-4">${escapeHtml(authorSpotlight.author)}</a>
      </h2>
      <a href="/themes/?author=${encodeURIComponent(authorSpotlight.author)}" class="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors">view all →</a>
    </div>
    <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">${authorSpotlight.themes.map(themeCard).join("")}</div>
  </section>` : "";

  const body = `<div class="mx-auto max-w-6xl px-6">
  <section class="py-20 sm:py-28">
    <div class="max-w-2xl space-y-6">
      <h1 class="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-foreground">discover omarchy themes</h1>
      <p class="text-base sm:text-lg text-muted-foreground leading-relaxed">
        Browse and install terminal color schemes for
        <a href="https://omarchy.org/" target="_blank" rel="noopener noreferrer" class="text-foreground underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground/60 transition-colors">Omarchy</a>,
        the opinionated Linux desktop environment from Basecamp.
        One command to transform your terminal.
      </p>
      ${heroButtons}
    </div>
  </section>
  ${section("popular themes", featured, "/themes/")}
  ${section("discover", discover, "/themes/")}
  ${authorSection}
  <section class="pb-20 text-center">
    <a href="/themes/" class="btn-primary inline-flex items-center gap-2 font-mono px-3 h-8 rounded-md">browse all themes <span aria-hidden="true">→</span></a>
  </section>
</div>`;

  return layout({ title: "home", path: "/", body });
}

export function browsePage({ themes, authors }) {
  const colorButtons = COLOR_BUCKETS.map((bucket) =>
    `<button type="button" name="color" value="${bucket}" title="${bucket}" class="color-dot size-4 rounded-sm shrink-0 transition-all" style="background-color:${BUCKET_COLORS[bucket]}"></button>`
  ).join("");

  const filterPill = (name, value, label) =>
    `<button type="button" name="${name}" value="${value}" class="pill">${escapeHtml(label)}</button>`;

  const body = `<div class="mx-auto max-w-6xl px-6 py-10 space-y-8">
  <div>
    <h1 class="font-mono text-2xl font-bold tracking-tight text-foreground">themes</h1>
    <p class="mt-1 font-mono text-sm text-muted-foreground" data-theme-count>${themes.length} theme${themes.length !== 1 ? "s" : ""} available</p>
  </div>

  <div class="sticky top-14 z-30 -mx-6 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border/40 space-y-4">
    <div class="flex flex-col sm:flex-row gap-3">
      <div class="flex-1">
        <input type="search" name="q" placeholder="find a theme..." autocomplete="off" class="w-full font-mono text-sm px-3 h-9 rounded-md border border-border/60 bg-input/40 focus:outline-none focus:ring-1 focus:ring-ring">
      </div>
      <input type="search" name="author" placeholder="find an author..." autocomplete="off" class="w-48 font-mono text-sm px-3 h-9 rounded-md border border-border/60 bg-input/40 focus:outline-none focus:ring-1 focus:ring-ring">
    </div>

    <div class="flex flex-wrap items-start gap-x-6 gap-y-3">
      <div class="space-y-1.5">
        <span class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">source</span>
        <div class="flex flex-wrap items-center gap-2">
          ${filterPill("source", "all", "all")}
          ${filterPill("source", "community", "community")}
          ${filterPill("source", "builtin", "builtin")}
        </div>
      </div>
      <div class="space-y-1.5">
        <span class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">brightness</span>
        <div class="flex flex-wrap items-center gap-2">
          ${filterPill("brightness", "", "all")}
          ${filterPill("brightness", "dark", "dark")}
          ${filterPill("brightness", "light", "light")}
        </div>
      </div>
      <div class="space-y-1.5">
        <span class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">view</span>
        <div class="flex flex-wrap items-center gap-2">
          ${filterPill("view", "", "screenshots")}
          ${filterPill("view", "terminal", "terminal")}
        </div>
      </div>
      <div class="space-y-1.5">
        <span class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">sort</span>
        <div class="flex flex-wrap items-center gap-2">
          ${filterPill("sort", "stars", "stars")}
          ${filterPill("sort", "name", "name")}
          ${filterPill("sort", "newest", "newest")}
        </div>
      </div>
    </div>

    <div class="space-y-1.5">
      <span class="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">color</span>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" data-color-all class="pill">all</button>
        ${colorButtons}
      </div>
    </div>
  </div>

  <div data-theme-grid class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
    ${themes.map(themeCard).join("")}
  </div>
  <div data-theme-empty hidden class="py-20 text-center">
    <p class="font-mono text-sm text-muted-foreground">no themes found</p>
  </div>
</div>`;

  return layout({
    title: "Browse Themes",
    description: "Browse all Omarchy themes — community and builtin terminal color schemes.",
    path: "/themes/",
    body,
  });
}

export function themeDetailPage(theme, { overlayBase, overlayVariants }) {
  const colors = parseColors(theme.colors_json);
  const apps = theme.apps_json ? JSON.parse(theme.apps_json) : [];
  const termStyle = theme.terminal_style_json ? JSON.parse(theme.terminal_style_json) : null;

  const branch = theme.default_branch ?? "main";
  let pathPrefix = "";
  if (theme.is_builtin) {
    const m = theme.github_url.match(/\/tree\/[^/]+\/(.+)/);
    if (m) pathPrefix = m[1];
  }

  const paletteSection = colors ? `<div class="space-y-3">
    <h2 class="font-mono text-xs text-muted-foreground uppercase tracking-wider">color palette</h2>
    <div class="border border-border/40 rounded-xl bg-card p-6">${colorPaletteLarge(colors)}</div>
  </div>` : "";

  const previewSection = colors ? `<div class="space-y-3">
    <h2 class="font-mono text-xs text-muted-foreground uppercase tracking-wider">preview</h2>
    ${terminalPreviewLarge({ colors, slug: theme.slug, themeName: theme.name, termStyle })}
  </div>` : "";

  const readmeSection = theme.readme_text ? `<div class="space-y-3">
    <h2 class="font-mono text-xs text-muted-foreground uppercase tracking-wider">readme</h2>
    <div class="border border-border/40 rounded-xl bg-card p-6">${renderReadme(theme.readme_text, theme.github_owner, theme.github_repo, branch, pathPrefix)}</div>
  </div>` : "";

  const stars = theme.stars > 0
    ? `<span class="badge font-mono gap-1.5 inline-flex items-center"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15 8.5 22 9.3 17 14 18 21 12 17.8 6 21 7 14 2 9.3 9 8.5 12 2"/></svg>${theme.stars}</span>`
    : "";

  const overlayCard = overlayBase ? `<div class="border border-border/40 rounded-xl bg-card p-5 space-y-3 text-sm">
    <div class="flex items-center gap-2 font-mono text-xs text-muted-foreground uppercase tracking-wider">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
      enhances builtin
    </div>
    <p class="text-muted-foreground leading-relaxed">
      This theme overlays the builtin <a href="/themes/${attr(overlayBase.slug)}/" class="text-foreground hover:underline">${escapeHtml(overlayBase.name)}</a>. Files it provides take precedence — anything missing falls back to the builtin.
    </p>
    ${overlayVariants.length > 0 ? `<div class="border-t border-border/40 pt-3">
      <p class="font-mono text-xs text-muted-foreground mb-2">other variants</p>
      <div class="flex flex-wrap gap-1.5">${overlayVariants.map((v) => `<a href="/themes/${attr(v.slug)}/" class="badge-outline font-mono text-xs">${escapeHtml(v.name)}</a>`).join("")}</div>
    </div>` : ""}
  </div>` : "";

  const variantsCard = (theme.is_builtin === 1 && overlayVariants.length > 0) ? `<div class="border border-border/40 rounded-xl bg-card p-5 space-y-3 text-sm">
    <div class="flex items-center gap-2 font-mono text-xs text-muted-foreground uppercase tracking-wider">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
      community variants
    </div>
    <p class="text-muted-foreground leading-relaxed">These community themes enhance this builtin with custom files.</p>
    <div class="flex flex-wrap gap-1.5">${overlayVariants.map((v) => `<a href="/themes/${attr(v.slug)}/" class="badge-outline font-mono text-xs">${escapeHtml(v.name)}</a>`).join("")}</div>
  </div>` : "";

  const appsSection = apps.length > 0 ? `<div class="space-y-2">
    <h2 class="font-mono text-xs text-muted-foreground uppercase tracking-wider">supported apps</h2>
    <div class="flex flex-wrap gap-1.5">${apps.sort().map((a) => `<span class="badge-outline font-mono text-xs">${escapeHtml(a)}</span>`).join("")}</div>
  </div>` : "";

  let securityHtml = "";
  if (theme.security_warnings) {
    try {
      const warnings = JSON.parse(theme.security_warnings);
      const scripts = warnings.filter((w) => w.startsWith("suspicious file:")).map((w) => w.replace("suspicious file: ", ""));
      const exts = warnings.filter((w) => w.startsWith("vscode.json installs extension:")).map((w) => w.replace("vscode.json installs extension: ", ""));
      const dangerousLua = warnings.some((w) => w.startsWith("dangerous lua"));
      if (scripts.length || exts.length || dangerousLua) {
        const repoBase = `${theme.github_url}/blob/${branch}`;
        const blocks = [];
        if (scripts.length > 0) {
          blocks.push(`<div class="border border-blue-500/20 bg-blue-500/5 rounded-xl p-5 space-y-3 text-sm">
            <div class="font-mono text-xs text-blue-400 uppercase tracking-wider">includes extras</div>
            <p class="text-muted-foreground leading-relaxed">This theme ships optional scripts for additional setup.</p>
            <ul class="space-y-1">${scripts.map((f) => `<li><a href="${attr(`${repoBase}/${f}`)}" target="_blank" rel="noopener noreferrer" class="font-mono text-xs text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-4 decoration-blue-400/30">${escapeHtml(f)}</a></li>`).join("")}</ul>
          </div>`);
        }
        if (exts.length > 0) {
          blocks.push(`<div class="border border-blue-500/20 bg-blue-500/5 rounded-xl p-5 space-y-3 text-sm">
            <div class="font-mono text-xs text-blue-400 uppercase tracking-wider">installs vscode extension</div>
            <p class="text-muted-foreground leading-relaxed">Installing this theme will install the following VS Code extension:</p>
            <ul class="space-y-1">${exts.map((e) => `<li><a href="${attr(`https://marketplace.visualstudio.com/items?itemName=${encodeURIComponent(e)}`)}" target="_blank" rel="noopener noreferrer" class="font-mono text-xs text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-4 decoration-blue-400/30">${escapeHtml(e)}</a></li>`).join("")}</ul>
          </div>`);
        }
        blocks.push(`<div class="border border-yellow-500/30 bg-yellow-500/5 rounded-xl p-5 space-y-2 text-sm">
          <div class="flex items-center gap-2 font-mono text-xs text-yellow-500 uppercase tracking-wider">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            heads up
          </div>
          <p class="text-muted-foreground leading-relaxed">${dangerousLua ? "This theme includes code that can run commands on your machine. Review it before installing." : "Never run scripts from the internet without reading them first. Community themes are not audited and may contain anything. You are responsible for what you execute on your machine."}</p>
        </div>`);
        securityHtml = `<div class="space-y-3">${blocks.join("")}</div>`;
      }
    } catch {}
  }

  const body = `<div class="mx-auto max-w-6xl px-6 py-10">
  <nav class="mb-8 font-mono text-xs flex items-center gap-2 text-muted-foreground">
    <a href="/themes/" class="hover:text-foreground transition-colors">themes</a>
    <span aria-hidden="true">/</span>
    <span class="text-foreground">${escapeHtml(theme.name)}</span>
  </nav>
  <div class="grid gap-10 lg:grid-cols-[1fr_340px]">
    <div class="space-y-8 min-w-0">
      ${paletteSection}
      ${previewSection}
      ${readmeSection}
    </div>
    <aside class="space-y-6">
      <div class="sticky top-20 space-y-6">
        <div class="border border-border/40 rounded-xl bg-card p-5 space-y-4">
          <div>
            <h2 class="font-mono text-lg font-medium">${escapeHtml(theme.name)}</h2>
            ${theme.description ? `<p class="text-sm text-muted-foreground leading-relaxed mt-1">${escapeHtml(theme.description)}</p>` : ""}
          </div>
          ${stars}
          <div class="border-t border-border/40 pt-4">
            <a href="${attr(theme.github_url)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              ${escapeHtml(theme.github_owner)}/${escapeHtml(theme.github_repo)}
            </a>
          </div>
        </div>
        ${overlayCard}
        ${variantsCard}
        ${appsSection}
        <div class="space-y-2">
          <h2 class="font-mono text-xs text-muted-foreground uppercase tracking-wider">install</h2>
          ${installCommand(theme.github_url)}
        </div>
        ${securityHtml}
      </div>
    </aside>
  </div>
</div>`;

  return layout({
    title: theme.name,
    description: theme.description ?? `Preview and install the ${theme.name} color scheme for Omarchy.`,
    path: `/themes/${theme.slug}/`,
    body,
  });
}

export function notFoundPage() {
  const body = `<div class="mx-auto max-w-6xl px-6 py-20 sm:py-32">
  <div class="max-w-lg space-y-6">
    <div class="font-mono text-sm text-muted-foreground space-y-1">
      <div>
        <span class="text-green-400/60">user@omarchy</span><span class="text-muted-foreground">:</span><span class="text-blue-400/60">~</span><span class="text-muted-foreground"> $ </span><span class="text-foreground">cd themes/???</span>
      </div>
      <div class="text-red-400/80">bash: cd: themes/???: No such file or directory</div>
    </div>
    <h1 class="font-mono text-3xl font-bold tracking-tight text-foreground">404</h1>
    <p class="text-muted-foreground leading-relaxed">This page doesn't exist. Maybe the theme was removed, or the URL is wrong.</p>
    <div class="flex gap-3 pt-2">
      <a href="/themes/" class="btn-primary inline-flex items-center gap-2 font-mono px-3 h-8 rounded-md">browse themes</a>
      <a href="/" class="btn-outline inline-flex items-center gap-2 font-mono px-3 h-8 rounded-md">home</a>
    </div>
  </div>
</div>`;

  return layout({ title: "Not Found", path: "/404", body });
}
