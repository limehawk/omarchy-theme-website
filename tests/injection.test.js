import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { cssHex, parseColors } from "../scripts/colors.js";
import { renderReadme } from "../src/lib/readme.js";
import { terminalPreviewLarge } from "../src/lib/terminal.js";

// Theme authors control these values; each must stay a value, never become extra CSS.

test("cssHex keeps hex colors and drops anything else", () => {
  expect(cssHex("#7aa2f7")).toBe("#7aa2f7");
  expect(cssHex("0x1e1e2e")).toBe("#1e1e2e");
  expect(cssHex("#fff")).toBe("#fff");
  expect(cssHex("#7aa2f7ff")).toBe("#7aa2f7ff");
  expect(cssHex("#7aa2f7;position:fixed;inset:0;z-index:2147483647")).toBeUndefined();
  expect(cssHex("CellForeground")).toBeUndefined();
  expect(cssHex(42)).toBeUndefined();
});

test("parseColors drops injected color values", () => {
  const colors = parseColors(JSON.stringify({ accent: "#7aa2f7;position:fixed;inset:0", background: "#1a1b26" }));
  expect(colors).toEqual({ background: "#1a1b26" });
});

test("terminal preview ignores a font_family that leaves its CSS string", () => {
  const evil = 'X";position:fixed;inset:0;z-index:2147483647;x:"';
  const html = terminalPreviewLarge({ colors: { background: "#000000" }, slug: "t", themeName: "t", termStyle: { font_family: evil } });
  expect(html).not.toContain("position:fixed");
  const ok = terminalPreviewLarge({ colors: { background: "#000000" }, slug: "t", themeName: "t", termStyle: { font_family: "JetBrainsMono Nerd Font" } });
  expect(ok).toContain("JetBrainsMono Nerd Font");
});

test("README keeps only the renderer's own classes", () => {
  const html = renderReadme(
    '<span class="[body:has(&)_aside]:hidden">x</span>\n\n<div class="fixed inset-0 z-[9999]">y</div>\n\n```js\nlet a\n```\n\n`code`',
    "o", "r", "main",
  );
  expect(html).not.toContain("aside]:hidden");
  expect(html).not.toContain("fixed");
  expect(html).not.toContain("z-[9999]");
  expect(html).toContain('class="block whitespace-pre language-js"');
  expect(html).toContain("bg-muted/50");
});

test("Tailwind does not scan scraped data for classes", () => {
  expect(readFileSync(new URL("../src/styles.css", import.meta.url), "utf8")).toStartWith('@import "tailwindcss" source(none);');
});
