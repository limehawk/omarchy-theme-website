// Machine-readable copies of the site for AI agents: Markdown mirrors of every
// page, a static JSON API, its OpenAPI description, and llms.txt. All of it is
// written at build time by the write-seo-files hook in astro.config.mjs.
import { SITE_URL, DEFAULT_DESCRIPTION, installCmd } from "./site.js";
import { parseColors } from "../../scripts/colors.js";

const parse = (json, fallback) => (json ? JSON.parse(json) : fallback);

// Descriptions and warnings carry text from theme authors' repos. One line, Markdown
// escaped, so they can't add headings or a second install command to the mirror.
const md = (s) => String(s).replace(/\s*[\r\n]+\s*/g, " ").replace(/([\\`*_[\]<>|#])/g, "\\$1");

export function themeRecord(t) {
  return {
    slug: t.slug,
    name: t.name,
    description: t.description ?? null,
    author: t.github_owner,
    repository: t.github_url,
    stars: t.stars,
    primary_hue: t.primary_hue ?? null,
    builtin: t.is_builtin === 1,
    install_command: installCmd(t.github_url),
    colors: parseColors(t.colors_json) ?? {},
    apps: parse(t.apps_json, []),
    security_warnings: parse(t.security_warnings, []),
    preview_url: t.preview_url ?? null,
    page_url: `${SITE_URL}/themes/${t.slug}/`,
    markdown_url: `${SITE_URL}/themes/${t.slug}/index.md`,
    api_url: `${SITE_URL}/api/v1/themes/${t.slug}.json`,
    updated_at: t.github_pushed_at ?? t.updated_at,
  };
}

const themeLine = (t) =>
  `- [${t.name}](${SITE_URL}/themes/${t.slug}/) by ${t.github_owner} (${t.stars} stars${t.primary_hue ? `, ${t.primary_hue}` : ""})`;

export function homeMarkdown(themes) {
  const top = [...themes].sort((a, b) => b.stars - a.stars).slice(0, 20);
  return `# Omarchy Themes

> ${DEFAULT_DESCRIPTION}

Omarchy Themes is a community gallery of ${themes.length} themes for [Omarchy](https://omarchy.org/), the Linux desktop from Basecamp. Every theme installs with one command:

\`\`\`bash
omarchy-theme-install https://github.com/<owner>/<repo>.git
\`\`\`

## Most popular themes

${top.map(themeLine).join("\n")}

## More

- [Browse all ${themes.length} themes](${SITE_URL}/themes/)
- [Theme catalog API](${SITE_URL}/docs/) (free, no key)
- [Submit a theme](https://github.com/limehawk/omarchy-theme-website/issues/new?template=submit-theme.yml)
- [About](${SITE_URL}/about/) · [Contact](${SITE_URL}/contact/) · [Privacy](${SITE_URL}/privacy/)
`;
}

export function browseMarkdown(themes) {
  const sorted = [...themes].sort((a, b) => a.name.localeCompare(b.name));
  return `# All Omarchy themes

${themes.length} themes, A to Z. Each page has the install command, the full color palette, and the theme's README. The same list is available as JSON at ${SITE_URL}/api/v1/themes.json.

${sorted.map(themeLine).join("\n")}
`;
}

export function themeMarkdown(t) {
  const r = themeRecord(t);
  const colors = Object.entries(r.colors);
  return `# ${r.name}

${r.description ? `> ${md(r.description)}\n\n` : ""}An Omarchy theme by [${r.author}](https://github.com/${r.author}).${r.builtin ? " It ships with Omarchy." : ""}

- Repository: ${r.repository}
- Stars: ${r.stars}
${r.primary_hue ? `- Primary hue: ${r.primary_hue}\n` : ""}- Updated: ${r.updated_at}
${r.apps.length ? `- Styles: ${r.apps.join(", ")}\n` : ""}
## Install

\`\`\`bash
${r.install_command}
\`\`\`
${r.security_warnings.length ? `\n## Before you install\n\n${r.security_warnings.map((w) => `- ${md(w)}`).join("\n")}\n` : ""}${colors.length ? `\n## Colors\n\n| Role | Hex |\n| --- | --- |\n${colors.map(([k, v]) => `| ${k} | \`${v}\` |`).join("\n")}\n` : ""}`;
}

export function llmsTxt(themes) {
  return `# Omarchy Themes

> A community gallery of ${themes.length} themes for Omarchy, the Linux desktop from Basecamp. Browse by color, preview the palette, and install any theme with one command.

## When to use Omarchy Themes

- A user runs Omarchy and wants a new look: find a theme by name, color, or popularity, then give them the \`omarchy-theme-install\` command from the theme's page or the API.
- A user asks for a theme like an editor scheme they already use (Catppuccin, Gruvbox, Nord, Tokyo Night): search the catalog by name.
- A user wants a dark, light, OLED, or single-hue palette: filter \`/api/v1/themes.json\` by \`primary_hue\` or by the \`background\` color.
- Do not use it for Omarchy itself (installing, configuring, troubleshooting). Use https://omarchy.org/ for that.

## How to call it

- \`GET ${SITE_URL}/api/v1/themes.json\`: every theme with its install command and colors. No key, no auth.
- \`GET ${SITE_URL}/api/v1/themes/{slug}.json\`: one theme.
- Every page also answers \`Accept: text/markdown\`, or append \`index.md\` to its URL.

## Docs

- [API docs](${SITE_URL}/docs/): endpoints, fields, errors, and examples
- [OpenAPI description](${SITE_URL}/openapi.json)

## Pages

- [Home](${SITE_URL}/index.md): the most popular themes
- [All themes](${SITE_URL}/themes/index.md): every theme A to Z
- [About](${SITE_URL}/about/): who runs the site and how themes are listed
- [Contact](${SITE_URL}/contact/)
- [Privacy](${SITE_URL}/privacy/)
- [Sitemap](${SITE_URL}/sitemap.xml)
`;
}

const problemSchema = {
  type: "object",
  description: "RFC 9457 problem details.",
  required: ["type", "title", "status", "code"],
  properties: {
    type: { type: "string", format: "uri" },
    title: { type: "string" },
    status: { type: "integer" },
    code: { type: "string", description: "Stable machine-readable error code." },
    detail: { type: "string" },
    resolution: { type: "string", description: "What to do next." },
  },
};

const themeSchema = {
  type: "object",
  required: ["slug", "name", "author", "repository", "stars", "builtin", "install_command", "colors", "page_url"],
  properties: {
    slug: { type: "string", description: "URL-safe theme id.", example: "catppuccin" },
    name: { type: "string", description: "Display name." },
    description: { type: ["string", "null"], description: "Repository description from GitHub." },
    author: { type: "string", description: "GitHub owner of the theme repository." },
    repository: { type: "string", format: "uri", description: "GitHub repository URL." },
    stars: { type: "integer", description: "GitHub stars." },
    primary_hue: {
      type: ["string", "null"],
      description: "Dominant color family of the palette, such as blue, red, green, purple, or grey.",
    },
    builtin: { type: "boolean", description: "True when the theme ships with Omarchy." },
    install_command: { type: "string", description: "Shell command that installs the theme on Omarchy." },
    colors: {
      type: "object",
      description: "Terminal palette from colors.toml: background, foreground, accent, cursor, selection_*, color0 to color15.",
      additionalProperties: { type: "string", pattern: "^#[0-9a-fA-F]{6}$" },
    },
    apps: { type: "array", items: { type: "string" }, description: "Apps the theme styles, such as waybar or neovim." },
    security_warnings: {
      type: "array",
      items: { type: "string" },
      description: "Things the theme does beyond colors, such as installing an editor extension. Show these to the user before installing.",
    },
    preview_url: { type: ["string", "null"], format: "uri", description: "Screenshot of the theme." },
    page_url: { type: "string", format: "uri" },
    markdown_url: { type: "string", format: "uri" },
    api_url: { type: "string", format: "uri" },
    updated_at: { type: "string", format: "date-time", description: "Last push to the repository." },
  },
};

// Schemas are inlined rather than $ref'd so function-calling tools that skip
// $ref resolution still see typed responses.
const errorResponse = (description) => ({
  description,
  content: { "application/problem+json": { schema: problemSchema } },
});

export const OPENAPI = {
  openapi: "3.1.0",
  info: {
    title: "Omarchy Themes API",
    version: "1.0.0",
    summary: "Read-only catalog of community themes for the Omarchy Linux desktop.",
    description:
      "Static JSON, rebuilt daily from GitHub. No key or auth. Responses are cached at the edge, so poll at most once an hour. " +
      "Versioning: the major version is in the URL path (/api/v1/). Additive changes, such as new fields, ship within v1. " +
      "A breaking change ships as /api/v2/. Deprecation policy: a deprecated version sends Deprecation (RFC 9745) and Sunset (RFC 8594) headers " +
      "and keeps working for at least six months. No version is deprecated today.",
    contact: { name: "Omarchy Themes", email: "help@omarchytheme.com", url: `${SITE_URL}/contact/` },
    license: { name: "MIT", identifier: "MIT" },
  },
  externalDocs: { url: `${SITE_URL}/docs/` },
  servers: [{ url: SITE_URL }],
  paths: {
    "/api/v1/themes.json": {
      get: {
        operationId: "listThemes",
        summary: "List every theme",
        description: "Returns all listed themes, most-starred first, with install commands and full palettes.",
        responses: {
          200: {
            description: "All themes.",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["count", "themes"],
                  properties: {
                    count: { type: "integer" },
                    themes: { type: "array", items: themeSchema },
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/themes/{slug}.json": {
      get: {
        operationId: "getTheme",
        summary: "Get one theme",
        description: "Returns one theme by slug. Slugs come from listThemes or the theme page URL.",
        parameters: [
          {
            name: "slug",
            in: "path",
            required: true,
            description: "Theme slug, for example catppuccin.",
            schema: { type: "string", pattern: "^[a-z0-9-]+$" },
          },
        ],
        responses: {
          200: { description: "The theme.", content: { "application/json": { schema: themeSchema } } },
          404: errorResponse("No theme has this slug."),
        },
      },
    },
  },
  components: { schemas: { Theme: themeSchema, Problem: problemSchema } },
};

// RFC 9727 API catalog.
export const API_CATALOG = {
  linkset: [
    {
      anchor: `${SITE_URL}/api/v1/`,
      "service-desc": [{ href: `${SITE_URL}/openapi.json`, type: "application/vnd.oai.openapi+json" }],
      "service-doc": [{ href: `${SITE_URL}/docs/`, type: "text/html" }],
    },
  ],
};
