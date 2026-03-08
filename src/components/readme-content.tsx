"use client";

import Markdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";

interface ReadmeContentProps {
  content: string;
  owner: string;
  repo: string;
  branch: string;
  pathPrefix?: string;
}

function resolveUrl(
  src: string,
  owner: string,
  repo: string,
  branch: string,
  pathPrefix: string,
): string {
  if (src.startsWith("http://") || src.startsWith("https://")) {
    return src.replace(
      /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(blob|raw)\/(.+)/,
      "https://raw.githubusercontent.com/$1/$2/$4",
    );
  }
  const clean = src.replace(/^\.\//, "");
  const fullPath = pathPrefix ? `${pathPrefix}/${clean}` : clean;
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${fullPath}`;
}

export function ReadmeContent({
  content,
  owner,
  repo,
  branch,
  pathPrefix = "",
}: ReadmeContentProps) {
  return (
    <div className="space-y-4 text-sm text-muted-foreground leading-relaxed break-words">
    <Markdown
      children={content}
      rehypePlugins={[rehypeRaw, rehypeSanitize]}
      components={{
        h1: ({ children }) => (
          <h1 className="font-mono text-lg font-semibold text-foreground">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="font-mono text-base font-semibold text-foreground border-b border-border/40 pb-2">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="font-mono text-sm font-semibold text-foreground">{children}</h3>
        ),
        p: ({ children }) => <p className="leading-relaxed">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-5 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1">{children}</ol>,
        li: ({ children }) => <li>{children}</li>,
        code: ({ className, children }) => {
          const isBlock = className?.includes("language-");
          if (isBlock) {
            return (
              <code className="block bg-muted/30 rounded-lg p-4 font-mono text-xs overflow-x-auto whitespace-pre">
                {children}
              </code>
            );
          }
          return (
            <code className="bg-muted/50 px-1.5 py-0.5 rounded font-mono text-xs">
              {children}
            </code>
          );
        },
        pre: ({ children }) => <pre className="overflow-x-auto">{children}</pre>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-border/60 pl-4 italic text-muted-foreground/80">
            {children}
          </blockquote>
        ),
        img: ({ src, alt }) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={typeof src === "string" ? resolveUrl(src, owner, repo, branch, pathPrefix) : undefined}
            alt={alt ?? ""}
            loading="lazy"
            className="rounded-lg max-w-full h-auto my-2"
          />
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-4 hover:text-foreground/80 transition-colors"
          >
            {children}
          </a>
        ),
        hr: () => <hr className="border-border/40" />,
        strong: ({ children }) => <strong className="text-foreground font-medium">{children}</strong>,
        kbd: ({ children }) => (
          <kbd className="bg-muted/50 border border-border/60 rounded px-1.5 py-0.5 font-mono text-xs text-foreground">
            {children}
          </kbd>
        ),
        sub: ({ children }) => <sub className="text-xs text-muted-foreground/70">{children}</sub>,
        sup: ({ children }) => <sup className="text-xs">{children}</sup>,
        details: ({ children }) => (
          <details className="border border-border/40 rounded-lg p-3">
            {children}
          </details>
        ),
        summary: ({ children }) => (
          <summary className="cursor-pointer font-medium text-foreground">{children}</summary>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono border-collapse">{children}</table>
          </div>
        ),
        th: ({ children }) => (
          <th className="border border-border/40 px-3 py-1.5 text-left text-foreground font-medium bg-muted/30">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border border-border/40 px-3 py-1.5">{children}</td>
        ),
      }}
    />
    </div>
  );
}
