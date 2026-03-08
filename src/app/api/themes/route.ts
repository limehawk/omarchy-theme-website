import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getThemes, parseThemeFilters } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const options = parseThemeFilters({
    color: searchParams.get("color"),
    q: searchParams.get("q"),
    sort: searchParams.get("sort"),
    source: searchParams.get("source"),
    page: searchParams.get("page"),
    limit: searchParams.get("limit"),
  });

  const { env } = await getCloudflareContext({ async: true });
  const db = env.DB as D1Database;

  const { themes, total } = await getThemes(db, options);

  return NextResponse.json({ themes, total, page: options.page, limit: options.limit });
}
