# Facebook Comment Mockup Generator

Generates realistic Facebook comment mockups — randomised name, AI face, message,
timestamp and reaction count — and exports them as PNGs.

**The rendering is reverse-engineered from facebook.com, not eyeballed.** Geometry,
type scale, colours, the reaction icons and the footer thumb icons were all taken
from a live capture of a real comment thread (2026-08-27, light mode, Chrome/macOS)
by reading computed styles off the DOM. See *What was measured* below.

**Open this file:** `dist/facebook-comment-mockup.html`

Double-click it. It's one self-contained file: no server, no internet, no build
step to use it. Every face is baked in as data, so it also works from a USB stick
or emailed to someone.

---

## Using it

**Generate** — set a number, hit Generate. The page grows down the screen; each
comment is its own card. `+ Add batch` appends more without clearing what's there.

**Who's commenting** — Gender, Age, Region and Heritage filter *both* the face pool
and the name pool. The green/amber line under Heritage tells you how many faces
actually match before you generate.

Names are bucketed by age cohort, so a 58-year-old comes out "Debbie Wilson" and a
24-year-old comes out "Madison Pham" — the way real Facebook names actually skew.
When a filter is set to *Any*, the name is generated from the **face's own tags**,
so the name always matches the person you're looking at.

**What they say** — tick the tones you want, or paste your own comments into the
box (blank line between each). Your own pool overrides the built-in tones.

---

## What was measured

Everything in `M` and `THEMES` in `src/app.js` came off the real page:

| | Facebook's value |
|---|---|
| Avatar | 40px top-level · 24px on replies |
| Gap, avatar → text column | 14px |
| Author name | 13px / 600 / 16px line-height |
| Timestamp | 12px / 400, sits **on the name line** after a `·` |
| Comment body | 15px / 400 / 20px line-height |
| `Like` / `Reply` | 12px / 600 |
| Reaction count | 13px / 400 |
| Reaction icons | 16px, 14px step (2px overlap) |
| Text colour | `#080809` light · `#E4E6EB` dark |
| Secondary text | `#65686C` light · `#B0B3B8` dark |
| Comment bubble (classic) | `#F0F2F5`, radius `16px` (`--comment-bubble`) |
| Tagged mention | `#0064D1`, weight 600 |
| Font | `system-ui, -apple-system, BlinkMacSystemFont, ".SFNSText-Regular", sans-serif` |

Two things worth knowing:

**Current Facebook has no grey comment bubble.** The bubble was removed — comments
now sit on the plain card background with the timestamp beside the name. Most
mockup generators (and the older screenshots you'll find) still draw the bubble.
Both are available here; **Current Facebook** is the default, **Classic (grey
bubble)** is the old look.

**The reaction icons are Facebook's own SVGs**, lifted verbatim from the capture —
Like, Love, Haha, Wow, Sad and Angry. Care is reconstructed from Facebook's own
face gradient and heart path, because nobody used Care on the captured post. The
footer thumb icons are Facebook's real 24×24 path data.

On macOS Facebook renders comments in the **system font**, not its Optimistic
brand font — so the system stack above is what actually matches.

---

## Adding more faces

The pool ships with 92 AI-generated faces. **None of them are real people.**

Download a batch, then tag them a demographic at a time:

```bash
cd ~/Projects/fb-comment-mockup
python3 add_faces.py ~/Downloads/newfaces --gender f --heritage white --age 60+
python3 build.py
```

Files are **moved**, so your Downloads folder stays clean. Run `add_faces.py` once
per batch — everything in one call gets the same tags.

Tag values:
- `--gender` `f` `m`
- `--heritage` `white` `black` `hispanic` `eastasian` `southasian` `mideast` `mixed`
- `--age` `18-29` `30-44` `45-59` `60+`

Good sources for genuinely AI-generated (non-real) faces: **generated.photos**,
**thispersondoesnotexist.com**, **uifaces.co** (AI section).

### What's in the pool

| | faces |
|---|---|
| Women 18–29 / 30–44 / 45–59 / 60+ | 14 / 15 / 27 / 5 |
| Men 18–29 / 30–44 / 45–59 / 60+ | 6 / 6 / 13 / 6 |

Heritage skews white (69 of 92). Black, Hispanic, South Asian and Middle Eastern
are 5 or fewer each, so a narrow heritage filter will hit the duplicate warning
quickly — that's the next gap to fill.

---

## Editing the tool

```
src/index.html        UI shell + styles
src/app.js            renderer, randomiser, ZIP writer
src/data-names.js     name banks (first names by heritage × age cohort, surnames)
src/data-messages.js  default message pool
src/data-reactions.js Facebook's real reaction + thumb icons
faces/manifest.json   every face and its tags
build.py              bakes it all into dist/ as one file
```

After changing anything in `src/` or `faces/`, run `python3 build.py`.

Comments render straight to `<canvas>` rather than HTML-to-image, which is why
there's no CDN dependency and the exports are pixel-exact at any scale.

---

## Assets and attribution

**Faces** — 92 AI-generated portraits. None are real people. They come from
StyleGAN-family generators (thispersondoesnotexist / generated.photos-style
sources). Tags in `faces/manifest.json` are my own judgement calls from looking
at each image, not model output.

**Facebook's artwork** — the reaction icons in `src/data-reactions.js` and the
footer thumb paths are Meta's own SVG assets, taken from a facebook.com page
capture so the mockups match the real thing. They are Meta's intellectual
property and are included here for interoperability — replace them if you need
this repo to be free of third-party assets.

**What this is for** — mockups: ad concepting, design comps, presentations,
swipe files. Comment images generated here are fabricated. Presenting them as
genuine customer testimonials in advertising is an FTC endorsement-rule problem
in the US and the equivalent elsewhere; that's on whoever publishes them.
