import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getFeaturedThemes, getRandomThemes } from "@/lib/db";
import { ThemeGrid } from "@/components/theme-grid";
import { Button } from "@/components/ui/button";

export default function Home() {
  const featured = getFeaturedThemes(6);
  const featuredIds = new Set(featured.map((t) => t.id));
  const discover = getRandomThemes(6, featuredIds);

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

      {/* Popular themes */}
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

      {/* Discover */}
      {discover.length > 0 && (
        <section className="pb-20">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
              discover
            </h2>
            <Link
              href="/themes"
              className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              view all &rarr;
            </Link>
          </div>
          <ThemeGrid themes={discover} />
        </section>
      )}

      {/* CTA */}
      <section className="pb-20 text-center">
        <Button
          className="font-mono"
          render={<Link href="/themes" />}
        >
          browse all themes
          <ArrowRight className="size-4" />
        </Button>
      </section>
    </div>
  );
}
