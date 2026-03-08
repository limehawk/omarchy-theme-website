"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { COLOR_BUCKETS, BUCKET_COLORS } from "@/lib/colors";

interface ColorFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function ColorFilter({ value, onChange }: ColorFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        variant={!value ? "default" : "outline"}
        className="font-mono text-xs cursor-pointer"
        render={<button type="button" onClick={() => onChange("")} />}
      >
        all
      </Badge>
      {COLOR_BUCKETS.map((bucket) => (
        <Badge
          key={bucket}
          variant={value === bucket ? "default" : "outline"}
          className={cn("font-mono text-xs gap-1.5 cursor-pointer")}
          render={<button type="button" onClick={() => onChange(bucket)} />}
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
