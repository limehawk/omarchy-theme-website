"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";

const SOURCES = [
  { value: "", label: "all" },
  { value: "community", label: "community" },
  { value: "builtin", label: "builtin" },
] as const;

export function SourceFilter() {
  const searchParams = useSearchParams();
  const active = searchParams.get("source") ?? "";

  function buildHref(source: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (source) {
      params.set("source", source);
    } else {
      params.delete("source");
    }
    const qs = params.toString();
    return `/themes${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {SOURCES.map((s) => (
        <Badge
          key={s.value}
          variant={active === s.value ? "default" : "outline"}
          className="font-mono text-xs"
          render={<Link href={buildHref(s.value)} />}
        >
          {s.label}
        </Badge>
      ))}
    </div>
  );
}
