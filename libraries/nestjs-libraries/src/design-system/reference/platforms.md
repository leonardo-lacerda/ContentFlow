# Platform Sizes & Safe Zones

Always design at the exact pixel size. Never "close enough" — platforms crop and
compress, and off-spec art looks amateur instantly.

*Specs verified June 2026 — re-check yearly; platform crops drift.*

## Full size table

| Platform | Format | Size (px) | Aspect | Notes |
|---|---|---|---|---|
| Instagram | Portrait post / carousel | **1080×1350** | 4:5 | Best default — most feed real estate |
| Instagram | Square post | 1080×1080 | 1:1 | Classic; safe for grid uniformity |
| Instagram | Story / Reel cover | 1080×1920 | 9:16 | Heavy UI overlay — see safe zones |
| Instagram | Landscape | 1080×566 | 1.91:1 | Rarely optimal |
| Facebook | Feed post | 1200×630 | 1.91:1 | Also the OG/link-share size |
| Facebook | Story | 1080×1920 | 9:16 | |
| X / Twitter | Single image | 1600×900 | 16:9 | In-feed shows ~16:9 |
| X / Twitter | Portrait | 1080×1350 | 4:5 | Allowed, more height |
| LinkedIn | Feed post | 1200×1500 | 4:5 | Portrait performs best |
| LinkedIn | Link card | 1200×627 | 1.91:1 | |
| Pinterest | Standard pin | 1000×1500 | 2:3 | Vertical is mandatory |
| Pinterest | Long pin | 1000×2100 | ~1:2.1 | |
| YouTube | Thumbnail | 1280×720 | 16:9 | < 2MB, readable tiny |
| YouTube | Community post | 1080×1080 | 1:1 | |
| TikTok | Cover / image | 1080×1920 | 9:16 | |
| Threads | Post | 1080×1080 | 1:1 | Also accepts 4:5 |

## Profiles & headers (when a post needs a matching banner)

| Platform | Asset | Size (px) | Title-safe |
|---|---|---|---|
| X / Twitter | Header | 1500×500 | center |
| LinkedIn | Personal banner | 1584×396 | left two-thirds |
| YouTube | Channel art | 2560×1440 | center **1546×423** |
| Facebook | Page cover | 1640×856 | center |

## Safe zones

Keep all critical content (headline, logo, CTA) inside the **central ~80%**.
Outer margin = breathing room + crop insurance.

### Default margins (per 1080px width)
- Outer padding: **64–96px** all sides minimum.
- Generous is premium. Cramped-to-the-edge is cheap.

### Stories (1080×1920) — IG / FB / TikTok story
- **Top ~250px** — profile pic, username, close button.
- **Bottom ~250px** — reply bar / "Send message" + caption.
- **No right-side action rail** on plain stories.
- → Safe creative band ≈ **y:250–1670**, centered.

### Reels / TikTok cover (1080×1920) — more aggressive & asymmetric
- **Top ~108px**, **bottom ~320px** (caption + audio + CTA), **right ~120px** (like/comment/share/audio rail), **left ~60px**.
- → Safe band ≈ **900×1492**, offset slightly LEFT of center (away from the right rail).

### Instagram carousel (1080×1350)
- The in-feed caption + like/comment row sits directly beneath a 4:5 card. Keep CTAs **~80–120px off the bottom** so they don't compete with that UI.

### YouTube thumbnail (1280×720)
- Bottom-right ~ **180×60px** gets the duration stamp — keep faces/text out of it.
- Must read at **120px wide** (sidebar). Test by shrinking. Big face + ≤4 words wins.

## Output quality & file-size caps
- Render at **deviceScaleFactor 2** (so 1080×1350 → 2160×2700 actual pixels), then the platform downscales for crispness.
- File-size caps to respect (a busy 2× PNG can blow past these — compress if so):
  **YouTube 2MB · LinkedIn 3MB · X/Twitter 5MB · Pinterest <5MB recommended · Instagram/Facebook generous.**
