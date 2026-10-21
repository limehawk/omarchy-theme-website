export const SITE_URL = "https://omarchytheme.com";

export const DEFAULT_DESCRIPTION =
  "Discover, preview, and install terminal color schemes for the Omarchy Linux desktop environment. One-command installation for curated themes.";

export const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "Omarchy Themes",
      url: `${SITE_URL}/`,
      description: DEFAULT_DESCRIPTION,
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "Limehawk",
      description: "IT company in Knoxville, Tennessee that builds and runs Omarchy Themes, a free community gallery of Omarchy desktop themes.",
      url: "https://limehawk.io",
      email: "help@omarchytheme.com",
      sameAs: ["https://github.com/limehawk"],
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "help@omarchytheme.com",
        url: `${SITE_URL}/contact/`,
        availableLanguage: "en",
      },
      address: {
        "@type": "PostalAddress",
        addressLocality: "Knoxville",
        addressRegion: "TN",
        addressCountry: "US",
      },
    },
  ],
};

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

// Markdown pages in src/pages, also served raw as their own Markdown mirrors.
export const PROSE_PAGES = ["about", "contact", "privacy", "docs"];

export function sitemapXml(themes) {
  const urls = [
    { loc: `${SITE_URL}/`, changefreq: "weekly", priority: "1.0" },
    { loc: `${SITE_URL}/themes/`, changefreq: "daily", priority: "0.9" },
    ...PROSE_PAGES.map((p) => ({ loc: `${SITE_URL}/${p}/`, changefreq: "monthly", priority: "0.5" })),
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
${u.lastmod ? `  <lastmod>${u.lastmod}</lastmod>\n` : ""}  <changefreq>${u.changefreq}</changefreq>
  <priority>${u.priority}</priority>
</url>`).join("\n")}
</urlset>`;
}
