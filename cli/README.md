# omarchytheme

Search and install [Omarchy](https://omarchy.org/) themes from [omarchytheme.com](https://omarchytheme.com).

```bash
bun x omarchytheme search nord
bun x omarchytheme search --hue purple --limit 5
bun x omarchytheme show catppuccin
bun x omarchytheme install catppuccin
```

Every command takes `--json`. `install` shows the theme's security warnings, then runs `omarchy-theme-install`. It uses the free [Omarchy Themes API](https://omarchytheme.com/docs/). Needs Bun or Node.js 18 or later.

MIT licensed.
