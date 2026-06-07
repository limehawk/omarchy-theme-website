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
