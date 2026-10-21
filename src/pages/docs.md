---
layout: ../layouts/Prose.astro
title: API docs
description: Free, read-only JSON API for the Omarchy Themes catalog. No key needed.
---

# Omarchy Themes API

The Omarchy Themes API is a free, read-only JSON copy of the theme catalog. Use it to search themes by name or color, show a palette, or hand a user the right install command. It is rebuilt each day from GitHub.

- **Base URL:** `https://omarchytheme.com`
- **Authentication:** none. There are no keys and no sign-up.
- **Format:** JSON. Errors are `application/problem+json`.
- **OpenAPI:** [/openapi.json](/openapi.json)
- **For agents:** [/llms.txt](/llms.txt)

## Endpoints

| Method | Path | Operation | Returns |
| --- | --- | --- | --- |
| GET | `/api/themes.json` | `listThemes` | Every theme, most stars first |
| GET | `/api/themes/{slug}.json` | `getTheme` | One theme |

### List every theme

```bash
curl https://omarchytheme.com/api/themes.json
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

### Get one theme

```bash
curl https://omarchytheme.com/api/themes/catppuccin.json
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
  "detail": "No API resource at /api/themes/nope.json.",
  "resolution": "List themes at /api/themes.json and use a slug from that list."
}
```

## Rate limits

The API is static files on a CDN, so we do not count your requests. Please keep to the fair-use policy in the `RateLimit-Policy` header on every API response: 60 requests a minute. The data changes once a day, so caching `/api/themes.json` for an hour is plenty. If we ever do throttle you, you will get status `429` with a `Retry-After` header.

## Markdown pages

Every page on the site also comes as Markdown. Send `Accept: text/markdown`, or add `index.md` to the page URL:

```bash
curl -H 'Accept: text/markdown' https://omarchytheme.com/themes/catppuccin/
```
