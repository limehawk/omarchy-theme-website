import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getFeaturedThemes } from "@/lib/db";
import { COLOR_BUCKETS, BUCKET_COLORS } from "@/lib/colors";
import { ThemeGrid } from "@/components/theme-grid";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const featured = getFeaturedThemes(6);

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
              href="https://omarchy.org/"
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
            <Button className="font-mono" render={<Link href="/themes" />}>
              browse themes
              <ArrowRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="font-mono"
              render={
                <a
                  href="https://omarchy.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              get omarchy
            </Button>
            <Button
              variant="outline"
              className="font-mono"
              render={
                <a
                  href="https://github.com/limehawk/omarchy-theme-website/issues/new?template=submit-theme.yml"
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              contribute a theme
            </Button>
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
            <Badge
              key={bucket}
              variant="outline"
              className="font-mono text-xs gap-2 py-2 px-4 hover:bg-muted transition-colors"
              render={<Link href={`/themes?color=${bucket}`} />}
            >
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: BUCKET_COLORS[bucket] }}
              />
              {bucket}
            </Badge>
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
          <div className="mt-10 text-center">
            <Button
              className="font-mono"
              render={<Link href="/themes" />}
            >
              browse all themes
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
