# Contributing a Theme

Want your Omarchy theme listed on [omarchytheme.com](https://omarchytheme.com)? Just open a PR.

## Steps

1. Fork this repo
2. Edit `src/data/themes.json` — add your theme to the `"curated"` array:
   ```json
   {
     "url": "https://github.com/your-username/your-repo-name",
     "name": "Your Theme Name"
   }
   ```
3. Open a pull request

That's it. Once merged, the scraper picks up your theme on its next run and it appears on the site.

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
