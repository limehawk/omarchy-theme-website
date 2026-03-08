import { cn } from "@/lib/utils";
import { cssHex } from "@/lib/colors";

interface ColorPaletteProps {
  colors: Record<string, string>;
  size?: "sm" | "md" | "lg";
  showLabels?: boolean;
}

const COLOR_ORDER = [
  "background",
  "foreground",
  "accent",
  "cursor",
  "selection_background",
  "selection_foreground",
  "color0",
  "color1",
  "color2",
  "color3",
  "color4",
  "color5",
  "color6",
  "color7",
  "color8",
  "color9",
  "color10",
  "color11",
  "color12",
  "color13",
  "color14",
  "color15",
];

export function ColorPalette({
  colors,
  size = "sm",
  showLabels = false,
}: ColorPaletteProps) {
  const orderedColors = COLOR_ORDER.filter((key) => colors[key]).map(
    (key) => ({
      name: key,
      hex: colors[key],
    })
  );

  const dotSize = {
    sm: "size-3",
    md: "size-5",
    lg: "size-6",
  };

  // Large size with labels: columnar layout with name to the right
  if (showLabels) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2">
        {orderedColors.map(({ name, hex }) => (
          <div key={name} className="flex items-center gap-2.5">
            <div
              className={cn("rounded-sm border border-white/10 shrink-0", dotSize[size])}
              style={{ backgroundColor: cssHex(hex) }}
              title={`${name}: ${hex}`}
            />
            <div className="min-w-0">
              <p className="font-mono text-xs text-muted-foreground truncate">
                {name.replace("_", " ")}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground/50">
                {hex}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Small/medium: compact dot grid (used on cards and sidebar)
  return (
    <div className="flex flex-wrap gap-1">
      {orderedColors.map(({ name, hex }) => (
        <div
          key={name}
          className={cn(
            "rounded-sm border border-white/10",
            dotSize[size],
            name === "accent" && size === "sm" && "size-3.5 ring-1 ring-white/20 rounded-sm"
          )}
          style={{ backgroundColor: cssHex(hex) }}
          title={`${name}: ${hex}`}
        />
      ))}
    </div>
  );
}
