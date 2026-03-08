"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { COLOR_BUCKETS, BUCKET_COLORS } from "@/lib/colors";

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
      <Badge
        variant={!activeColor ? "default" : "outline"}
        className="font-mono text-xs"
        render={<Link href={buildHref("")} />}
      >
        all
      </Badge>
      {COLOR_BUCKETS.map((bucket) => (
        <Badge
          key={bucket}
          variant={activeColor === bucket ? "default" : "outline"}
          className={cn("font-mono text-xs gap-1.5")}
          render={<Link href={buildHref(bucket)} />}
        >
          <span
            className="size-2.5 rounded-full shrink-0"
            style={{ backgroundColor: BUCKET_COLORS[bucket] }}
          />
          {bucket}
        </Badge>
      ))}
    </div>
  );
}
