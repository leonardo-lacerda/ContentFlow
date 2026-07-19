# Real Assets — logos, textures, photo treatments, AI imagery

Flat CSS-only fills are the #1 reason a post reads as "AI made it." Real posts
layer **real assets**: actual brand logos, grain/paper texture, treated photos,
and (optionally) generated hero imagery. This file is how you add each.

Two scripts back this:
- `scripts/assets.py` — brand logos (Simple Icons) + textures. **No API key, works offline** (textures fully offline; logos need a connection).
- `scripts/imagegen.py` — optional AI imagery via Gemini. **Skill works fully without it.**

---

## 1. Brand logos (real, not emoji) — Simple Icons, no key

Never use an emoji as a brand mark. Pull the real SVG:

```bash
python "$SKILL/scripts/assets.py" icon instagram --color FFFFFF --out out/ig.svg
python "$SKILL/scripts/assets.py" icon youtube   --color FF0000 --out out/yt.svg
python "$SKILL/scripts/assets.py" icon github                    --out out/gh.svg
```

- `slug` = lowercase brand name, no spaces: `instagram`, `tiktok`, `x`, `linkedin`,
  `youtube`, `whatsapp`, `discord`, `figma`, `spotify`… full list at simpleicons.org.
- `--color` = hex without `#` (recolor to match the design); omit for brand color.
- Inline the SVG into the HTML (or `<img src>`), size it like an icon, give it the
  same optical weight as your other UI — never let the logo out-shout the headline.

For **UI icons** (arrows, checks, stars), use ONE consistent SVG family inline
(Lucide / Phosphor style paths) — never emoji, never mixed icon sets.

---

## 2. Texture overlays (offline, Pillow)

Lay a texture over a fill or gradient to kill the flat look. All generated locally:

```bash
python "$SKILL/scripts/assets.py" texture grain --size 1080x1350 --opacity 14 --out out/grain.png
python "$SKILL/scripts/assets.py" texture paper --size 1080x1350 --out out/paper.png
python "$SKILL/scripts/assets.py" texture mesh  --size 1080x1350 --colors 1a1a2e,e94560,0f3460 --out out/mesh.png
```

- **grain / noise** — fine film grain; overlay it to de-band gradients and add tooth.
  `noise` is colored, `grain` is monochrome. Keep `--opacity` low (10–24).
- **paper** — soft fiber mottle for kraft / editorial / organic directions.
- **mesh** — a real gradient-mesh **background layer** from 2–4 brand hexes (already
  grain-dithered). Use as the base, then build on top.

Apply in CSS as a layer (set `mix-blend-mode` to taste):

```css
.canvas { position: relative; }
.canvas::after {
  content: ""; position: absolute; inset: 0; pointer-events: none;
  background: url("grain.png"); mix-blend-mode: overlay; opacity: .6;
}
```

A `mesh.png` works as the base `background-image`; `grain`/`paper` as a `::after`
overlay with `overlay`, `soft-light`, or `multiply` blend.

---

## 3. Photo treatments (CSS — make stock look art-directed)

Raw stock photos read cheap. Always treat them so they belong to the palette:

**Duotone** (map shadows→brand-dark, highlights→accent) via SVG filter:
```html
<svg width="0" height="0"><filter id="duo">
  <feColorMatrix type="matrix" values="0.6 0.6 0.6 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/>
  <feComponentTransfer>
    <feFuncR type="table" tableValues="0.06 0.91"/>  <!-- shadow R → hi R -->
    <feFuncG type="table" tableValues="0.05 0.27"/>
    <feFuncB type="table" tableValues="0.18 0.38"/>
  </feComponentTransfer>
</filter></svg>
<img src="photo.jpg" style="filter:url(#duo)">
```

**Grade** (cheap, fast): `filter: saturate(1.1) contrast(1.05) brightness(.95);`
plus a brand-tinted overlay `background: linear-gradient(rgba(15,52,96,.45), rgba(15,52,96,.75));`

**Scrim** (so text on a photo always passes contrast): put a gradient between the
photo and the text — `linear-gradient(transparent, rgba(0,0,0,.7))` on the side
the text sits. Never set text directly on an untreated busy photo.

Tint scrims/overlays toward the **background hue**, not pure black — matches the
color-craft rule in `art-direction.md`.

---

## 4. AI imagery (optional — Gemini)

Use only when a design genuinely needs generated imagery (a painterly hero, a
product scene, an abstract field no gradient can fake). The skill **OFFERS** this;
it is never required.

**The flow (skill auto-configures — user never touches env vars):**
1. Check availability: `python "$SKILL/scripts/imagegen.py" --check`
2. No key and the user wants AI imagery → ask for their key, then save it once:
   `python "$SKILL/scripts/imagegen.py" --save-key <KEY>`
   (Get one at https://aistudio.google.com/apikey — free tier, revocable.)
3. Generate: `python "$SKILL/scripts/imagegen.py" "<prompt>" --ar 4:5 --out out/bg.png`
4. Treat the result like any photo (scrim/grade), set text on top, render.

**Key safety — say this to the user, honestly:**
- The key is stored **locally only** at `~/.config/xniper-social-studio/gemini.key`,
  **gitignored — never committed, never sent to any website**.
- Scripts read `GEMINI_API_KEY` env first, then that file.
- Pasting a key in chat means it lands in the **local transcript** (their machine
  only). Never type a key into a website field. It is **revocable anytime**.

**Graceful fallback (mandatory):** if `--check` reports missing SDK or key, do NOT
nag or block. Build the design with CSS gradients + `texture mesh`/`grain` +
treated stock. The image-gen path is a bonus, never a dependency.

Prompt tips for backgrounds: describe mood + palette + texture, say "abstract,
no text, no logo, no watermark," and match `--ar` to the canvas (`4:5`, `1:1`,
`9:16`, `16:9`). Generate the background; add YOUR type in HTML — never let the
model render the words.
