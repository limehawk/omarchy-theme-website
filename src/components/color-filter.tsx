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
        <button
          key={bucket}
          type="button"
          title={bucket}
          onClick={() => toggle(bucket)}
          className={cn(
            "size-4 rounded-full shrink-0 transition-all",
            value.includes(bucket)
              ? "ring-2 ring-foreground ring-offset-2 ring-offset-background scale-110"
              : "opacity-60 hover:opacity-100"
          )}
          style={{ backgroundColor: BUCKET_COLORS[bucket] }}
        />
      ))}
    </div>
  );
}
