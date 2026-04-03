import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Star, ExternalLink, Layers, TriangleAlert } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getAllThemes, getThemeBySlug, getOverlaysOf, getBuiltinForOverlay } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ColorPalette } from "@/components/color-palette";
import { InstallCommand } from "@/components/install-command";
import { ReadmeContent } from "@/components/readme-content";
import { parseColors } from "@/lib/colors";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllThemes().map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug } = await params;
  const theme = getThemeBySlug(slug);

  if (!theme) {
    return { title: "Theme Not Found" };
  }

  return {
    title: theme.name,
    description:
      theme.description ?? `Preview and install the ${theme.name} color scheme for Omarchy.`,
  };
}

export default async function ThemeDetailPage({ params }: Props) {
  const { slug } = await params;
  const theme = getThemeBySlug(slug);

  if (!theme) notFound();

  const builtinBase = getBuiltinForOverlay(theme);
  const overlayVariants = theme.is_builtin
    ? getOverlaysOf(theme.slug)
    : theme.overlays_builtin
      ? getOverlaysOf(theme.overlays_builtin).filter((t) => t.slug !== theme.slug)
      : [];

  const colors = parseColors(theme.colors_json);
  const apps: string[] = theme.apps_json ? JSON.parse(theme.apps_json) : [];

  // Derive branch and path prefix for resolving relative README URLs
  const readmeBranch = theme.default_branch ?? "main";
  let readmePathPrefix = "";
  if (theme.is_builtin) {
    const treeMatch = theme.github_url.match(/\/tree\/[^/]+\/(.+)/);
    if (treeMatch) readmePathPrefix = treeMatch[1];
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Breadcrumb */}
      <Breadcrumb className="mb-8 font-mono text-xs">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink render={<Link href="/themes" />}>
              themes
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{theme.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        {/* Main content */}
        <div className="space-y-8 min-w-0">
          {/* Color palette (large) */}
          {colors && (
            <div className="space-y-3">
              <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                color palette
              </h2>
              <Card>
                <CardContent>
                  <ColorPalette colors={colors} size="lg" showLabels />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Terminal preview with colors */}
          {colors && (
            <div className="space-y-3">
              <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                preview
              </h2>
              <Card className="overflow-hidden p-0" style={{ backgroundColor: colors.background ?? "#1a1a2e" }}>
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
              </Card>
            </div>
          )}

          {/* README */}
          {theme.readme_text && (
            <div className="space-y-3">
              <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                readme
              </h2>
              <Card>
                <CardContent>
                  <ReadmeContent
                    content={theme.readme_text}
                    owner={theme.github_owner}
                    repo={theme.github_repo}
                    branch={readmeBranch}
                    pathPrefix={readmePathPrefix}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="sticky top-20 space-y-6">
            {/* Theme info */}
            <Card>
              <CardHeader>
                <CardTitle className="font-mono">{theme.name}</CardTitle>
                {theme.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {theme.description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="space-y-4">
                {theme.stars > 0 && (
                  <Badge variant="secondary" className="font-mono gap-1.5">
                    <Star className="size-3" />
                    {theme.stars}
                  </Badge>
                )}

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
              </CardContent>
            </Card>

            {/* Overlay info — community theme enhancing a builtin */}
            {builtinBase && (
              <Card>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground uppercase tracking-wider">
                    <Layers className="size-3" />
                    enhances builtin
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    This theme overlays the builtin{" "}
                    <Link href={`/themes/${builtinBase.slug}`} className="text-foreground hover:underline">
                      {builtinBase.name}
                    </Link>
                    . Files it provides take precedence — anything missing falls back to the builtin.
                  </p>
                  {overlayVariants.length > 0 && (
                    <div className="border-t border-border/40 pt-3">
                      <p className="font-mono text-xs text-muted-foreground mb-2">other variants</p>
                      <div className="flex flex-wrap gap-1.5">
                        {overlayVariants.map((v) => (
                          <Link key={v.slug} href={`/themes/${v.slug}`}>
                            <Badge variant="outline" className="font-mono text-xs">
                              {v.name}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Community variants — builtin theme with overlay themes */}
            {theme.is_builtin === 1 && overlayVariants.length > 0 && (
              <Card>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground uppercase tracking-wider">
                    <Layers className="size-3" />
                    community variants
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    These community themes enhance this builtin with custom files.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {overlayVariants.map((v) => (
                      <Link key={v.slug} href={`/themes/${v.slug}`}>
                        <Badge variant="outline" className="font-mono text-xs">
                          {v.name}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Supported apps */}
            {apps.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                  supported apps
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {apps.sort().map((app) => (
                    <Badge key={app} variant="outline" className="font-mono text-xs">
                      {app}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Install */}
            <div className="space-y-2">
              <h2 className="font-mono text-xs text-muted-foreground uppercase tracking-wider">
                install
              </h2>
              <InstallCommand githubUrl={theme.github_url} />
            </div>

            {/* Extra scripts notice + review warning */}
            {theme.security_warnings && (() => {
              try {
                const warnings = JSON.parse(theme.security_warnings) as string[];
                if (warnings.length === 0) return null;
                const scriptFiles = warnings.filter(w => w.startsWith("suspicious file:"));
                const luaWarnings = warnings.filter(w => w.startsWith("dangerous lua"));
                if (scriptFiles.length === 0 && luaWarnings.length === 0) return null;
                return (
                  <div className="space-y-3">
                    {/* Positive: this theme has extras */}
                    {scriptFiles.length > 0 && (
                      <Card className="border-blue-500/20 bg-blue-500/5">
                        <CardContent className="space-y-2 text-sm">
                          <div className="font-mono text-xs text-blue-400 uppercase tracking-wider">
                            includes extras
                          </div>
                          <p className="text-muted-foreground leading-relaxed">
                            This theme includes {scriptFiles.length} optional script{scriptFiles.length > 1 ? "s" : ""} for
                            additional setup beyond the base theme.
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Warning: always review scripts before running */}
                    <Card className="border-yellow-500/30 bg-yellow-500/5">
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 font-mono text-xs text-yellow-500 uppercase tracking-wider">
                          <TriangleAlert className="size-3" />
                          review scripts before running
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          {luaWarnings.length > 0
                            ? "This theme contains code that could execute commands on your machine. "
                            : "Scripts don't run automatically on install, but always review them before running. "}
                          Check the{" "}
                          <a
                            href={theme.github_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground underline underline-offset-4 hover:text-foreground/80 transition-colors"
                          >
                            repo
                          </a>
                          {" "}first.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                );
              } catch {
                return null;
              }
            })()}

          </div>
        </aside>
      </div>
    </div>
  );
}
