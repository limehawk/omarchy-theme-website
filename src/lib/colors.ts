export const COLOR_BUCKETS = [
  "red",
  "orange",
  "yellow",
  "green",
  "teal",
  "blue",
  "purple",
  "pink",
  "monochrome",
] as const;

export type ColorBucket = (typeof COLOR_BUCKETS)[number];

export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  // Strip leading #
  const raw = hex.replace(/^#/, "");

  const r = parseInt(raw.slice(0, 2), 16) / 255;
  const g = parseInt(raw.slice(2, 4), 16) / 255;
  const b = parseInt(raw.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    // Achromatic
    return { h: 0, s: 0, l: l * 100 };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

export const BUCKET_COLORS: Record<ColorBucket, string> = {
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  teal: "#14b8a6",
  blue: "#3b82f6",
  purple: "#a855f7",
  pink: "#ec4899",
  monochrome: "#a3a3a3",
};

export function getColorBucket(hex: string): ColorBucket {
  const { h, s, l } = hexToHsl(hex);

  if (s < 10 || l > 95 || l < 5) return "monochrome";
  if (h >= 340 || h < 15) return "red";
  if (h >= 15 && h < 40) return "orange";
  if (h >= 40 && h < 65) return "yellow";
  if (h >= 65 && h < 160) return "green";
  if (h >= 160 && h < 195) return "teal";
  if (h >= 195 && h < 260) return "blue";
  if (h >= 260 && h < 290) return "purple";
  if (h >= 290 && h < 340) return "pink";

  return "monochrome";
}
