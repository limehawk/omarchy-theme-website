export const COLOR_BUCKETS = [
  "red",
  "orange",
  "brown",
  "yellow",
  "green",
  "teal",
  "cyan",
  "blue",
  "purple",
  "pink",
  "black",
  "grey",
  "white",
];

export const BUCKET_COLORS = {
  red: "#ef4444",
  orange: "#f97316",
  brown: "#92653a",
  yellow: "#eab308",
  green: "#22c55e",
  teal: "#14b8a6",
  cyan: "#06b6d4",
  blue: "#3b82f6",
  purple: "#a855f7",
  pink: "#ec4899",
  black: "#262626",
  grey: "#a3a3a3",
  white: "#e5e5e5",
};

export function cssHex(hex) {
  return hex.startsWith("0x") || hex.startsWith("0X") ? "#" + hex.slice(2) : hex;
}

export function parseColors(colorsJson) {
  if (!colorsJson) return null;
  try {
    const raw = JSON.parse(colorsJson);
    const out = {};
    for (const [k, v] of Object.entries(raw)) out[k] = cssHex(v);
    return out;
  } catch {
    return null;
  }
}

export function hexToHsl(hex) {
  const raw = hex.replace(/^(#|0x|0X)/, "");
  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  switch (max) {
    case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
    case g: h = ((b - r) / d + 2) / 6; break;
    default: h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export function getThemeBrightness(colorsJson) {
  if (!colorsJson) return "dark";
  try {
    const colors = JSON.parse(colorsJson);
    if (!colors.background) return "dark";
    const { l } = hexToHsl(colors.background);
    return l > 50 ? "light" : "dark";
  } catch {
    return "dark";
  }
}

export function hexToRgba(hex, alpha) {
  const h = hex.replace(/^#/, "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function hexToOklch(hex) {
  const raw = hex.replace(/^(#|0x|0X)/, "");
  const lin = (i) => {
    const c = parseInt(raw.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = [lin(0), lin(2), lin(4)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return {
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    c: Math.hypot(A, B),
    h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360,
  };
}

// OKLCH hue angles, so boundaries follow what eyes see rather than HSL's lopsided wheel.
function chromaBucket({ l, c, h }) {
  if (h >= 20 && h < 100 && (c < 0.09 || (l < 0.6 && c < 0.13))) return "brown";
  if (h < 5 || h >= 335) return "pink";
  if (h < 38) return "red";
  if (h < 75) return "orange";
  if (h < 110) return "yellow";
  if (h < 165) return "green";
  if (h < 195) return "teal";
  if (h < 230) return "cyan";
  if (h < 280) return "blue";
  return "purple";
}

// Background covers most of the screen, so a faint tint outweighs a vivid accent.
// Alacritty-only themes have no accent; the scraper fills it with ANSI blue, so trust it less.
const HUE_WEIGHTS = { accent: 3, background: 6, foreground: 1.5 };

export function themeHues(colors, accentIsFallback = false) {
  if (!colors) return [];
  const scores = {};
  for (const [key, w] of Object.entries(HUE_WEIGHTS)) {
    const hex = colors[key];
    if (!/^(#|0x)?[0-9a-f]{6}/i.test(hex ?? "")) continue;
    const o = hexToOklch(hex);
    if (o.c < 0.02) continue;
    const b = chromaBucket(o);
    const weight = key === "accent" && accentIsFallback ? 2 : w;
    scores[b] = (scores[b] ?? 0) + weight * Math.min(o.c, 0.15);
  }
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (!ranked.length || ranked[0][1] < 0.1) {
    const l = colors.background ? hexToOklch(colors.background).l : 0;
    return l > 0.75 ? ["grey", "white"] : l < 0.4 ? ["grey", "black"] : ["grey"];
  }
  return ranked.filter(([, s]) => s >= ranked[0][1] * 0.5).slice(0, 2).map(([b]) => b);
}

// True black lets OLED pixels switch off; #0a0a0a is indistinguishable on most panels.
export function isOled(colors) {
  const raw = (colors?.background ?? "").replace(/^(#|0x|0X)/, "");
  if (raw.length < 6) return false;
  return [0, 2, 4].every((i) => parseInt(raw.slice(i, i + 2), 16) <= 0x0a);
}
