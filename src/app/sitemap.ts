import type { MetadataRoute } from "next";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { COLOR_BUCKETS } from "@/lib/colors";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://omarchytheme.com";

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/themes`, changeFrequency: "daily", priority: 0.9 },
  ];

  const colorPages: MetadataRoute.Sitemap = COLOR_BUCKETS.map((color) => ({
    url: `${baseUrl}/colors/${color}`,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const { env } = await getCloudflareContext({ async: true });
  const db = env.DB as D1Database;
  const result = await db
    .prepare("SELECT slug, updated_at FROM themes")
    .all<{ slug: string; updated_at: string }>();

  const themePages: MetadataRoute.Sitemap = result.results.map((theme) => ({
    url: `${baseUrl}/themes/${theme.slug}`,
    lastModified: theme.updated_at,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...colorPages, ...themePages];
}
