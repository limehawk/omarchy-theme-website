import Link from "next/link";
import { Star } from "lucide-react";
import { parseColors } from "@/lib/colors";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ThemeListItem } from "@/lib/db";

const DEFAULT_ACCENT = "#4a9eff";

const COLOR_INDICES = Array.from({ length: 16 }, (_, i) => i);

interface ThemeCardProps {
  theme: ThemeListItem;
}

function TerminalPreview({
  colors,
  slug,
}: {
  colors: Record<string, string> | null;
  slug: string;
}) {
  const bg = colors?.background ?? "#1a1a2e";
  const fg = colors?.foreground ?? "#e0e0e0";
  const accent = colors?.accent ?? DEFAULT_ACCENT;
  const cursor = colors?.cursor ?? accent;
  const c1 = colors?.color1 ?? "#ff5555";
  const c2 = colors?.color2 ?? "#50fa7b";
  const c3 = colors?.color3 ?? "#f1fa8c";
  const c4 = colors?.color4 ?? "#6272a4";
  const c5 = colors?.color5 ?? "#ff79c6";
  const c6 = colors?.color6 ?? "#8be9fd";

  return (
    <div className="w-full h-full flex flex-col" style={{ backgroundColor: bg }}>
      {/* Title bar */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-white/5">
        <span className="size-1.5 rounded-full bg-red-500/70" />
        <span className="size-1.5 rounded-full bg-yellow-500/70" />
        <span className="size-1.5 rounded-full bg-green-500/70" />
        <span
          className="ml-1.5 font-mono text-[8px]"
          style={{ color: fg, opacity: 0.5 }}
        >
          ~/{slug}
        </span>
      </div>
      {/* Terminal content */}
      <div className="flex-1 px-3 py-2 font-mono text-[9px] leading-relaxed space-y-0.5">
        <div>
          <span style={{ color: c2 }}>user@omarchy</span>
          <span style={{ color: fg }}>:</span>
          <span style={{ color: c4 }}>~</span>
          <span style={{ color: fg }}> $ </span>
          <span style={{ color: accent }}>ls</span>
        </div>
        <div className="flex flex-wrap gap-x-4">
          <span style={{ color: c4 }}>desktop/</span>
          <span style={{ color: c2 }}>scripts/</span>
          <span style={{ color: c1 }}>.config/</span>
          <span style={{ color: c3 }}>notes.md</span>
          <span style={{ color: c5 }}>Makefile</span>
          <span style={{ color: c6 }}>README</span>
        </div>
        <div className="pt-0.5">
          <span style={{ color: c2 }}>user@omarchy</span>
          <span style={{ color: fg }}>:</span>
          <span style={{ color: c4 }}>~</span>
          <span style={{ color: fg }}> $ </span>
          <span
            className="inline-block w-1.5 h-3 align-middle"
            style={{ backgroundColor: cursor }}
          />
        </div>
      </div>
    </div>
  );
}

export function ThemeCard({ theme }: ThemeCardProps) {
  const colors = parseColors(theme.colors_json);

  return (
    <Link href={`/themes/${theme.slug}`} className="group block">
      <Card
        className="overflow-hidden p-0"
        style={{ "--card-accent": colors?.accent ?? DEFAULT_ACCENT } as React.CSSProperties}
      >
        {/* Hero: screenshot or terminal fallback */}
        <div className="relative aspect-[16/10] overflow-hidden">
          {theme.preview_url ? (
            <img
              src={theme.preview_url}
              alt={theme.name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <TerminalPreview colors={colors} slug={theme.slug} />
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
          <p className="font-mono text-[10px] text-muted-foreground truncate">
            {theme.github_owner}
          </p>
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
