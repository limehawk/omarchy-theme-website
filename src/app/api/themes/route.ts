import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getThemes } from "@/lib/db";

const VALID_SORTS = new Set(["newest", "stars", "name"]);
const VALID_SOURCES = new Set(["all", "community", "builtin"]);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const color = searchParams.get("color") ?? undefined;
  const q = searchParams.get("q")?.slice(0, 100) ?? undefined;
  const sortParam = searchParams.get("sort");
  const sort = (sortParam && VALID_SORTS.has(sortParam) ? sortParam : "stars") as "newest" | "stars" | "name";
  const sourceParam = searchParams.get("source");
  const source = (sourceParam && VALID_SOURCES.has(sourceParam) ? sourceParam : "all") as "all" | "community" | "builtin";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(300, Math.max(1, parseInt(searchParams.get("limit") ?? "12", 10) || 12));

  const { env } = await getCloudflareContext({ async: true });
  const db = env.DB as D1Database;

  const { themes, total } = await getThemes(db, {
    color,
    q,
    sort,
    source,
    page,
    limit,
  });

  return NextResponse.json({ themes, total, page, limit });
}
