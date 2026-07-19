# Attribution — xniper-social-studio

This directory includes design assets (JSON catalogs, HTML/CSS templates, and reference docs) derived from:

- **Project:** [xniper-social-studio](https://github.com/xniperbuilds/xniper-social-studio)
- **License:** MIT (see `../THIRD_PARTY_LICENSE_XNIPER.txt`)
- **Pinned commit:** `595a8b99d3d3866be7462666129ff54b6d7371da`
- **Copyright:** © XniperBuilds

## What was ported

| Asset | Origin path | Notes |
|-------|-------------|-------|
| `data/*.json` | `plugins/.../data/` | palettes, fonts, directions, templates, motifs, hooks, categories, brand-presets |
| `templates/*.html` | `plugins/.../templates/` | parametrized HTML/CSS layouts |
| `reference/*.md` | `plugins/.../reference/` | design rules, carousel systems, etc. |

## What was NOT ported

- Python scripts (`ideate.py`, `new_post.py`, `render.py`, …) — reimplemented in TypeScript under `../`
- Claude Code skill packaging (`.claude-plugin/`, `SKILL.md`)

## License coexistence

- **Assets above:** remain MIT as distributed by xniper-social-studio.
- **TypeScript services in this package:** licensed under the ContentFlow monorepo license (AGPL-3.0).

When exporting user packages that embed rendered graphics built from these templates, include a short notice pointing to this file (e.g. `recipe.json` → `assetAttribution`).
