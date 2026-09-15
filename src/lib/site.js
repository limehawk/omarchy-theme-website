export const SITE_URL = "https://omarchytheme.com";

export const DEFAULT_DESCRIPTION =
  "Discover, preview, and install terminal color schemes for the Omarchy Linux desktop environment. One-command installation for curated themes.";

export const ROBOTS_TXT = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

export function pageTitle(title) {
  return title === "home"
    ? "Omarchy Themes — Browse & Install Terminal Color Schemes"
    : `${title} | Omarchy Themes`;
}

export function canonicalUrl(path) {
  return `${SITE_URL}${path}`;
}

export function installCmd(githubUrl) {
  const gitUrl = githubUrl.endsWith(".git") ? githubUrl : `${githubUrl}.git`;
  return `omarchy-theme-install ${gitUrl}`;
}

export function sitemapXml(themes) {
  const urls = [
    { loc: `${SITE_URL}/`, changefreq: "weekly", priority: "1.0" },
    { loc: `${SITE_URL}/themes/`, changefreq: "daily", priority: "0.9" },
    ...themes.map((t) => ({
      loc: `${SITE_URL}/themes/${t.slug}/`,
      lastmod: t.updated_at,
      changefreq: "weekly",
      priority: "0.8",
    })),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url>
  <loc>${u.loc}</loc>
  ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}
  <changefreq>${u.changefreq}</changefreq>
  <priority>${u.priority}</priority>
</url>`).join("\n")}
</urlset>`;
}
