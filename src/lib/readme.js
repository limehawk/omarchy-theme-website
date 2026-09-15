import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { cssHex } from "../../scripts/colors.js";
import { escapeHtml } from "./escape.js";

function resolveReadmeUrl(src, owner, repo, branch, pathPrefix) {
  if (!src) return src;
  if (/^(https?:)?\/\//.test(src) || src.startsWith("data:")) {
    let url = src.replace(
      /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(blob|raw)\/(.+)/,
      "https://raw.githubusercontent.com/$1/$2/$4",
    );
    const re = new RegExp(`^https://raw\\.githubusercontent\\.com/${owner}/${repo}/([^/]+)/(.+)$`);
    const m = url.match(re);
    if (m && m[1] !== branch) {
      url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${m[2]}`;
    }
    return url;
  }
  const clean = src.replace(/^\.\//, "");
  const fullPath = pathPrefix ? `${pathPrefix}/${clean}` : clean;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${fullPath}`;
}

function resolveReadmeHref(src, owner, repo, branch, pathPrefix) {
  if (!src) return src;
  if (/^(https?:)?\/\//.test(src) || src.startsWith("mailto:") || src.startsWith("#") || src.startsWith("data:")) {
    return src;
  }
  const clean = src.replace(/^\.\//, "");
  const fullPath = pathPrefix ? `${pathPrefix}/${clean}` : clean;
  if (/\.(png|jpe?g|gif|webp|svg|avif|mp4|webm|pdf|ico)$/i.test(fullPath)) {
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${fullPath}`;
  }
  return `https://github.com/${owner}/${repo}/blob/${branch}/${fullPath}`;
}

function normalizeSwatchHex(raw) {
  if (!raw) return null;
  const h = String(raw).replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{8}$/.test(h)) return null;
  return `#${h.toLowerCase()}`;
}

export function swatchHexFromImg(src = "", alt = "") {
  const altMatch = String(alt).trim().match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/);
  if (altMatch) return normalizeSwatchHex(altMatch[1]);
  const s = String(src);
  let m;
  if ((m = s.match(/readme-swatches\.vercel\.app\/(?:#)?([0-9a-fA-F]{3,8})/i))) return normalizeSwatchHex(m[1]);
  if ((m = s.match(/placehold\.co\/\d+x\d+\/([0-9a-fA-F]{3,8})/i))) return normalizeSwatchHex(m[1]);
  if ((m = s.match(/via\.placeholder\.com\/\d+(?:x\d+)?\/([0-9a-fA-F]{3,8})/i))) return normalizeSwatchHex(m[1]);
  return null;
}

function swatchChip(hex) {
  const h = cssHex(hex);
  return `<span class="readme-swatch inline-block align-middle size-[1.125rem] rounded-md border border-white/15 shrink-0" style="background-color:${escapeHtml(h)}" title="${escapeHtml(h)}" aria-hidden="true"></span>`;
}

const SANITIZE_OPTS = {
  allowedTags: [
    "h1","h2","h3","h4","h5","h6",
    "p","br","hr","ul","ol","li","blockquote","pre","code",
    "strong","em","del","a","img",
    "table","thead","tbody","tr","th","td",
    "kbd","sub","sup","details","summary","span","div",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    code: ["class"],
    pre: ["class"],
    span: ["class", "style", "title"],
    div: ["class"],
    table: ["class"],
    thead: ["class"],
    tbody: ["class"],
    tr: ["class"],
    th: ["align", "class"],
    td: ["align", "class"],
  },
  allowedStyles: {
    span: {
      "background-color": [/^#[0-9a-fA-F]{3,8}$/i],
    },
  },
  allowedSchemes: ["http", "https", "mailto", "data"],
  transformTags: {
    a: (tag, attrs) => ({
      tagName: "a",
      attribs: { ...attrs, target: "_blank", rel: "noopener noreferrer" },
    }),
  },
};

export function renderReadme(content, owner, repo, branch, pathPrefix = "") {
  const renderer = new marked.Renderer();
  renderer.image = function ({ href, title, text }) {
    const resolved = resolveReadmeUrl(href, owner, repo, branch, pathPrefix);
    const hex = swatchHexFromImg(resolved, text);
    if (hex) return swatchChip(hex);
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
    return `<img src="${escapeHtml(resolved)}" alt="${escapeHtml(text)}" loading="lazy" class="rounded-lg max-w-full h-auto my-2"${titleAttr}>`;
  };
  renderer.link = function ({ href, title, tokens }) {
    const text = this.parser.parseInline(tokens);
    const resolved = resolveReadmeHref(href, owner, repo, branch, pathPrefix);
    const titleAttr = title ? ` title="${escapeHtml(title)}"` : "";
    return `<a href="${escapeHtml(resolved)}"${titleAttr}>${text}</a>`;
  };
  renderer.heading = function ({ tokens, depth }) {
    const text = this.parser.parseInline(tokens);
    const cls = {
      1: "font-mono text-lg font-semibold text-foreground",
      2: "font-mono text-base font-semibold text-foreground border-b border-border/40 pb-2",
      3: "font-mono text-sm font-semibold text-foreground",
    }[depth] ?? "font-mono text-sm font-semibold text-foreground";
    return `<h${depth} class="${cls}">${text}</h${depth}>`;
  };
  renderer.code = function ({ text, lang }) {
    return `<pre class="bg-muted/30 rounded-lg p-4 overflow-x-auto max-h-50 text-xs subpixel-antialiased"><code class="block whitespace-pre${lang ? ` language-${escapeHtml(lang)}` : ""}">${escapeHtml(text)}</code></pre>`;
  };
  renderer.codespan = function ({ text }) {
    return `<code class="bg-muted/50 px-1.5 py-0.5 rounded font-mono text-xs">${text}</code>`;
  };
  renderer.blockquote = function ({ tokens }) {
    return `<blockquote class="border-l-2 border-border/60 pl-4 italic text-muted-foreground/80">${this.parser.parse(tokens)}</blockquote>`;
  };
  renderer.table = function ({ header, rows }) {
    const headHtml = header.map((cell) => `<th class="px-3 py-2 text-left text-muted-foreground font-medium align-middle whitespace-nowrap">${this.parser.parseInline(cell.tokens)}</th>`).join("");
    const bodyHtml = rows.map((row) => `<tr>${row.map((cell) => `<td class="px-3 py-2 align-middle">${this.parser.parseInline(cell.tokens)}</td>`).join("")}</tr>`).join("");
    return `<div class="overflow-x-auto"><table class="text-xs font-mono border-separate border-spacing-x-4 border-spacing-y-1">${headHtml ? `<thead><tr>${headHtml}</tr></thead>` : ""}<tbody>${bodyHtml}</tbody></table></div>`;
  };

  const rawHtml = marked.parse(content, { renderer, gfm: true, breaks: false });

  const sanitized = sanitizeHtml(rawHtml, {
    ...SANITIZE_OPTS,
    transformTags: {
      ...SANITIZE_OPTS.transformTags,
      a: (tag, attrs) => ({
        tagName: "a",
        attribs: {
          ...attrs,
          href: resolveReadmeHref(attrs.href, owner, repo, branch, pathPrefix),
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      img: (tag, attrs) => {
        const src = resolveReadmeUrl(attrs.src, owner, repo, branch, pathPrefix);
        const hex = swatchHexFromImg(src, attrs.alt);
        if (hex) {
          return {
            tagName: "span",
            attribs: {
              class: "readme-swatch inline-block align-middle size-[1.125rem] rounded-md border border-white/15 shrink-0",
              style: `background-color:${cssHex(hex)}`,
              title: cssHex(hex),
            },
          };
        }
        if (!src) return { tagName: "img", attribs: {} };
        return {
          tagName: "img",
          attribs: { ...attrs, src, loading: "lazy" },
        };
      },
    },
  });

  return `<div class="readme-body space-y-4 text-sm text-muted-foreground leading-relaxed break-words">${sanitized}</div>`;
}
