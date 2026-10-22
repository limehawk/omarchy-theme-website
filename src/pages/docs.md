---
layout: ../layouts/Prose.astro
title: Omarchy Themes API
description: Free, read-only JSON API for the Omarchy Themes catalog. No key needed.
---

# Omarchy Themes API

The Omarchy Themes API is a free, read-only JSON copy of the theme catalog. Use it to search themes by name or color, show a palette, or hand a user the right install command. It is rebuilt each day from GitHub.

- **Base URL:** `https://omarchytheme.com`
- **Authentication:** none. There are no keys and no sign-up.
- **Format:** JSON. Errors are `application/problem+json`.
- **OpenAPI:** [/openapi.json](/openapi.json)
- **CLI:** [`omarchytheme`](#cli) on npm
- **For agents:** [/llms.txt](/llms.txt)

## Endpoints

| Method | Path | Operation | Returns |
| --- | --- | --- | --- |
| GET | `/api/v1/themes.json` | `listThemes` | Every theme, or a search, most stars first |
| GET | `/api/v1/themes/{slug}.json` | `getTheme` | One theme |

### List every theme

```bash
curl https://omarchytheme.com/api/v1/themes.json
```

```json
{
  "count": 388,
  "themes": [
    {
      "slug": "catppuccin",
      "name": "Catppuccin",
      "author": "basecamp",
      "stars": 45312,
      "primary_hue": "blue",
      "install_command": "omarchy-theme-install https://github.com/...",
      "colors": { "background": "#1e1e2e", "foreground": "#cdd6f4", "color1": "#f38ba8" }
    }
  ]
}
```

Each theme has `slug`, `name`, `description`, `author`, `repository`, `stars`, `primary_hue`, `builtin`, `install_command`, `colors`, `apps`, `security_warnings`, `preview_url`, `page_url`, `markdown_url`, `api_url`, and `updated_at`. The [OpenAPI description](/openapi.json) types every field.

### Search themes

Add any of these query parameters to `/api/v1/themes.json`. They combine.

| Parameter | Type | Matches |
| --- | --- | --- |
| `q` | string | Text in the theme name, slug, or author, ignoring case |
| `hue` | string | The theme's `primary_hue`, such as `blue`, `red`, `green`, `purple`, or `grey` |
| `limit` | integer, 1 to 500 | At most this many themes |

```bash
curl 'https://omarchytheme.com/api/v1/themes.json?q=nord&limit=5'
curl 'https://omarchytheme.com/api/v1/themes.json?hue=purple'
```

An out-of-range `limit` returns status `400` with code `invalid_limit`.

### Get one theme

```bash
curl https://omarchytheme.com/api/v1/themes/catppuccin.json
```

The slug is the last part of the theme's page URL. For `https://omarchytheme.com/themes/catppuccin/` it is `catppuccin`.

If a theme has `security_warnings`, show them to the user before they install it. They list anything the theme does beyond setting colors.

## Errors

A missing theme or path returns status `404` with a JSON problem body:

```json
{
  "type": "https://omarchytheme.com/docs/#errors",
  "title": "Not found",
  "status": 404,
  "code": "not_found",
  "detail": "No API resource at /api/v1/themes/nope.json.",
  "resolution": "List themes at /api/v1/themes.json and use a slug from that list."
}
```

## Versioning

The major version is in the path: `/api/v1/`. New fields can appear in v1 at any time, so ignore fields you do not know. A breaking change will ship as `/api/v2/`.

### Deprecation and sunset policy

When a version is deprecated, every response from it carries a `Deprecation` header (RFC 9745) and a `Sunset` header (RFC 8594) with the date it stops working, at least six months later. We also note it here and in [/llms.txt](/llms.txt). No version is deprecated today.

## Rate limits

The API is static files on a CDN, so we do not count your requests. Please keep to the fair-use limit that every API response states in its `RateLimit-Policy` and `X-RateLimit-Limit` headers: 60 requests a minute. The data changes once a day, so caching `/api/v1/themes.json` for an hour is plenty. If we ever do throttle you, you will get status `429` with a `Retry-After` header.

## CLI

The `omarchytheme` command searches the catalog and installs themes on an Omarchy machine. It needs Bun or Node.js 18 or later.

```bash
bun x omarchytheme search nord
bun x omarchytheme show catppuccin
bun x omarchytheme install catppuccin
```

`search` takes `--hue` and `--limit`, and every command takes `--json`. `install` shows a theme's security warnings, then runs `omarchy-theme-install`. The source is in [the site's repository](https://github.com/limehawk/omarchy-theme-website/tree/main/cli).

## Markdown pages

Every page on the site also comes as Markdown. Send `Accept: text/markdown`, or add `index.md` to the page URL:

```bash
curl -H 'Accept: text/markdown' https://omarchytheme.com/themes/catppuccin/
```
