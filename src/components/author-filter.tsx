"use client";

import { useState, useRef, useEffect } from "react";
import { User, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface AuthorFilterProps {
  authors: string[];
  value: string;
  onChange: (value: string) => void;
}

export function AuthorFilter({ authors, value, onChange }: AuthorFilterProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (value) {
    return (
      <Badge
        variant="default"
        className="font-mono text-xs cursor-pointer gap-1"
        render={
          <button
            type="button"
            onClick={() => {
              onChange("");
              setQuery("");
            }}
          />
        }
      >
        {value}
        <X className="size-3" />
      </Badge>
    );
  }

  const lower = query.toLowerCase();
  const filtered = query
    ? authors.filter((a) => a.toLowerCase().includes(lower)).slice(0, 8)
    : [];

  return (
    <div ref={containerRef} className="relative">
      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => query && setOpen(true)}
        placeholder="filter by author..."
        className="pl-9 font-mono text-sm w-48"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
          {filtered.map((author) => (
            <button
              key={author}
              type="button"
              className="w-full px-3 py-1.5 text-left font-mono text-sm text-popover-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                onChange(author);
                setQuery("");
                setOpen(false);
              }}
            >
              {author}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
