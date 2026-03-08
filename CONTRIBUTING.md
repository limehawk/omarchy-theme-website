# Contributing a Theme

Want your Omarchy theme listed on [omarchytheme.com](https://omarchytheme.com)?

## Submit Your Theme

[Open a theme submission](https://github.com/limehawk/omarchy-theme-website/issues/new?template=submit-theme.yml) — just provide your GitHub repo URL and theme name. Once approved, the scraper picks it up and your theme appears on the site.

## Theme Requirements

Your repo must contain a `colors.toml` at the root with the standard Omarchy color keys:

```toml
accent = "#hexcolor"
cursor = "#hexcolor"
foreground = "#hexcolor"
background = "#hexcolor"
selection_foreground = "#hexcolor"
selection_background = "#hexcolor"
color0 = "#hexcolor"
color1 = "#hexcolor"
# ... through color15
```

Optional but recommended:
- `preview.png` at the repo root — screenshot of your theme in action
- A `README.md` describing your theme

## What Gets Scraped

The site pulls the following from your repo automatically:
- `colors.toml` — parsed for the color palette display
- `preview.png` — used as the theme card image
- `README.md` — shown on the theme detail page
- Repo description and star count from GitHub
