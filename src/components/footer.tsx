import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border/50 mt-auto">
      <div className="mx-auto max-w-6xl px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="font-mono text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            omarchy themes
          </Link>
        </p>
        <div className="flex items-center gap-6">
          <a
            href="https://github.com/basecamp/omarchy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            omarchy
          </a>
          <a
            href="https://github.com/basecamp/omarchy/blob/main/CONTRIBUTING.md"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            contribute a theme
          </a>
        </div>
      </div>
    </footer>
  );
}
