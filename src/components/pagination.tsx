"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        <Button variant="outline" size="sm" className="font-mono text-xs" render={<Link href={buildHref(currentPage - 1)} />}>
          <ChevronLeft className="size-3" />
          prev
        </Button>
      )}
      <span className="font-mono text-xs text-muted-foreground px-2">
        {currentPage} / {totalPages}
      </span>
      {currentPage < totalPages && (
        <Button variant="outline" size="sm" className="font-mono text-xs" render={<Link href={buildHref(currentPage + 1)} />}>
          next
          <ChevronRight className="size-3" />
        </Button>
      )}
    </nav>
  );
}
