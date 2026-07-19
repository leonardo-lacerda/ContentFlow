# The Premium Standard — Full Ruleset

This is the difference between "designed" and "AI default." Read it before
building. Every rule has a reason; follow the spirit, not just the letter.

---

## 0. Direction before pixels

State a one-line **Design Read** before you build (art direction + palette +
type + layout archetype). A graphic with no committed point of view defaults to
slop. Pick an extreme and execute it cleanly — **refined-minimal** and
**loud-maximal** both win; the timid middle loses.

Art-direction families to commit to (pick ONE per graphic):
`bold-typographic` · `editorial/magazine` · `gradient-mesh` · `glass/frosted` ·
`brutalist` · `neon/cyber` · `luxury-dark` · `organic/soft` · `retro/print` ·
`3D/depth` · `photo-led`.

---

## 1. Typography (the #1 tell)

- **Display face must be distinctive.** BANNED as the headline font: Arial,
  Helvetica, Inter, Roboto, Open Sans, Lato, system-ui. Reach instead for:
  *Clash Display, Cabinet Grotesk, Space Grotesk, Archivo / Archivo Black,
  Sora, Unbounded, Bricolage Grotesque, Fraunces, Instrument Serif, Syne, Anton,
  Bebas Neue, Boldonse, Familjen Grotesk.* (See `data/fonts.json` for pairings.)
- **Pair, don't solo.** Distinctive display + clean body. Don't set body copy in
  a loud display font; don't set a headline in a plain body font.
- **Headlines: big, tight, heavy.** `letter-spacing: -0.02em to -0.04em`,
  weight 800–900, `line-height: 0.95–1.05`. Small timid headlines read cheap.
- **Emphasis inside a headline** = italic/bold of the *same* family, or the
  accent color on one word. Never inject a random second font for "interest."
- **Max 2 families** per graphic.

## 2. Color

- **One locked accent.** Neutral/dark base + a single saturated accent used
  consistently. Don't introduce a second accent "to balance it."
- **The purple ban.** The AI-purple/blue-glow gradient **on white/light** is the
  most recognizable AI tell. Don't reach for it by default. (Purple/violet on a
  deep dark base, used deliberately as a brand accent, is fine — the tell is the
  white-background glow, not the hue.) If the brand IS purple, own it with a real
  palette — not a generic glow.
- **Tint your shadows.** Shadows take the background's hue, never pure `#000`
  on a colored or light background. Pure-black drop shadows look flat and cheap.
- **Contrast is law.** Body/headline text ≥ 4.5:1 against its background; large
  display text ≥ 3:1. Verify, don't eyeball — the curated `data/palettes.json`
  pairs are pre-balanced, so you only need to re-check **custom/brand** colors
  (paste fg+bg into any WCAG contrast checker). Light-grey text on white = banned.
- Use the curated palettes in `data/palettes.json` — each ships bg / surface /
  text / muted / accent / gradient already balanced.

## 3. Depth & atmosphere (never a flat fill)

A solid background color is a *fallback*, not a design. Build atmosphere with:
- **Gradient meshes** — 2–3 radial gradients in related hues, soft and large.
- **Grain / noise overlay** — a subtle SVG `feTurbulence` or tiled noise at
  4–8% opacity kills the "vector flatness" instantly.
- **Glows & soft shadows** — large, blurred, tinted; for neon, layered
  `text-shadow` / `box-shadow`.
- **Layered shapes** — an oversized circle/blob/arc bleeding off-canvas behind
  content; overlapping translucent panels.
- **Oversized background type** — a giant faint word/number behind the headline.
- **Glass panels** — `backdrop-filter: blur()` + 1px inner white border +
  inset highlight, over a gradient.

At least ONE depth device on every graphic. Two or three for maximal directions.

## 4. Layout

- **Anti-center bias.** Don't center everything by reflex. Use asymmetry, a
  baseline grid, left-anchored copy with a large negative-space counterweight,
  diagonal flow, or grid-breaking overlap. (Centered is fine for a pure quote /
  manifesto where the words ARE the design.)
- **One focal point.** A clear visual entry; obvious reading order in a glance.
- **Generous margins.** 64–96px+ outer padding at 1080px. Edge-crammed = cheap.
- **Real grid.** Align to a column/baseline system; nothing floats randomly.
- **Carousel variety.** Lock the system (palette/type/margin); vary the
  composition slide-to-slide. Don't stamp the identical layout 6 times.

## 5. Icons, images, marks

- **No emoji as structural icons.** Use inline SVG (Lucide/Phosphor paths,
  Simple Icons for brand logos). Emoji-as-icon is an instant tell. Emoji is
  allowed only as an intentional playful content element, sparingly.
- **Real images > fake divs.** If a photo is needed and an image tool exists,
  generate it; otherwise use a real source (`picsum.photos/seed/...`) or leave a
  clearly-labeled slot. Don't fake screenshots with `<div>` rectangles.
- **One icon family, one stroke width.** Don't mix outline + filled at the same
  level; standardize stroke (1.5 or 2px).

## 6. Copy

- **One idea per graphic.** Headline ≤ ~8 words. If it needs a paragraph, it's
  the wrong format.
- **Self-audit every string** before shipping: cut grammatically-broken,
  cute-but-wrong, or fake-precise numbers (`92%`, `4.1×`) unless they're real.
- **Real typographic quotes** ( " " ), not straight ASCII. No em-dash as a
  decorative flourish.
- **One CTA, one intent.** Don't put "Get started" + "Sign up" + "Try free" on
  the same card.

## 7. Shape & finish consistency

- **One corner-radius scale** per graphic (all-sharp, all-soft ~16–24px, or
  pill) — don't mix square cards with pill buttons randomly.
- **Consistent elevation** — one shadow scale, applied with intent.
- **Theme lock** — one mode (dark or light) per graphic / per carousel; sections
  don't invert mid-set.

---

## Instant-reject list (if you see it, redo)
- Flat single-color background with centered text and nothing else
- Inter / Arial / Roboto as the headline font
- Purple→blue gradient glow on white
- Three identical feature cards in a row
- Emoji standing in for icons
- Pure-black shadows on a light/colored background
- Light-grey body text failing contrast
- Headline crammed edge-to-edge with no margin
- "Cheap / flat / 90s / black-and-white" overall feel
