"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { COLOR_BUCKETS, type ColorBucket } from "@/lib/colors";

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

export function ColorFilter() {
  const searchParams = useSearchParams();
  const activeColor = searchParams.get("color") ?? "";

  function buildHref(color: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (color) {
      params.set("color", color);
    } else {
      params.delete("color");
    }
    params.delete("page");
    const qs = params.toString();
    return `/themes${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href={buildHref("")}
        className={cn(
          "rounded-full px-3 py-1 font-mono text-xs transition-colors border",
          !activeColor
            ? "border-foreground/30 bg-foreground/10 text-foreground"
            : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
        )}
      >
        all
      </Link>
      {COLOR_BUCKETS.map((bucket) => (
        <Link
          key={bucket}
          href={buildHref(bucket)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs transition-all border",
            activeColor === bucket
              ? "border-foreground/30 bg-foreground/10 text-foreground"
              : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
          )}
        >
          <span
            className="size-2.5 rounded-full shrink-0"
            style={{ backgroundColor: BUCKET_COLORS[bucket] }}
          />
          {bucket}
        </Link>
      ))}
    </div>
  );
}
