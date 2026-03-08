"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get("q") ?? "");

  useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("q", value);
      } else {
        params.delete("q");
      }
      params.delete("page");
      const qs = params.toString();
      router.push(`/themes${qs ? `?${qs}` : ""}`);
    }, 300);

    return () => clearTimeout(timeout);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(e.target.value);
    },
    []
  );

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="search themes..."
        className="w-full rounded-lg border border-border/50 bg-card pl-9 pr-4 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10 transition-colors"
      />
    </div>
  );
}
