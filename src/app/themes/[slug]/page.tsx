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

  interface TerminalStyle {
    source?: string;
    background_opacity?: number;
    padding?: number;
    font_family?: string;
    cursor_style?: "block" | "beam" | "underline";
    rounding?: number;
  }
  const termStyle: TerminalStyle | null = theme.terminal_style_json
    ? JSON.parse(theme.terminal_style_json)
    : null;

  function hexToRgba(hex: string, alpha: number): string {
    const h = hex.replace(/^#/, "");
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const bgHex = colors?.background ?? "#1a1a2e";
  const opacity = termStyle?.background_opacity ?? 1;
  const cardBg = opacity < 1 ? hexToRgba(bgHex, opacity) : bgHex;
  const cardRadius = termStyle?.rounding;
  const innerPadding = termStyle?.padding;
  const termFont = termStyle?.font_family;
  const cursorStyle = termStyle?.cursor_style ?? "block";

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
              <Card
                className="overflow-hidden p-0"
                style={{
                  backgroundColor: cardBg,
                  borderRadius: cardRadius !== undefined ? `${cardRadius}px` : undefined,
                  fontFamily: termFont
                    ? `"${termFont}", "JetBrains Mono", "Fira Code", "Hack", monospace`
                    : undefined,
                  backdropFilter: opacity < 1 ? "blur(8px)" : undefined,
                }}
              >
                <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5">
                  <span className="size-2.5 rounded-full bg-red-500/70" />
                  <span className="size-2.5 rounded-full bg-yellow-500/70" />
                  <span className="size-2.5 rounded-full bg-green-500/70" />
                  <span className="ml-2 font-mono text-[10px]" style={{ color: colors.foreground ?? "#ccc" }}>
                    ~/{theme.slug}
                  </span>
                </div>
                <div
                  className="text-[11px] leading-tight overflow-hidden"
                  style={{
                    color: colors.foreground ?? "#ccc",
                    padding: innerPadding !== undefined ? `${innerPadding}px` : "20px",
                    fontFamily: `${termFont ? `"${termFont}", ` : ""}var(--font-jetbrains-mono), "Symbols Nerd Font", monospace`,
                  }}
                >
                  <div className="flex gap-6 items-start">
                    <pre
                      className="text-[8px] leading-[1.05] whitespace-pre select-none shrink-0"
                      style={{ color: colors.color2 ?? "#50fa7b" }}
                      aria-hidden
                    >
{`██████████████████████████████████████████████████████
██████████████████████████████████████████████████████
████                     ████                     ████
████                     ████                     ████
████    █████████████████████         ████████    ████
████    █████████████████████         ████████    ████
████    ████                              ████    ████
████    ████                              ████    ████
████    ████                              ████    ████
████    ████                              ████    ████
████    ████                              ████    ████
████    ████                              ████    ████
████████████                              ████    ████
████████████                              ████    ████
████    ████                              ████    ████
████    ████                              ████    ████
████    ████                              ████    ████
████    ████                              ████    ████
████    ████                              ████    ████
████    ████                              ████    ████
████    ██████████████████████████████████████    ████
████    ██████████████████████████████████████    ████
████                     ████                     ████
████                     ████                     ████
█████████████████████████████     ████████████████████
█████████████████████████████     ████████████████████`}
                    </pre>

                    <div className="whitespace-pre">
                      {(() => {
                        const dim = colors.color8 ?? "#666";
                        const green = colors.color2 ?? "#50fa7b";
                        const blue = colors.color4 ?? "#6272a4";
                        const magenta = colors.color5 ?? "#ff79c6";

                        const HW_TOP = "┌──────────────────────Hardware──────────────────────┐";
                        const SW_TOP = "┌──────────────────────Software──────────────────────┐";
                        const AU_TOP = "┌─────────────────Age / Uptime / Update───────────────┐";
                        const BOT = "└────────────────────────────────────────────────────┘";

                        const Row = ({ keyText, color, children }: { keyText: string; color: string; children: React.ReactNode }) => (
                          <div>
                            <span style={{ color }}>{keyText}</span>
                            <span>: </span>
                            {children}
                          </div>
                        );

                        const dotColors = ["color8", "color7", "color6", "color5", "color4", "color3", "color2", "color1"];
                        const termName = termStyle?.source === "ghostty.conf" ? "ghostty" : termStyle?.source === "kitty.conf" ? "kitty" : termStyle?.source === "alacritty.toml" ? "alacritty" : "ghostty";
                        const fontDisplay = termFont ? `${termFont} (9pt)` : "JetBrainsMono Nerd Font (9pt)";

                        return (
                          <>
                            <div style={{ color: dim }}>{HW_TOP}</div>
                            <Row keyText=" PC" color={green}>omarchy-host</Row>
                            <Row keyText="│ ├" color={green}>x86_64 (8 cores) @ 4.00 GHz</Row>
                            <Row keyText="│ ├" color={green}>Integrated Graphics</Row>
                            <Row keyText={"│ ├" + String.fromCodePoint(0xf1104)} color={green}>1920x1080 @ 60 Hz</Row>
                            <Row keyText={"│ ├" + String.fromCodePoint(0xf02ca)} color={green}>120 / 500 GiB (24%)</Row>
                            <Row keyText="│ ├" color={green}>8 / 16 GiB (50%)</Row>
                            <Row keyText={"└ └" + String.fromCodePoint(0xf04e1) + " "} color={green}>0 / 4 GiB (0%)</Row>
                            <div style={{ color: dim }}>{BOT}</div>

                            <div className="h-3" />

                            <div style={{ color: dim }}>{SW_TOP}</div>
                            <Row keyText=" OS" color={blue}>Omarchy 3.6.0</Row>
                            <Row keyText={"│ ├" + String.fromCodePoint(0xf062c)} color={blue}>master</Row>
                            <Row keyText={"│ ├" + String.fromCodePoint(0xf052b)} color={blue}>stable</Row>
                            <Row keyText="│ ├" color={blue}>linux-arch</Row>
                            <Row keyText="│ ├" color={blue}>Hyprland (Wayland)</Row>
                            <Row keyText="│ ├" color={blue}>{termName}</Row>
                            <Row keyText={"│ ├" + String.fromCodePoint(0xf03d6)} color={blue}>1024 (pacman)</Row>
                            <Row keyText={"│ ├" + String.fromCodePoint(0xf0e0c)} color={blue}>
                              {theme.name + " "}
                              {dotColors.map((k) => (
                                <span key={k} style={{ color: colors[k] ?? "#888" }}>●</span>
                              ))}
                            </Row>
                            <Row keyText="└ └" color={blue}>{fontDisplay}</Row>
                            <div style={{ color: dim }}>{BOT}</div>

                            <div className="h-3" />

                            <div style={{ color: dim }}>{AU_TOP}</div>
                            <Row keyText={String.fromCodePoint(0xf179f) + " OS Age"} color={magenta}>0 days</Row>
                            <Row keyText={String.fromCodePoint(0xf1bd0) + " Uptime"} color={magenta}>2 hours, 13 mins</Row>
                            <Row keyText=" Update" color={magenta}>Today</Row>
                            <div style={{ color: dim }}>{BOT}</div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="pt-4">
                    <span style={{ color: colors.color2 ?? colors.accent ?? "#50fa7b" }}>user@omarchy</span>
                    <span>:</span>
                    <span style={{ color: colors.color4 ?? "#6272a4" }}>~</span>
                    <span> $ </span>
                    <span
                      className="inline-block align-middle animate-pulse"
                      style={{
                        backgroundColor: colors.cursor ?? colors.accent ?? "#4a9eff",
                        width: cursorStyle === "beam" ? "1px" : "8px",
                        height: cursorStyle === "underline" ? "2px" : "16px",
                        verticalAlign: cursorStyle === "underline" ? "bottom" : "middle",
                      }}
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

            {/* Extra scripts + review warning */}
            {theme.security_warnings && (() => {
              try {
                const warnings = JSON.parse(theme.security_warnings) as string[];
                if (warnings.length === 0) return null;
                const scripts = warnings
                  .filter(w => w.startsWith("suspicious file:"))
                  .map(w => w.replace("suspicious file: ", ""));
                const extensions = warnings
                  .filter(w => w.startsWith("vscode.json installs extension:"))
                  .map(w => w.replace("vscode.json installs extension: ", ""));
                const hasDangerousLua = warnings.some(w => w.startsWith("dangerous lua"));
                if (scripts.length === 0 && extensions.length === 0 && !hasDangerousLua) return null;
                const repoBase = `${theme.github_url}/blob/${theme.default_branch}`;
                return (
                  <div className="space-y-3">
                    {scripts.length > 0 && (
                      <Card className="border-blue-500/20 bg-blue-500/5">
                        <CardContent className="space-y-3 text-sm">
                          <div className="font-mono text-xs text-blue-400 uppercase tracking-wider">
                            includes extras
                          </div>
                          <p className="text-muted-foreground leading-relaxed">
                            This theme ships optional scripts for additional setup.
                          </p>
                          <ul className="space-y-1">
                            {scripts.map((file) => (
                              <li key={file}>
                                <a
                                  href={`${repoBase}/${file}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-xs text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-4 decoration-blue-400/30"
                                >
                                  {file}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    {extensions.length > 0 && (
                      <Card className="border-blue-500/20 bg-blue-500/5">
                        <CardContent className="space-y-3 text-sm">
                          <div className="font-mono text-xs text-blue-400 uppercase tracking-wider">
                            installs vscode extension
                          </div>
                          <p className="text-muted-foreground leading-relaxed">
                            Installing this theme will install the following VS Code extension:
                          </p>
                          <ul className="space-y-1">
                            {extensions.map((ext) => (
                              <li key={ext}>
                                <a
                                  href={`https://marketplace.visualstudio.com/items?itemName=${encodeURIComponent(ext)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-xs text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-4 decoration-blue-400/30"
                                >
                                  {ext}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    <Card className="border-yellow-500/30 bg-yellow-500/5">
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 font-mono text-xs text-yellow-500 uppercase tracking-wider">
                          <TriangleAlert className="size-3" />
                          heads up
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          {hasDangerousLua
                            ? "This theme includes code that can run commands on your machine. Review it before installing."
                            : "Never run scripts from the internet without reading them first. Community themes are not audited and may contain anything. You are responsible for what you execute on your machine."}
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
