# Art-Director Critique & Refine Loop

This is the single biggest quality lever in the skill. A generic AI ships the
**first** render it produces. A real art director ships the **third** — they look
at the work, name what is wrong, fix it, and look again. This file is that loop.

> **Mandate:** after the first PNG renders, you **VIEW the actual image** (Read the
> PNG file — do not critique from the HTML in your head), score it against the
> rubric below, fix the lowest-scoring dimensions, and **re-render**. Repeat until
> every CRITICAL dimension passes and the overall read is "a pro made this."
> A first-render handoff is a FAIL even if it looks fine.

---

## How to run the loop

```
1. RENDER      → scripts/render.py → PNG
2. VIEW        → Read the .png (look at it as an image, not the source)
3. SCORE       → walk the rubric; write a one-line verdict + score per dimension
4. DIAGNOSE    → pick the 1–3 weakest dimensions; name the exact fix in the HTML
5. FIX         → edit the HTML
6. RE-RENDER   → and VIEW again
7. STOP WHEN   → all CRITICAL pass AND no dimension is below "good"
```

Minimum **one** refine pass on every deliverable. Two+ on hero slides / covers.
For a carousel, run the loop on slide 1 (the cover) in full, then spot-check the
rest against the same rubric — they share the locked system so they move together.

Keep the critique terse and honest. "Headline competes with the badge for focus —
kill the badge weight" beats "looks good." If you cannot find anything to improve,
you are not looking hard enough — re-read the AI-tells list.

---

## The rubric (score each /5; CRITICAL must reach 4+)

### 1. Focal hierarchy — **CRITICAL**
One thing wins the half-second glance. Squint at the PNG: what do you see first?
If two elements tie, or your eye wanders, the hierarchy is broken. The headline (or
the hero number/visual) must dominate by size, weight, contrast, or isolation.
- *Fail tells:* badge as loud as the headline · subhead same weight as headline ·
  three things all centered and equal · logo bigger than it earns.
- *Fix:* widen the size ratio (display ≥ 2.2× the next tier), drop competing weights,
  add whitespace around the focal point, mute everything secondary.

### 2. Composition & balance — **CRITICAL**
Does it sit on a grid? Are the margins optically even (not just numerically equal)?
Is the weight distributed, or does it pile into one corner and leave dead space?
- *Fail tells:* everything centered out of fear · cramped edges (text kissing the
  frame) · a lonely element floating with no anchor · uneven optical margins.
- *Fix:* commit to an alignment (strong left edge often beats centered) · set a
  consistent margin (≈6–8% of width) and hold it · balance a heavy element with
  counter-weight (a shape, large type, or negative space) on the opposite side.

### 3. Type craft
Distinctive display face (never Arial/Inter/Roboto/system). Tracking tightened on
big headlines, opened on eyebrows. No widows/orphans. Real quotes/dashes (" " ' —),
not straight ones. Line-height tuned (tight on display, ~1.4 on body). Optical
sizing reads at thumbnail.
- *Fail tells:* one-word last line (widow) · loose default tracking on a 120px
  headline · straight quotes · body text too small to read at 30% · all-caps with
  no letter-spacing.
- *Fix:* `text-wrap: balance` on headlines, `pretty` on body · negative letter-
  spacing (-0.02 to -0.04em) on display · curly punctuation in the source · bump
  body to ≥24px at 1080w.

### 4. Color craft
Neutral base + ONE locked accent, used with intent (60-30-10). Shadows tinted to
the bg hue, never pure #000. No off-palette stray. Gradients de-banded (a touch of
noise). Enough contrast for AA.
- *Fail tells:* two accents fighting · pure-black shadow on a warm bg · muddy
  gradient banding · accent used on 40% of the canvas (no longer an accent).
- *Fix:* pull the second accent · tint shadow toward bg · add a grain/noise overlay
  over gradients · restrict accent to ≤~15% coverage (the focal + one echo).

### 5. Depth & atmosphere
Layering, not a flat fill: gradient mesh, grain, soft glow, overlapping shapes, or
oversized background type. A solid flat fill is a fallback, not a finish.
- *Fail tells:* one flat background color · sticker-flat elements with no shadow
  system · no foreground/background separation.
- *Fix:* add a background layer (mesh/grain/large ghost type) · give the focal a
  soft tinted shadow to lift it · overlap two shapes for parallax feel.

### 6. Legibility & contrast — **CRITICAL**
Every string passes AA (4.5:1; large text 3:1). Text over imagery has a scrim/
gradient so it never sits on a busy patch. Readable at 30% size.
- *Fail tells:* light-gray subhead on white · text directly on a photo's busy area ·
  CTA the same color as its background.
- *Fix:* darken/lighten the text or add a scrim layer · move text to a calm region ·
  raise CTA contrast. (Use `scripts/qa.py` to measure rather than eyeball.)

### 7. Safe zones & fit
Renders at exact target px, nothing clipped. Critical content in the central ~80%.
Story/Reel (1080×1920) UI overlays cleared (see `reference/platforms.md`).
- *Fail tells:* descenders cut at the frame · CTA under where the story UI sits ·
  content drifting outside the safe box.
- *Fix:* pad the canvas · move critical content inward · check platform safe zones.

### 8. Copy
≤ ~8-word headline, one idea per graphic. No cute-but-broken strings. No typos.
Eyebrow/CTA earn their place.
- *Fail tells:* two competing ideas · a clever line that reads wrong at a glance ·
  filler eyebrow ("WELCOME TO").
- *Fix:* cut to one idea · rewrite for instant read · delete filler.

### 9. Direction commitment — **CRITICAL for the "not-AI" test**
The piece clearly belongs to ONE sampled aesthetic direction with ≥2 motifs, not a
default template with words dropped in. Could a stranger name the vibe?
- *Fail tells:* could be any brand · no motif present · the "safe middle" look ·
  identical to the last post with new text.
- *Fix:* push the direction's signature motifs harder (see `reference/directions.md`
  Motif Cookbook) · exaggerate the one thing that makes this aesthetic itself.

---

## AI-tells kill-list (scan the PNG specifically for these)

These are the patterns that scream "an AI made this." If you see one, it is an
automatic refine:

- Purple/blue glow gradient on white — the default AI look.
- Three identical cards in a row (or any N-identical grid used as "content").
- Emoji used as icons.
- Everything centered because nothing was decided.
- A flat single-color fill with one centered headline.
- Generic system/Inter/Roboto type doing the display job.
- A headline and subhead at nearly the same size/weight (no hierarchy).
- Even, mechanical spacing with no rhythm or focal emphasis.
- A gradient with visible banding.
- Stocky drop-shadows (pure black, uniform, on everything).
- "Lorem"-grade filler copy or an eyebrow that says nothing.

---

## Worked example of a verdict (the shape to write)

> **Render 1 verdict.** Focal 3/5 — the eyebrow badge competes with the headline.
> Composition 3/5 — centered, cramped at the bottom edge. Type 4/5. Color 2/5 — two
> accents (teal + orange) fighting; shadow is pure black. Depth 2/5 — flat fill.
> Direction 3/5 — barely reads as "dark-luxe."
> **Fixes:** (1) drop badge weight to 600 + mute to surface color; (2) left-align,
> add 64px bottom padding; (3) pull the orange, keep teal only, tint shadow to navy;
> (4) add a radial mesh + 4% grain; (5) push the gold hairline + serif motif harder.
> → re-render → VIEW again.

That is the standard: name the score, name the fix, re-render, look again.
