// Cloudflare Pages middleware for agents:
// - Accept: text/markdown on a page returns its index.md mirror, and a
//   Markdown body on a 404.
// - Missing /api/ paths return RFC 9457 JSON instead of the HTML 404 page.
const MARKDOWN = /\btext\/markdown\b/i;
const RATE_LIMIT = { "RateLimit-Policy": '"fair-use";q=60;w=60', "X-RateLimit-Limit": "60" };

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

export async function onRequest({ request, next, env }) {
  const url = new URL(request.url);
  const wantsMarkdown = MARKDOWN.test(request.headers.get("Accept") ?? "");

  if (wantsMarkdown && url.pathname.endsWith("/")) {
    const md = await env.ASSETS.fetch(new URL(`${url.pathname}index.md`, url));
    if (md.ok) return markdown(request.method === "HEAD" ? null : md.body);
  }

  const res = await next();
  const isApi = url.pathname.startsWith("/api/");

  if (isApi && res.status === 404) {
    return Response.json(
      {
        type: "https://omarchytheme.com/docs/#errors",
        title: "Not found",
        status: 404,
        code: "not_found",
        detail: `No API resource at ${url.pathname}.`,
        resolution: "List themes at /api/v1/themes.json and use a slug from that list.",
      },
      { status: 404, headers: { "Content-Type": "application/problem+json", ...RATE_LIMIT } },
    );
  }

  if (wantsMarkdown && res.status === 404) return markdown(NOT_FOUND_MD, 404);

  const out = new Response(res.body, res);
  if (isApi) for (const [k, v] of Object.entries(RATE_LIMIT)) out.headers.set(k, v);
  if ((res.headers.get("Content-Type") ?? "").startsWith("text/html")) out.headers.append("Vary", "Accept");
  return out;
}
