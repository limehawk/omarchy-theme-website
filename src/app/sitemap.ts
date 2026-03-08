import type { MetadataRoute } from "next";
import { getAllThemes } from "@/lib/db";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://omarchytheme.com";

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "weekly", priority: 1.0 },
    { url: `${baseUrl}/themes`, changeFrequency: "daily", priority: 0.9 },
  ];

  const themePages: MetadataRoute.Sitemap = getAllThemes().map((theme) => ({
    url: `${baseUrl}/themes/${theme.slug}`,
    lastModified: theme.updated_at,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...themePages];
}
