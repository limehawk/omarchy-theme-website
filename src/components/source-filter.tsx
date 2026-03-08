"use client";

import { Badge } from "@/components/ui/badge";

const SOURCES = [
  { value: "all", label: "all" },
  { value: "community", label: "community" },
  { value: "builtin", label: "builtin" },
] as const;

interface SourceFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function SourceFilter({ value, onChange }: SourceFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {SOURCES.map((s) => (
        <Badge
          key={s.value}
          variant={value === s.value ? "default" : "outline"}
          className="font-mono text-xs cursor-pointer"
          render={<button type="button" onClick={() => onChange(s.value)} />}
        >
          {s.label}
        </Badge>
      ))}
    </div>
  );
}
