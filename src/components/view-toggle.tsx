"use client";

import { Badge } from "@/components/ui/badge";

const VIEWS = [
  { value: "", label: "screenshots" },
  { value: "terminal", label: "terminal" },
] as const;

interface ViewToggleProps {
  value: string;
  onChange: (value: string) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {VIEWS.map((v) => (
        <Badge
          key={v.value}
          variant={value === v.value ? "default" : "outline"}
          className="font-mono text-xs cursor-pointer"
          render={<button type="button" onClick={() => onChange(v.value)} />}
        >
          {v.label}
        </Badge>
      ))}
    </div>
  );
}
