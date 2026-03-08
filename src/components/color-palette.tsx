import { cn } from "@/lib/utils";

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
    lg: "size-7",
  };

  return (
    <div className={cn("flex flex-wrap gap-1", showLabels && "gap-2")}>
      {orderedColors.map(({ name, hex }) => (
        <div
          key={name}
          className={cn("flex flex-col items-center gap-1", showLabels && "min-w-[3.5rem]")}
        >
          <div
            className={cn(
              "rounded-sm border border-white/10",
              dotSize[size],
              name === "accent" && size === "sm" && "size-3.5 ring-1 ring-white/20 rounded-sm"
            )}
            style={{ backgroundColor: hex }}
            title={`${name}: ${hex}`}
          />
          {showLabels && (
            <div className="text-center">
              <p className="font-mono text-[10px] text-muted-foreground leading-tight">
                {name.replace("color", "c").replace("_", " ")}
              </p>
              <p className="font-mono text-[10px] text-muted-foreground/60">
                {hex}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
