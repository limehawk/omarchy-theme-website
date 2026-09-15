import { expect, test } from "bun:test";
import { computeHueBucket, getThemeBrightness } from "../scripts/colors.js";
import { loadLiveThemes } from "../src/lib/themes.js";

test("hue bucket of known hex values", () => {
  expect(computeHueBucket("#3b82f6")).toBe("blue");
  expect(computeHueBucket("#22c55e")).toBe("green");
  expect(computeHueBucket("#ef4444")).toBe("red");
  expect(computeHueBucket("#eab308")).toBe("yellow");
});

test("brightness from light vs dark background", () => {
  expect(getThemeBrightness(JSON.stringify({ background: "#1e1e2e" }))).toBe("dark");
  expect(getThemeBrightness(JSON.stringify({ background: "#f5f5f5" }))).toBe("light");
});

test("real theme colors_json drives the same helpers", () => {
  const themes = loadLiveThemes();
  const dark = themes.find((t) => t.slug === "catppuccin");
  const light = themes.find((t) => t.slug === "catppuccin-latte");
  expect(dark).toBeTruthy();
  expect(light).toBeTruthy();
  expect(getThemeBrightness(dark.colors_json)).toBe("dark");
  expect(getThemeBrightness(light.colors_json)).toBe("light");
  const colors = JSON.parse(dark.colors_json);
  expect(computeHueBucket(colors.accent, colors.background)).toBe(dark.primary_hue);
});
