"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { COLOR_BUCKETS, BUCKET_COLORS } from "@/lib/colors";

interface ColorFilterProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function ColorFilter({ value, onChange }: ColorFilterProps) {
  function toggle(bucket: string) {
    if (value.includes(bucket)) {
      onChange(value.filter((v) => v !== bucket));
    } else {
      onChange([...value, bucket]);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge
        variant={value.length === 0 ? "default" : "outline"}
        className="font-mono text-xs cursor-pointer"
        render={<button type="button" onClick={() => onChange([])} />}
      >
        all
      </Badge>
      {COLOR_BUCKETS.map((bucket) => (
        <Badge
          key={bucket}
          variant={value.includes(bucket) ? "default" : "outline"}
          className={cn("font-mono text-xs gap-1.5 cursor-pointer")}
          render={<button type="button" onClick={() => toggle(bucket)} />}
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
