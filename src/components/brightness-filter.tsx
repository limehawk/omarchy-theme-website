"use client";

import { Badge } from "@/components/ui/badge";

const OPTIONS = [
  { value: "", label: "all" },
  { value: "dark", label: "dark" },
  { value: "light", label: "light" },
] as const;

interface BrightnessFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function BrightnessFilter({ value, onChange }: BrightnessFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {OPTIONS.map((o) => (
        <Badge
          key={o.value}
          variant={value === o.value ? "default" : "outline"}
          className="font-mono text-xs cursor-pointer"
          render={<button type="button" onClick={() => onChange(o.value)} />}
        >
          {o.label}
        </Badge>
      ))}
    </div>
  );
}
