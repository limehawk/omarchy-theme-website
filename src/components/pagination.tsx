"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  total: number;
  limit: number;
  currentPage: number;
}

export function Pagination({ total, limit, currentPage }: PaginationProps) {
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / limit);

  if (totalPages <= 1) return null;

  function buildHref(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page > 1) {
      params.set("page", String(page));
    } else {
      params.delete("page");
    }
    const qs = params.toString();
    return `/themes${qs ? `?${qs}` : ""}`;
  }

  return (
    <nav className="flex items-center justify-center gap-2 pt-8">
      {currentPage > 1 && (
        <Link
          href={buildHref(currentPage - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-border/50 px-3 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors"
        >
          <ChevronLeft className="size-3" />
          prev
        </Link>
      )}
      <span className="font-mono text-xs text-muted-foreground px-2">
        {currentPage} / {totalPages}
      </span>
      {currentPage < totalPages && (
        <Link
          href={buildHref(currentPage + 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-border/50 px-3 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors"
        >
          next
          <ChevronRight className="size-3" />
        </Link>
      )}
    </nav>
  );
}
