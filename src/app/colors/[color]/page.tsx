export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getThemes } from "@/lib/db";
import { COLOR_BUCKETS, BUCKET_COLORS, type ColorBucket } from "@/lib/colors";
import { ThemeGrid } from "@/components/theme-grid";

interface Props {
  params: Promise<{ color: string }>;
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { color } = await params;
  const capitalized = color.charAt(0).toUpperCase() + color.slice(1);

  return {
    title: `${capitalized} Themes`,
    description: `Browse Omarchy terminal color schemes with ${color} tones.`,
  };
}

export default async function ColorPage({ params }: Props) {
  const { color } = await params;

  if (!COLOR_BUCKETS.includes(color as ColorBucket)) {
    notFound();
  }

  const bucket = color as ColorBucket;
  const { env } = await getCloudflareContext({ async: true });
  const db = env.DB as D1Database;
  const { themes, total } = await getThemes(db, {
    color: bucket,
    sort: "stars",
    limit: 50,
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="space-y-8">
        {/* Header */}
        <div>
          <nav className="mb-4">
            <ol className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <li>
                <Link
                  href="/themes"
                  className="hover:text-foreground transition-colors"
                >
                  themes
                </Link>
              </li>
              <li>/</li>
              <li className="text-foreground">{bucket}</li>
            </ol>
          </nav>
          <div className="flex items-center gap-3">
            <span
              className="size-4 rounded-full"
              style={{ backgroundColor: BUCKET_COLORS[bucket] }}
            />
            <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground">
              {bucket} themes
            </h1>
          </div>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {total} theme{total !== 1 ? "s" : ""} with {bucket} tones
          </p>
        </div>

        {/* Grid */}
        <ThemeGrid themes={themes} />
      </div>
    </div>
  );
}
