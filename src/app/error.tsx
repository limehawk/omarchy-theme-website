"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20 sm:py-32">
      <div className="max-w-lg space-y-6">
        <div className="font-mono text-sm text-muted-foreground space-y-1">
          <div>
            <span className="text-green-400/60">user@omarchy</span>
            <span className="text-muted-foreground">:</span>
            <span className="text-blue-400/60">~</span>
            <span className="text-muted-foreground"> $ </span>
            <span className="text-foreground">omarchy-theme-install</span>
          </div>
          <div className="text-red-400/80">
            Segmentation fault (core dumped)
          </div>
        </div>
        <h1 className="font-mono text-3xl font-bold tracking-tight text-foreground">
          something broke
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          An unexpected error occurred. This is on us, not you.
        </p>
        <div className="flex gap-3 pt-2">
          <Button className="font-mono" onClick={reset}>
            try again
          </Button>
          <Button
            variant="outline"
            className="font-mono"
            onClick={() => (window.location.href = "/")}
          >
            home
          </Button>
        </div>
      </div>
    </div>
  );
}
