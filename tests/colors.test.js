import { expect, test } from "bun:test";
import { getThemeBrightness, isOled, parseColors, themeHues } from "../scripts/colors.js";
import { loadLiveThemes } from "../src/lib/themes.js";

test("hue of a single vivid accent", () => {
  const bg = "#101010";
  expect(themeHues({ accent: "#3b82f6", background: bg })).toEqual(["blue"]);
  expect(themeHues({ accent: "#22c55e", background: bg })).toEqual(["green"]);
  expect(themeHues({ accent: "#ef4444", background: bg })).toEqual(["red"]);
  expect(themeHues({ accent: "#eab308", background: bg })).toEqual(["yellow"]);
  expect(themeHues({ accent: "#f85a04", background: bg })).toEqual(["orange"]);
});

test("tinted background outweighs a fallback ANSI-blue accent", () => {
  expect(themeHues({ accent: "#0080ff", background: "#240037", foreground: "#ffffff" }, true)[0]).toBe("purple");
  expect(themeHues({ accent: "#65a0d9", background: "#1d271f", foreground: "#e4d8b4" }, true)).toContain("green");
});

test("slate accents on neutral backgrounds read as grey", () => {
  expect(themeHues({ accent: "#a1a5b5", background: "#1A1815", foreground: "#ffffff" }, true)).toEqual(["grey", "black"]);
  expect(themeHues({ accent: "#29251F", background: "#F8F3E8", foreground: "#29251F" })).toEqual(["grey", "white"]);
});

test("oled means a true-black background", () => {
  expect(isOled({ background: "#000000" })).toBe(true);
  expect(isOled({ background: "#0a0a0a" })).toBe(true);
  expect(isOled({ background: "#0b0e14" })).toBe(false);
  expect(isOled({ background: "#1e1e2e" })).toBe(false);
  expect(isOled(null)).toBe(false);
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
  expect(themeHues(parseColors(dark.colors_json))).toContain("blue");
  expect(isOled(parseColors(themes.find((t) => t.slug === "vantablack").colors_json))).toBe(true);
});
