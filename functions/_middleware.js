// Cloudflare Pages middleware for agents:
// - Accept: text/markdown on a page returns its index.md mirror, and a
//   Markdown body on a 404.
// - /api/v1/themes.json takes q, hue, and limit filters.
// - API errors are RFC 9457 JSON instead of the HTML 404 page.
const MARKDOWN = /\btext\/markdown\b/i;
const LIST = "/api/v1/themes.json";
const API_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "RateLimit-Policy": '"fair-use";q=60;w=60',
  "X-RateLimit-Limit": "60",
};

const NOT_FOUND_MD = `# Not found

There is no page at this address. The theme may have been removed, or the URL is wrong.

- [Browse all themes](https://omarchytheme.com/themes/index.md)
- [Home](https://omarchytheme.com/index.md)
- [Theme API](https://omarchytheme.com/docs/index.md)
`;

const markdown = (body, status = 200) =>
  new Response(body, {
    status,
    headers: { "Content-Type": "text/markdown; charset=utf-8", "Vary": "Accept", "Cache-Control": "public, max-age=3600" },
  });

const problem = (status, code, title, detail, resolution) =>
  Response.json(
    { type: "https://omarchytheme.com/docs/#errors", title, status, code, detail, resolution },
    { status, headers: { "Content-Type": "application/problem+json", ...API_HEADERS } },
  );

async function listThemes(url, env) {
  const p = url.searchParams;
  const q = (p.get("q") ?? "").trim().toLowerCase();
  const hue = (p.get("hue") ?? "").trim().toLowerCase();
  const limit = p.has("limit") ? Number(p.get("limit")) : Infinity;
  if (limit !== Infinity && !(Number.isInteger(limit) && limit >= 1 && limit <= 500)) {
    return problem(400, "invalid_limit", "Invalid limit", `limit must be a whole number from 1 to 500, got "${p.get("limit")}".`, "Pass a limit from 1 to 500, or leave it out.");
  }
  const all = await (await env.ASSETS.fetch(new URL(LIST, url))).json();
  const themes = all.themes
    .filter((t) => !q || [t.name, t.slug, t.author].some((s) => s.toLowerCase().includes(q)))
    .filter((t) => !hue || t.primary_hue === hue)
    .slice(0, limit);
  return Response.json({ count: themes.length, themes }, { headers: { ...API_HEADERS, "Cache-Control": "public, max-age=3600" } });
}

export async function onRequest({ request, next, env }) {
  const url = new URL(request.url);
  const wantsMarkdown = MARKDOWN.test(request.headers.get("Accept") ?? "");

  if (wantsMarkdown && url.pathname.endsWith("/")) {
    const md = await env.ASSETS.fetch(new URL(`${url.pathname}index.md`, url));
    if (md.ok) return markdown(request.method === "HEAD" ? null : md.body);
  }

  if (url.pathname === LIST && url.search) return listThemes(url, env);

  const res = await next();
  const isApi = url.pathname.startsWith("/api/");

  if (isApi && res.status === 404) {
    return problem(404, "not_found", "Not found", `No API resource at ${url.pathname}.`, `List themes at ${LIST} and use a slug from that list.`);
  }

  if (wantsMarkdown && res.status === 404) return markdown(NOT_FOUND_MD, 404);

  const out = new Response(res.body, res);
  if (isApi) for (const [k, v] of Object.entries(API_HEADERS)) out.headers.set(k, v);
  if ((res.headers.get("Content-Type") ?? "").startsWith("text/html")) out.headers.append("Vary", "Accept");
  return out;
}
