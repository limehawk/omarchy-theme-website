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
import { AuthorFilter } from "@/components/author-filter";
import { FilterGroup } from "@/components/filter-group";
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
  const author = searchParams.get("author") ?? "";
  const view = searchParams.get("view") ?? "";

  const themeNames = useMemo(
    () => [...new Set(themes.map((t) => t.name))].sort((a, b) => a.localeCompare(b)),
    [themes]
  );

  const authors = useMemo(
    () => [...new Set(themes.map((t) => t.github_owner))].sort((a, b) => a.localeCompare(b)),
    [themes]
  );

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

    // Author filter
    if (author) {
      result = result.filter((t) => t.github_owner === author);
    }

    // Search by theme name
    if (q) {
      const lower = q.toLowerCase();
      result = result.filter((t) => t.name.toLowerCase().includes(lower));
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
  }, [themes, q, sort, source, color, brightness, author]);

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

      <div className="sticky top-14 z-30 -mx-6 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border/40 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchBar names={themeNames} value={q} onChange={(v) => updateParam("q", v)} />
          </div>
          <AuthorFilter
            authors={authors}
            value={author}
            onChange={(v) => updateParam("author", v)}
          />
          <SortSelect value={sort} onChange={(v) => updateParam("sort", v)} />
        </div>
        <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
          <FilterGroup label="source">
            <SourceFilter
              value={source}
              onChange={(v) => updateParam("source", v)}
            />
          </FilterGroup>
          <FilterGroup label="brightness">
            <BrightnessFilter
              value={brightness}
              onChange={(v) => updateParam("brightness", v)}
            />
          </FilterGroup>
          <FilterGroup label="view">
            <ViewToggle
              value={view}
              onChange={(v) => updateParam("view", v)}
            />
          </FilterGroup>
        </div>
        <FilterGroup label="color">
          <ColorFilter
            value={color}
            onChange={(v) => updateParam("color", v)}
          />
        </FilterGroup>
      </div>

      <ThemeGrid themes={filtered} forceTerminal={view === "terminal"} />
    </div>
  );
}
