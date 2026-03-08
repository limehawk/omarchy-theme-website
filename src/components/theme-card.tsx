import Link from "next/link";
import Image from "next/image";
import { Star, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColorPalette } from "@/components/color-palette";
import type { Theme } from "@/lib/db";

interface ThemeCardProps {
  theme: Theme;
}

function parseColors(colorsJson: string | null): Record<string, string> | null {
  if (!colorsJson) return null;
  try {
    return JSON.parse(colorsJson);
  } catch {
    return null;
  }
}

function GradientPlaceholder({
  colors,
}: {
  colors: Record<string, string> | null;
}) {
  const bg = colors?.background ?? "#1a1a2e";
  const fg = colors?.foreground ?? "#e0e0e0";
  const accent = colors?.accent ?? "#4a9eff";
  const c1 = colors?.color1 ?? "#ff5555";
  const c2 = colors?.color2 ?? "#50fa7b";
  const c4 = colors?.color4 ?? "#6272a4";

  return (
    <div
      className="w-full h-full flex flex-col justify-between p-4 font-mono text-[10px] leading-relaxed"
      style={{ backgroundColor: bg, color: fg }}
    >
      <div className="space-y-1">
        <span style={{ color: c2 }}>~</span>
        <span style={{ color: fg }}> $ </span>
        <span style={{ color: accent }}>neofetch</span>
      </div>
      <div className="flex gap-1.5 mt-auto">
        {[c1, c2, accent, c4, fg].map((color, i) => (
          <div
            key={i}
            className="size-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </div>
  );
}

export function ThemeCard({ theme }: ThemeCardProps) {
  const colors = parseColors(theme.colors_json);

  return (
    <Link href={`/themes/${theme.slug}`} className="group block">
      <div
        className={cn(
          "rounded-xl border border-border/40 bg-card overflow-hidden transition-all duration-300",
          "hover:border-border hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5"
        )}
      >
        {/* Preview */}
        <div className="relative aspect-[16/10] overflow-hidden bg-black/40">
          {theme.preview_url ? (
            <Image
              src={theme.preview_url}
              alt={`${theme.name} preview`}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          ) : (
            <GradientPlaceholder colors={colors} />
          )}
        </div>

        {/* Info */}
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-mono text-sm font-medium text-foreground truncate">
              {theme.name}
            </h3>
            <div className="flex items-center gap-3 shrink-0">
              <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                <ArrowUp className="size-3" />
                {theme.upvote_count}
              </span>
              {theme.stars > 0 && (
                <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
                  <Star className="size-3" />
                  {theme.stars}
                </span>
              )}
            </div>
          </div>

          {colors && <ColorPalette colors={colors} size="sm" />}
        </div>
      </div>
    </Link>
  );
}
