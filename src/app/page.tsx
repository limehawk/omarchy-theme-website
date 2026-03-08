export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getFeaturedThemes } from "@/lib/db";
import { COLOR_BUCKETS } from "@/lib/colors";
import { ThemeGrid } from "@/components/theme-grid";
import type { ColorBucket } from "@/lib/colors";

const BUCKET_COLORS: Record<ColorBucket, string> = {
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  green: "#22c55e",
  teal: "#14b8a6",
  blue: "#3b82f6",
  purple: "#a855f7",
  pink: "#ec4899",
  monochrome: "#a3a3a3",
};

export default async function Home() {
  const { env } = await getCloudflareContext({ async: true });
  const db = env.DB as D1Database;
  const featured = await getFeaturedThemes(db, 6);

  return (
    <div className="mx-auto max-w-6xl px-6">
      {/* Hero */}
      <section className="py-20 sm:py-28">
        <div className="max-w-2xl space-y-6">
          <h1 className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            discover omarchy themes
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Browse and install terminal color schemes for{" "}
            <a
              href="https://github.com/basecamp/omarchy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground/60 transition-colors"
            >
              Omarchy
            </a>
            , the opinionated Linux desktop environment from Basecamp.
            One command to transform your terminal.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/themes"
              className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 font-mono text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
            >
              browse themes
              <ArrowRight className="size-4" />
            </Link>
            <a
              href="https://github.com/basecamp/omarchy"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border/50 px-4 py-2.5 font-mono text-sm text-muted-foreground hover:text-foreground hover:border-border transition-colors"
            >
              get omarchy
            </a>
          </div>
        </div>
      </section>

      {/* Color quick-links */}
      <section className="pb-16">
        <h2 className="font-mono text-xs text-muted-foreground mb-4 uppercase tracking-wider">
          browse by color
        </h2>
        <div className="flex flex-wrap gap-3">
          {COLOR_BUCKETS.map((bucket) => (
            <Link
              key={bucket}
              href={`/themes?color=${bucket}`}
              className="group inline-flex items-center gap-2 rounded-full border border-border/40 px-4 py-2 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-border transition-all"
            >
              <span
                className="size-3 rounded-full transition-transform group-hover:scale-125"
                style={{ backgroundColor: BUCKET_COLORS[bucket] }}
              />
              {bucket}
            </Link>
          ))}
        </div>
      </section>

      {/* Featured themes */}
      {featured.length > 0 && (
        <section className="pb-20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              popular themes
            </h2>
            <Link
              href="/themes"
              className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              view all &rarr;
            </Link>
          </div>
          <ThemeGrid themes={featured} />
        </section>
      )}
    </div>
  );
}
