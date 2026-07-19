# Typographic Polish — the details that read as "a pro set this"

Amateur type and pro type use the same fonts. The difference is the dozen small
moves below. Apply them on every build; they are cheap and they are the whole
"this looks expensive" effect. Pair with `scripts/typeset.py` for the copy itself.

---

## 1. Fix the copy first (run `typeset.py`)

Straight quotes, `--`, and `...` are instant amateur tells.

```bash
python "$SKILL/scripts/typeset.py" --text "\"Don't\" wait -- it's free..." --nbsp
# → “Don’t” wait — it’s free…   (with a no-break space before the last word)
```

- Curly quotes `“ ” ‘ ’`, real apostrophe `’`, en dash `–` for ranges (10–20),
  em dash `—` for breaks, true ellipsis `…`.
- `--nbsp` binds the last two words so a headline never drops one word onto its
  own line (a "widow"). Use it on every headline.
- Put the fixed strings into `content.json` / the HTML directly.

---

## 2. Balance & wrap (CSS)

```css
h1, .headline { text-wrap: balance; }   /* even line lengths, no lonely last word */
p,  .body     { text-wrap: pretty; }    /* avoids orphans on the last line */
```

`balance` is for short headings (≤ ~6 lines); `pretty` for body. If a headline
still breaks badly, hard-break it yourself with `\n` in the copy at the meaning
seam — never let it wrap to a bad rag.

---

## 3. Optical tracking (letter-spacing) — by size & role

Big type needs NEGATIVE tracking; small all-caps needs POSITIVE. Defaults:

| Role | size | letter-spacing |
|---|---|---|
| Display headline | 80–140px | **-0.03em to -0.045em** |
| Headline | 48–72px | -0.015em to -0.03em |
| Subhead | 30–40px | -0.01em |
| Body | 24–28px | 0 |
| Eyebrow / label (caps) | 18–22px | **+0.08em to +0.16em** |
| Button / CTA | 28–34px | 0 to +0.02em |

Tighter as it gets bigger; looser as caps get smaller. Never track lowercase body
positively.

---

## 4. Line-height

- Display / headline: **0.95–1.05** (tight — let big type stack).
- Subhead: ~1.2. Body: **1.4–1.55**. Eyebrow caps: 1.1.
- Tighten line-height as font-size grows; loosen as it shrinks.

---

## 5. Hanging punctuation & alignment

```css
.quote { hanging-punctuation: first last; }   /* pull quotes/bullets into the margin */
.body  { text-align: left; }                  /* ragged-right reads better than justified */
```

Never justify short social copy (it opens ugly rivers). For a big pull-quote,
let the opening `“` hang into the left margin (negative text-indent if
`hanging-punctuation` is unsupported in the render path — it is in Chromium for
`first`).

---

## 6. Numbers, ligatures, small-caps (OpenType)

```css
.stat   { font-feature-settings: "tnum" 1, "ss01" 1; font-variant-numeric: tabular-nums; }
.body   { font-feature-settings: "liga" 1, "kern" 1; }
.eyebrow{ font-variant-caps: all-small-caps; letter-spacing: .12em; }  /* TRUE small-caps */
```

- **Tabular figures** (`tnum`) for stat cards / aligned numbers so digits don't jitter.
- **Lining vs old-style**: use lining figures in UI/CTA, old-style (`onum`) only in
  long editorial body if the face supports it.
- **True small-caps** (`all-small-caps`) beats CSS `text-transform:uppercase` at a
  shrunk size — only if the font ships the feature; otherwise uppercase + tracking.
- Always keep `kern` and standard `liga` on.

---

## 7. Measure (line length)

Body copy: **~28–45 characters** per line on a social canvas (much shorter than web
~66 — the canvas is narrow and read fast). If body runs wider, shrink the column
or the text. Headlines: 2–4 words per line max.

---

## 8. The type self-audit (add to the critique pass)

When you VIEW the PNG (Step 6), check specifically:

- [ ] No widow (one-word last line) on any headline — re-run `typeset.py --nbsp`.
- [ ] No orphan (one word on the body's last line).
- [ ] Curly quotes/apostrophes and real dashes — zero `"`, `'`, `--`, `...`.
- [ ] Big headline tracking is tightened (not loose default).
- [ ] Caps eyebrow is tracked open, not set solid.
- [ ] Display line-height is tight; body breathes (~1.45).
- [ ] Stat numbers use tabular figures and align.
- [ ] Display face is distinctive and actually rendered (not a fallback).
