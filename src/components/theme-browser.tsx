"use client";

import { useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { ThemeListItem } from "@/lib/db";
import { ThemeGrid } from "@/components/theme-grid";
import { SearchBar } from "@/components/search-bar";
import { SortSelect } from "@/components/sort-select";
import { SourceFilter } from "@/components/source-filter";
import { ColorFilter } from "@/components/color-filter";
import { BrightnessFilter } from "@/components/brightness-filter";
import { ViewToggle } from "@/components/view-toggle";
import { getThemeBrightness } from "@/lib/colors";

interface ThemeBrowserProps {
  themes: ThemeListItem[];
}

export function ThemeBrowser({ themes }: ThemeBrowserProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const q = searchParams.get("q") ?? "";
  const sort = searchParams.get("sort") ?? "stars";
  const source = searchParams.get("source") ?? "community";
  const color = searchParams.getAll("color");
  const brightness = searchParams.get("brightness") ?? "";
  const view = searchParams.get("view") ?? "";

  function updateParam(key: string, value: string | string[]) {
    const params = new URLSearchParams(searchParams.toString());
    if (Array.isArray(value)) {
      params.delete(key);
      value.forEach((v) => params.append(key, v));
    } else if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`/themes${params.toString() ? `?${params}` : ""}`, {
      scroll: false,
    });
  }

  const filtered = useMemo(() => {
    let result = themes;

    // Source filter
    if (source === "community") {
      result = result.filter((t) => t.is_builtin === 0);
    } else if (source === "builtin") {
      result = result.filter((t) => t.is_builtin === 1);
    }

    // Color filter
    if (color.length > 0) {
      result = result.filter((t) => t.primary_hue && color.includes(t.primary_hue));
    }

    // Brightness filter
    if (brightness) {
      result = result.filter(
        (t) => getThemeBrightness(t.colors_json) === brightness
      );
    }

    // Search
    if (q) {
      const lower = q.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(lower) ||
          (t.description?.toLowerCase().includes(lower) ?? false)
      );
    }

    // Sort
    switch (sort) {
      case "name":
        result = [...result].sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "newest":
        result = [...result].sort(
          (a, b) =>
            new Date(b.github_pushed_at ?? b.created_at).getTime() -
            new Date(a.github_pushed_at ?? a.created_at).getTime()
        );
        break;
      case "stars":
      default:
        result = [...result].sort((a, b) => b.stars - a.stars);
        break;
    }

    return result;
  }, [themes, q, sort, source, color, brightness]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground">
          themes
        </h1>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          {filtered.length} theme{filtered.length !== 1 ? "s" : ""} available
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchBar value={q} onChange={(v) => updateParam("q", v)} />
          </div>
          <SortSelect value={sort} onChange={(v) => updateParam("sort", v)} />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <SourceFilter
            value={source}
            onChange={(v) => updateParam("source", v)}
          />
          <BrightnessFilter
            value={brightness}
            onChange={(v) => updateParam("brightness", v)}
          />
          <ColorFilter
            value={color}
            onChange={(v) => updateParam("color", v)}
          />
          <ViewToggle
            value={view}
            onChange={(v) => updateParam("view", v)}
          />
        </div>
      </div>

      <ThemeGrid themes={filtered} forceTerminal={view === "terminal"} />
    </div>
  );
}
