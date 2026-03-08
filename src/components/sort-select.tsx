"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export function SortSelect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get("sort") ?? "popular";

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("sort", e.target.value);
      params.delete("page");
      const qs = params.toString();
      router.push(`/themes${qs ? `?${qs}` : ""}`);
    },
    [router, searchParams]
  );

  return (
    <select
      value={current}
      onChange={handleChange}
      className="rounded-lg border border-border/50 bg-card px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-foreground/30 transition-colors cursor-pointer"
    >
      <option value="popular">popular</option>
      <option value="newest">newest</option>
      <option value="stars">stars</option>
    </select>
  );
}
