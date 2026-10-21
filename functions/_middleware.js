// Cloudflare Pages middleware for agents:
// - Accept: text/markdown on a page returns its index.md mirror.
// - Missing /api/ paths return RFC 9457 JSON instead of the HTML 404 page.
const MARKDOWN = /\btext\/markdown\b/i;

export async function onRequest({ request, next, env }) {
  const url = new URL(request.url);

  if (url.pathname.endsWith("/") && MARKDOWN.test(request.headers.get("Accept") ?? "")) {
    const md = await env.ASSETS.fetch(new URL(`${url.pathname}index.md`, url));
    if (md.ok) {
      return new Response(request.method === "HEAD" ? null : md.body, {
        headers: { "Content-Type": "text/markdown; charset=utf-8", "Vary": "Accept", "Cache-Control": "public, max-age=3600" },
      });
    }
  }

  const res = await next();

  if (url.pathname.startsWith("/api/") && res.status === 404) {
    return Response.json(
      {
        type: "https://omarchytheme.com/docs/#errors",
        title: "Not found",
        status: 404,
        code: "not_found",
        detail: `No API resource at ${url.pathname}.`,
        resolution: "List themes at /api/themes.json and use a slug from that list.",
      },
      { status: 404, headers: { "Content-Type": "application/problem+json" } },
    );
  }

  if ((res.headers.get("Content-Type") ?? "").startsWith("text/html")) {
    const out = new Response(res.body, res);
    out.headers.append("Vary", "Accept");
    return out;
  }
  return res;
}
