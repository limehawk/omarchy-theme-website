export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Browse Themes",
};
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getThemes } from "@/lib/db";
import { ThemeGrid } from "@/components/theme-grid";
import { ColorFilter } from "@/components/color-filter";
import { SearchBar } from "@/components/search-bar";
import { SortSelect } from "@/components/sort-select";
import { SourceFilter } from "@/components/source-filter";

interface Props {
  searchParams: Promise<{
    color?: string;
    q?: string;
    sort?: string;
    source?: string;
  }>;
}

export default async function ThemesPage({ searchParams }: Props) {
  const params = await searchParams;
  const color = params.color ?? undefined;
  const q = params.q ?? undefined;
  const sort = (params.sort as "newest" | "stars" | "name") ?? "stars";
  const source = (params.source as "all" | "community" | "builtin") ?? "all";

  const { env } = await getCloudflareContext({ async: true });
  const db = env.DB as D1Database;
  const { themes, total } = await getThemes(db, { color, q, sort, source, limit: 300 });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground">
            themes
          </h1>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {total} theme{total !== 1 ? "s" : ""} available
          </p>
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Suspense>
                <SearchBar />
              </Suspense>
            </div>
            <Suspense>
              <SortSelect />
            </Suspense>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Suspense>
              <SourceFilter />
            </Suspense>
            <Suspense>
              <ColorFilter />
            </Suspense>
          </div>
        </div>

        {/* Grid */}
        <ThemeGrid themes={themes} />
      </div>
    </div>
  );
}
