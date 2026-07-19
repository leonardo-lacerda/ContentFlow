# Motion — animated covers, kinetic type, loops (for Reels & stories)

The skill ships static PNGs by default. When the user wants **motion** — a Reel
cover, an animated story, kinetic type, a stat count-up, a drifting gradient —
build the page with normal CSS `@keyframes`, then export it with
`scripts/animate.py`. Same premium rules apply; motion is the finish, not a
substitute for hierarchy and type.

```bash
python "$SKILL/scripts/animate.py" out/cover.html --size 1080x1920 --duration 3 --fps 24 --out out/cover.gif
python "$SKILL/scripts/animate.py" out/cover.html --duration 2.5 --mp4 --webm --out out/cover.gif
```

- **GIF** always exports (Pillow). **MP4 / WebM** export only if `ffmpeg` is on
  PATH — otherwise they're skipped with a note and the GIF still ships. For feed
  Reels, MP4 is far lighter than GIF; install ffmpeg when the user wants video.
- Frames are scrubbed **deterministically** via the Web Animations API
  (`animation.currentTime` per frame), so output is reproducible — not a flaky
  real-time capture. Build with plain CSS `@keyframes`; no JS animation needed.

---

## Durations (social attention is short — keep it snappy)

| Move | Duration | Notes |
|---|---|---|
| Title / kinetic type entrance | 0.5–0.9s | the hook must land in the first second |
| Element reveal (card, badge, bar) | 0.3–0.6s | stagger siblings ~80–120ms apart |
| Stat / number count-up | 0.8–1.4s | ease-out so it decelerates into the value |
| Gradient / mesh drift (ambient) | 6–12s, looped | slow + subtle, never distracting |
| Full cover loop | 2.5–4s | long enough to read, short enough to repeat |

Total cover animation: **2.5–4s**. A Reel cover only needs to resolve to its
final, legible frame fast — front-load the motion, then hold.

## Easing (never linear for UI motion)

- Entrances: `cubic-bezier(.2,.8,.2,1)` (decelerate — fast in, soft stop).
- Exits: `cubic-bezier(.4,0,1,1)` (accelerate out).
- Ambient loops: `ease-in-out` with `alternate` so the drift breathes.
- Linear only for continuous rotation / marquee.

## Stagger

Reveal grouped elements in sequence, not all at once — `animation-delay` stepped
80–120ms (eyebrow → headline → bar → CTA). It reads as choreographed, not jumpy.

## Seamless loops (so a Reel cover repeats cleanly)

- Make the **last frame equal the first**: use `alternate` direction, or design
  keyframes where `100%` returns to the `0%` state.
- Ambient drifts (hue-rotate, translate, scale on a bg layer) loop best — keep
  amplitude small (e.g. `hue-rotate(0→40deg)`, `translateY(0→-12px)`).
- For a "resolve and hold" cover, use `forwards` fill on the entrance so it stops
  on the final composed frame — then loop only the ambient background.

## The hold frame must pass static QA

The final frame is what people screenshot and what the feed shows paused — it must
pass the same bar as a static post. **Render that frame and run the critique loop
+ `qa.py` on it** (`reference/art-direction.md`). Motion never excuses weak
hierarchy, low contrast, or a flat hold frame.

## Accessibility / taste

- Respect reduced-motion intent: keep amplitude gentle, avoid harsh flashing
  (nothing strobing faster than ~3Hz).
- One or two motion ideas per cover. Everything moving at once = noise.
- Text must be readable while still — never animate the headline so fast it's a
  blur during the readable window.

## File-size guidance

- GIF is heavy (256 colors, no real compression). Keep GIFs short (≤3s), low fps
  (16–24), and `--scale 1`. `animate.py` warns past ~15 MB.
- For anything longer or smoother, export **MP4** (`--mp4`) — needs ffmpeg, but is
  a fraction of the GIF size and what Reels actually want.
