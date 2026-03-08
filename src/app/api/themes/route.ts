import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getThemes } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const color = searchParams.get("color") ?? undefined;
  const q = searchParams.get("q") ?? undefined;
  const sort =
    (searchParams.get("sort") as "popular" | "newest" | "stars") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = parseInt(searchParams.get("limit") ?? "12", 10);

  const { env } = await getCloudflareContext({ async: true });
  const db = env.DB as D1Database;

  const { themes, total } = await getThemes(db, {
    color,
    q,
    sort,
    page,
    limit,
  });

  return NextResponse.json({ themes, total, page, limit });
}
