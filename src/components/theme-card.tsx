"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { parseColors } from "@/lib/colors";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ThemeListItem } from "@/lib/db";

const DEFAULT_ACCENT = "#4a9eff";

const COLOR_INDICES = Array.from({ length: 16 }, (_, i) => i);

interface ThemeCardProps {
  theme: ThemeListItem;
  forceTerminal?: boolean;
}

function TerminalPreview({
  colors,
  slug,
  themeName,
}: {
  colors: Record<string, string> | null;
  slug: string;
  themeName: string;
}) {
  const bg = colors?.background ?? "#1a1a2e";
  const fg = colors?.foreground ?? "#e0e0e0";
  const dim = colors?.color8 ?? "#666";
  const green = colors?.color2 ?? "#50fa7b";
  const blue = colors?.color4 ?? "#6272a4";
  const dotKeys = ["color8","color7","color6","color5","color4","color3","color2","color1"];

  return (
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: bg }}>
      {/* Title bar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-white/5">
        <span className="size-1.5 rounded-full bg-red-500/70" />
        <span className="size-1.5 rounded-full bg-yellow-500/70" />
        <span className="size-1.5 rounded-full bg-green-500/70" />
        <span className="ml-1.5 font-mono text-[8px]" style={{ color: fg, opacity: 0.5 }}>
          ~/{slug}
        </span>
      </div>
      {/* Compact fastfetch */}
      <div
        className="flex-1 px-3 py-2 text-[8px] leading-tight whitespace-pre"
        style={{
          color: fg,
          fontFamily: `var(--font-jetbrains-mono), "Symbols Nerd Font", monospace`,
        }}
      >
        <div style={{ color: dim }}>{"┌──────── Hardware ────────"}</div>
        <div><span style={{ color: green }}>{" PC"}</span>: omarchy-host</div>
        <div><span style={{ color: green }}>{"│ ├"}</span>: x86_64 (8 cores)</div>
        <div><span style={{ color: green }}>{"│ ├"}</span>: Integrated Graphics</div>
        <div><span style={{ color: green }}>{"└ └"}</span>: 8 / 16 GiB</div>
        <div style={{ color: dim }}>{"└──────────────────────────"}</div>
        <div className="h-1" />
        <div style={{ color: dim }}>{"┌──────── Software ────────"}</div>
        <div><span style={{ color: blue }}>{" OS"}</span>: Omarchy</div>
        <div><span style={{ color: blue }}>{"│ ├"}</span>: Hyprland</div>
        <div><span style={{ color: blue }}>{"│ ├"}</span>: ghostty</div>
        <div>
          <span style={{ color: blue }}>{"│ ├" + String.fromCodePoint(0xf0e0c)}</span>
          {": "}{themeName} {dotKeys.map(k => (
            <span key={k} style={{ color: colors?.[k] ?? "#888" }}>●</span>
          ))}
        </div>
        <div style={{ color: dim }}>{"└──────────────────────────"}</div>
      </div>
    </div>
  );
}

export function ThemeCard({ theme, forceTerminal }: ThemeCardProps) {
  const router = useRouter();
  const colors = parseColors(theme.colors_json);

  return (
    <Link href={`/themes/${theme.slug}`} className="group block">
      <Card
        className="overflow-hidden p-0"
        style={{ "--card-accent": colors?.accent ?? DEFAULT_ACCENT } as React.CSSProperties}
      >
        {/* Hero: screenshot or terminal fallback */}
        <div className="relative aspect-[16/10] overflow-hidden">
          {theme.preview_url && !forceTerminal ? (
            <img
              src={theme.preview_url}
              alt={theme.name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <TerminalPreview colors={colors} slug={theme.slug} themeName={theme.name} />
          )}
        </div>

        {/* Info */}
        <CardContent className="space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-mono text-sm font-medium text-foreground truncate">
              {theme.name}
            </h3>
            {theme.stars > 0 && (
              <Badge variant="secondary" className="font-mono text-xs gap-1 shrink-0">
                <Star className="size-3" />
                {theme.stars}
              </Badge>
            )}
          </div>
          <button
            type="button"
            className="font-mono text-[10px] text-muted-foreground truncate hover:text-foreground transition-colors"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              router.push(`/themes?author=${encodeURIComponent(theme.github_owner)}`);
            }}
          >
            {theme.github_owner}
          </button>
          {theme.overlays_builtin && (
            <span className="font-mono text-[10px] text-muted-foreground">
              enhances {theme.overlays_builtin}
            </span>
          )}
        </CardContent>

        {/* Color bar — flush to bottom edge */}
        {colors && (
          <div className="flex h-1.5 overflow-hidden">
            {COLOR_INDICES.map((i) => {
              const hex = colors[`color${i}`];
              return hex ? (
                <div
                  key={i}
                  className="flex-1"
                  style={{ backgroundColor: hex }}
                />
              ) : null;
            })}
          </div>
        )}
      </Card>
    </Link>
  );
}
