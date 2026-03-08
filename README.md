# omarchy themes

Theme gallery for [Omarchy](https://omarchy.org), the opinionated Linux desktop environment from Basecamp.

Browse, search, and preview community and built-in themes at **[omarchytheme.com](https://omarchytheme.com)**.

## Submit a Theme

Have a theme you'd like listed? [Submit it here](https://github.com/limehawk/omarchy-theme-website/issues/new?template=submit-theme.yml).

Your repo needs a `colors.toml` at the root with the standard Omarchy color keys. A `preview.png` and `README.md` are recommended. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Architecture

This is a fully static site — no server-side code at runtime.

- **Static site** built with Next.js and deployed to Cloudflare Pages
- **Theme data** is scraped from GitHub repos by a separate worker and stored in Cloudflare D1
- **At build time**, theme data is dumped from D1 to JSON, then baked into static HTML
- **Rebuilds** are triggered automatically on push and weekly via deploy hook

## Development

```bash
# Install dependencies
bun install

# Dump fresh theme data (requires Cloudflare credentials)
bash scripts/dump-themes.sh

# Start dev server
bun run dev
```

## License

MIT
