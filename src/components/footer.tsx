import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/50 mt-auto">
      <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-mono text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              omarchy themes
            </Link>
          </p>
          <a
            href="https://limehawk.io"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="text-xs uppercase tracking-[0.3em] font-thin">A</span>
            <span
              className="text-2xl text-green-500 group-hover:text-green-400 transition-colors"
              style={{ fontFamily: "var(--font-workbench)" }}
            >
              LIMEHAWK
            </span>
            <span className="text-xs uppercase tracking-[0.3em] font-thin">Product</span>
          </a>
          <div className="flex items-center gap-6">
            <a
              href="https://omarchy.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              omarchy
            </a>
            <a
              href="https://github.com/limehawk/omarchy-theme-website/issues/new?template=submit-theme.yml"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              contribute a theme
            </a>
          </div>
        </div>
        <p className="text-center text-[10px] text-muted-foreground/60 leading-relaxed">
          This is an independent community site, not affiliated with or endorsed by the Omarchy project, 37signals, Hyprland, or Arch Linux. All trademarks belong to their respective owners.
        </p>
      </div>
    </footer>
  );
}
