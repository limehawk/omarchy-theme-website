import Link from "next/link";

function PaletteIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="currentColor" opacity="0.15" />
      <rect x="4" y="6" width="10" height="10" rx="2" fill="#22c55e" />
      <rect x="18" y="6" width="10" height="10" rx="2" fill="#a855f7" />
      <rect x="4" y="18" width="10" height="10" rx="2" fill="#3b82f6" />
      <rect x="18" y="18" width="10" height="10" rx="2" fill="#f97316" />
    </svg>
  );
}

export function Header() {
  return (
    <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-14">
        <Link
          href="/"
          className="flex items-center gap-2 font-mono text-sm tracking-tight text-foreground hover:text-foreground/80 transition-colors"
        >
          <PaletteIcon className="size-5" />
          <span className="font-semibold">omarchy themes</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/themes"
            className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            browse
          </Link>
          <a
            href="https://github.com/limehawk/omarchy-theme-website"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            github
          </a>
        </nav>
      </div>
    </header>
  );
}
