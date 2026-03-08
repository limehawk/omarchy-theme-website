import { ThemeCard } from "@/components/theme-card";
import type { ThemeListItem } from "@/lib/db";

interface ThemeGridProps {
  themes: ThemeListItem[];
}

export function ThemeGrid({ themes }: ThemeGridProps) {
  if (themes.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="font-mono text-sm text-muted-foreground">
          no themes found
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {themes.map((theme) => (
        <ThemeCard key={theme.id} theme={theme} />
      ))}
    </div>
  );
}
