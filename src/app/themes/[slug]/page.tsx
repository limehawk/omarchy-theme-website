export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Star, ExternalLink } from "lucide-react";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getThemeBySlug } from "@/lib/db";
import { ColorPalette } from "@/components/color-palette";
import { InstallCommand } from "@/components/install-command";
import { UpvoteButton } from "@/components/upvote-button";

interface Props {
  params: Promise<{ slug: string }>;
}

function parseColors(colorsJson: string | null): Record<string, string> | null {
  if (!colorsJson) return null;
  try {
    return JSON.parse(colorsJson);
  } catch {
    return null;
  }
}

export default async function ThemeDetailPage({ params }: Props) {
  const { slug } = await params;
  const { env } = await getCloudflareContext({ async: true });
  const db = env.DB as D1Database;
  const theme = await getThemeBySlug(db, slug);

  if (!theme) notFound();

  const colors = parseColors(theme.colors_json);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Breadcrumb */}
      <nav className="mb-8">
        <ol className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <li>
            <Link href="/themes" className="hover:text-foreground transition-colors">
              themes
            </Link>
          </li>
          <li>/</li>
          <li className="text-foreground">{theme.name}</li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        {/* Main content */}
        <div className="space-y-8 min-w-0">
          {/* Preview */}
          {theme.preview_url && (
            <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border/40 bg-black/40">
              <Image
                src={theme.preview_url}
                alt={`${theme.name} preview`}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 60vw"
                priority
              />
            </div>
          )}

          {/* Color palette (large) */}
          {colors && (
            <div className="space-y-3">
              <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                color palette
              </h2>
              <div className="rounded-xl border border-border/40 bg-card p-6">
                <ColorPalette colors={colors} size="lg" showLabels />
              </div>
            </div>
          )}

          {/* Terminal preview with colors */}
          {colors && (
            <div className="space-y-3">
              <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                preview
              </h2>
              <div
                className="rounded-xl border border-border/40 overflow-hidden"
                style={{ backgroundColor: colors.background ?? "#1a1a2e" }}
              >
                <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
                  <span className="size-2.5 rounded-full bg-red-500/70" />
                  <span className="size-2.5 rounded-full bg-yellow-500/70" />
                  <span className="size-2.5 rounded-full bg-green-500/70" />
                  <span className="ml-2 font-mono text-[10px]" style={{ color: colors.foreground ?? "#ccc" }}>
                    ~/{theme.slug}
                  </span>
                </div>
                <div className="p-5 font-mono text-sm leading-relaxed space-y-1">
                  <div>
                    <span style={{ color: colors.color2 ?? "#50fa7b" }}>user@omarchy</span>
                    <span style={{ color: colors.foreground ?? "#ccc" }}>:</span>
                    <span style={{ color: colors.color4 ?? "#6272a4" }}>~</span>
                    <span style={{ color: colors.foreground ?? "#ccc" }}> $ </span>
                    <span style={{ color: colors.accent ?? "#4a9eff" }}>ls</span>
                    <span style={{ color: colors.foreground ?? "#ccc" }}> --color</span>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <span style={{ color: colors.color4 ?? "#6272a4" }}>desktop/</span>
                    <span style={{ color: colors.color2 ?? "#50fa7b" }}>scripts/</span>
                    <span style={{ color: colors.color1 ?? "#ff5555" }}>.config/</span>
                    <span style={{ color: colors.color3 ?? "#f1fa8c" }}>notes.md</span>
                    <span style={{ color: colors.color5 ?? "#ff79c6" }}>Makefile</span>
                    <span style={{ color: colors.color6 ?? "#8be9fd" }}>README.md</span>
                  </div>
                  <div className="pt-1">
                    <span style={{ color: colors.color2 ?? "#50fa7b" }}>user@omarchy</span>
                    <span style={{ color: colors.foreground ?? "#ccc" }}>:</span>
                    <span style={{ color: colors.color4 ?? "#6272a4" }}>~</span>
                    <span style={{ color: colors.foreground ?? "#ccc" }}> $ </span>
                    <span
                      className="inline-block w-2 h-4 align-middle animate-pulse"
                      style={{ backgroundColor: colors.cursor ?? colors.accent ?? "#4a9eff" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* README */}
          {theme.readme_html && (
            <div className="space-y-3">
              <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                readme
              </h2>
              <div className="rounded-xl border border-border/40 bg-card p-6">
                <pre className="font-mono text-sm text-muted-foreground whitespace-pre-wrap break-words leading-relaxed overflow-x-auto">
                  {theme.readme_html}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="sticky top-20 space-y-6">
            {/* Theme info */}
            <div className="rounded-xl border border-border/40 bg-card p-5 space-y-4">
              <div>
                <h1 className="font-mono text-lg font-bold text-foreground">
                  {theme.name}
                </h1>
                {theme.description && (
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {theme.description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-4">
                <UpvoteButton themeId={theme.id} initialCount={theme.upvote_count} />
                {theme.stars > 0 && (
                  <span className="inline-flex items-center gap-1.5 font-mono text-sm text-muted-foreground">
                    <Star className="size-4" />
                    {theme.stars}
                  </span>
                )}
              </div>

              <div className="border-t border-border/40 pt-4">
                <a
                  href={theme.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="size-3" />
                  {theme.github_owner}/{theme.github_repo}
                </a>
              </div>
            </div>

            {/* Install */}
            <div className="space-y-2">
              <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                install
              </h2>
              <InstallCommand githubUrl={theme.github_url} />
            </div>

            {/* Mini palette in sidebar */}
            {colors && (
              <div className="space-y-2">
                <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                  colors
                </h2>
                <div className="rounded-xl border border-border/40 bg-card p-4">
                  <ColorPalette colors={colors} size="md" />
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
