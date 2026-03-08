"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";

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
      className="h-8 min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 font-mono text-xs text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 cursor-pointer dark:bg-input/30"
    >
      <option value="popular">popular</option>
      <option value="newest">newest</option>
      <option value="stars">stars</option>
    </select>
  );
}
