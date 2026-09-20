# New site - project rules

Starter for a second site that reuses the portfolio's splash: the desk video,
the hero shown on the monitor, and the scroll that walks into the screen.
The splash came from `~/Desktop/New Portfolio/src/sections/SplashScreen.tsx`.
Here the hero is a slot, so the splash does not know what it is showing.

## The hero slot

`src/app/page.tsx` is the composition:

```tsx
<SplashScreen data={splash} id="top">
  <AnimatedHero data={hero} />
</SplashScreen>
```

The contract for whatever goes in the slot:

- **It is one full screen.** In the pinned splash its parent (`.splash-hero-stage`)
  is exactly the splash stage's size — the viewport, less any scrollbar.
  Fill it with `height: 100%`. A shorter hero leaves a gap as the reader
  arrives — which is now used on purpose from 860px up: the hero is a
  `--section-h` (500px) block at the top of the stage and the next section
  is pulled up to fill the gap. See "Section heights".
- **Its root is never transformed by the hero itself.** `SplashScreen` applies
  the scale and position that grow it into view; do not add a competing
  transform to the slot's own root, or the two will fight.
- **Under reduced motion only** the room sits above and the hero is simply
  the page, at content height. Every other width, including mobile, gets the
  pinned splash. The hero must work in both.

## The video and its calibration

`content/splash.json` holds the footage and where the monitor sits in it.
`screen.t0` is the screen rectangle at the first frame, `screen.t1` at the
last, as percentages of the frame. The take is a slow dolly, so the clip
interpolates between the two on the video clock.

Same video: change nothing. A different video: measure both rectangles again,
or the panel will sit off the bezel. `qa/splash.mjs` fails when it does.

**A small calibration bias, and how it was found.** A light sliver was
reported along the monitor's inner-left edge. Sampling rendered pixel
luminance directly across all four edges — not just the reported one, and at
both `t0` and `t1`, not just one frame — before touching anything showed top
and bottom were already correct to a fraction of a pixel, while left was off
by several pixels and right by under one. That is not what symmetric
antialiasing looks like (which would show evenly on all four sides); it is
what a slightly left-biased original measurement of `cx`/`w` looks like. A
uniform bleed was tried first and reverted for exactly this reason — large
enough to help the reported edge, it would have started painting hero
background over bezel that was already exactly right on the other two sides.
Fixed at the source instead: `cx`/`w` nudged by a few hundredths of a
percentage point in `content/splash.json`, verified by re-sampling the same
four edges afterward, not by re-running the app and eyeballing it. `t0` and
`t1` needed slightly different corrections (re-measured independently,
not assumed equal) — the interpolation between them is linear, so getting
both endpoints right is what keeps the mid-zoom frames right too.

## Rules carried over from the portfolio

- No copy in component files. Strings live in `content/`.
- No em-dash in visible copy.
- Animate transform and opacity only. No scroll event listeners: Motion
  `useScroll` only. (Lenis, in `SmoothScroll.tsx`, is the one thing that
  handles wheel input — it *drives* the scroll position rather than
  reading it, and everything else still reads it through `useScroll`.)
- Video playback starts from the effect, never from an `autoPlay` attribute,
  so reduced motion is honoured before hydration.
- Timings live in `src/lib/motion.ts`. Tokens live in `src/app/globals.css`.
- Don't trust `window.innerWidth`/`innerHeight` for geometry; measure the
  element you're laying out in. `SplashScreen` learned this: mobile Chrome
  settles its viewport in steps and reports an interim inner size while
  the CSS viewport is already final, with no `resize` to follow, so a
  component that hydrated during that step kept a wrong height and put the
  monitor's clip window in the wrong place (the QA's mobile fit check
  caught it — and only in dev, where hydration lands earlier). `innerWidth`
  also includes a scrollbar the page column doesn't. The splash now reads
  its stage's own `clientWidth/Height` and sizes the room and hero stage
  against that same box, so the numbers agree by construction.
- No non-deterministic value (`Date.now()`, `Math.random()`, `window.*`) in a
  render or in `useState`'s initial value. The server renders at a different
  moment than the client hydrates; `useRotatingIndex` learned this by
  computing its index from `Date.now()` inside `useState`, which disagreed
  between server and client whenever that gap crossed a word boundary and
  surfaced as a real hydration mismatch, with the animated word sometimes
  painting wrong. Start deterministic (`useState(0)`), correct it inside an
  effect, client-only.

## QA

With the dev server up (`npm run dev`, port 3220): `npm run qa`.
20 checks: screen fit against the bezel, the push, arrival, the hero content
taking the click, mobile, reduced motion, console errors. Tolerance defaults to
exact; a check that needs slack asks for it.

`npm run qa:approach` gates the approach section the same way: that it
is exactly one screen at 1440x900 and 1280x720 with the next section
starting at its end, the entrance, the timed sequence (steps lighting
1,2,3,4 as the line runs, never backwards, complete and held at the end,
not replaying on a return), that revealing copy shifts nothing, and the
narrow / short / reduced-motion layouts. It imports its timings from
`src/lib/motion.ts`, so it cannot drift from the component.

`npm run qa:projects` gates the projects grid: label and no heading,
hidden before it scrolls in and all three revealed after, three across
at 2:3 with titles and tags and loaded images, the grid centred in the
column under its 1150px cap with the 8px gutter, three columns down to
768 and one at 390, and the cards simply there under reduced motion.

`npm run qa:scroll` gates page scrolling under Lenis: a wheel tick glides
through many positions, decelerates and settles on exactly its distance;
native `scrollTo` still lands exactly (every other gate relies on it); a
nav anchor glides to its section and lands below the fixed header; and
under reduced motion Lenis is not started.

All four need a local Chrome (no browser is bundled); the path is keyed
by platform and can be overridden with `QA_CHROME`.

## Placeholders

`src/app/icon.svg` is still a placeholder mark.

## The continuous hero

One hero instance, always — not two. Earlier versions of this rendered a
small scaled-down "preview" copy for rest plus a full-size never-scaled copy
revealed through a growing clip, and handed off between them (first a fade,
later an instant swap) at some point in the scroll. Both approaches showed a
real, confirmed-by-screenshot glitch: two independently-computed layers can
only ever coincide by coincidence, so any handoff between them — gradual or
instant — is visibly two different sizes of the same content for at least a
moment, or a visible jump between them.

`heroTransform` in `SplashScreen.tsx` removes the handoff by removing the
second layer: the SAME hero is scaled and positioned continuously from "fits
the monitor" at rest to "is the page" at arrival, computed from the exact
same `roomScale` and monitor rectangle the clip uses. Hero and window cannot
mismatch, because they are not two curves hoped into agreement — they are
the same numbers.

**Two nested elements, not one.** `clip-path` insets are computed in
viewport-absolute pixels (same `rectAt`-based math as before), which only
stays correct as long as the clipped element's own local `(0,0)` is the
viewport's `(0,0)`. Putting the position/scale transform on that same
element breaks that: its local origin moves away from the viewport's, and
the clip crops the wrong region — confirmed directly, the hero rendered
squeezed into one side of the monitor with the raw footage bleeding through
the rest. So `.splash-hero` does ONLY the clipping (still exactly `inset:
0`, untouched); `.splash-hero-stage`, one level down, does ONLY the
transform, and gets cropped by its parent's clip-path like any overflowing
child would.

**The scale.** `.splash-hero-stage` is always 100vw by 100dvh (so its
internal vw/vh-based CSS resolves against the true viewport regardless of
the scale applied to its box), scaled to COVER the monitor's current window
— `Math.max(w / vw, h / vh)` — the same "cover" logic the room's own video
sizing already uses, capped at `Math.min(1, …)` so type is never magnified
past its own painted resolution. That cap is what makes scale reach exactly
1 (native, unmagnified) at the exact instant the window has grown to fill
the viewport, not before and not asymptotically after.

A third influence, `CONTENT_WEIGHT`, nudges scale down a little further when
the monitor rectangle is much squarer than the hero's own content — cover-by-
width alone can crop the bottom of the content (the subtitle, gone below the
bezel) on some monitor shapes, well before scale reaches 1. Capping it
outright (content never taller than the window) was tried and produced a
worse failure: shrinking the WHOLE hero to fit vertically opens a gap on the
other axis that shows the raw video through the bezel — a visibly broken
screen instead of one clipped line of copy. `CONTENT_WEIGHT` (0.8) blends
partway toward that cap instead of committing to it, measured via a
`ResizeObserver` on `.hero-body` (a real, if narrow, coupling to the hero's
internal markup — kept to this one class name). It can only ever pull scale
DOWN from the cover-fit value, never past what covering the window would
already give, so it cannot cost scale reaching exactly 1 at arrival either.

**The position.** Driven by `push` (0 at rest, 1 at the end of the track),
NOT by the scale value above: scale starts the walk already partway in (the
monitor's natural fit ratio at rest is never 0), so an early version that
reused it for position too pulled the hero visibly off the monitor and
partway toward centre from the very first frame — at rest, before any
scrolling had happened. `push` is genuinely 0 at rest and reaches exactly 1
at the end of the track, so position starts exactly on the monitor and
finishes exactly at `(vw/2, vh/2)` — the same place an ordinary unscaled,
centred, full-page hero sits — so nothing jumps when the pin releases and
ordinary scrolling resumes.

**Blur removed.** The room's blur-while-passing-the-camera effect is gone
for now, deliberately, while this geometry was the thing being verified —
reintroduce once continuity itself is confirmed solid, not before, since
blur previously masked exactly the kind of seam this section exists to
avoid.

**The resting screen.** The monitor at rest shows a greeting rather than
the hero (`SplashScreen`'s `screen` slot; `MonitorGreeting`,
`content/greeting.json`). This is not the two-layer preview this section
warns against coming back: that was the SAME content at a SECOND,
independently computed geometry, handed off mid-zoom, which is what
ghosted. The greeting is a different picture laid over the hero INSIDE
the hero stage — cropped and scaled by the identical clip and transform,
so it cannot sit anywhere but exactly where the hero sits — and it only
fades (opacity, `HERO.screenOut`), early in the push, gone before the
monitor fills the view. It stops taking pointer events the moment it is
no longer visible, so the hero beneath takes clicks from then on. Under
reduced motion there is no monitor, so no greeting.

## The page column

Every section's content sits in one centred column, `.page`, sized to
pleurat.com's container as measured on the live site (not assumed):
edge to edge with a flat 25px inner padding below 962px, then 98vw/40px,
96vw/52px, and from 1536px a 1524px cap reached via 88vw/68px. So at
1440 the column is 1382px wide with ~29px outer margins and content 52px
in from its edge. `--page-max` is the column's width and `--page-pad` the
inner padding every section's content sits behind (nav row, hero copy,
approach label/timeline/copy alike). Backgrounds and the splash video
stay outside the column, across the viewport; the column carries side
rules (`.page-frame`, only from 962px up, where it has a margin to sit in)
and each section draws its own top rule on it, so the outer boundaries
line up from the nav row through the hero and the approach stage to
whatever comes next. An 840px column with 300px gutters, taken from the
Figma frame, was tried in between and replaced at the user's request:
the live reference is the source of truth for spacing.

Pinned sections keep their stage viewport-wide — that's what makes them
pin, and the splash's zoom geometry depends on its stage being exactly the
viewport — but the section as the reader sees it is the column inside the
stage. The hero's column starts at the top of the hero stage and the
approach column at the top of its stage (with the fixed header's clearance
as padding inside the column), so the side rules run continuously from
one into the next. Note the frame's type scale is smaller than this site's
tokens; the column was sized to the frame and the type left as it was,
which fits, with the rotating headline checked for wrapping.

## Smooth scrolling

`SmoothScroll.tsx`, mounted once in the root layout, runs Lenis: wheel
and trackpad input is eased toward its target (`SCROLL.lerp` in
`src/lib/motion.ts`) so moving between sections glides, the way the
reference portfolios do. Lenis drives the real window scroll position, so
the pinned splash (Motion `useScroll`), the in-view reveals
and the QA scripts' `scrollTo` calls all keep working unchanged — Lenis
syncs to a scroll it didn't cause. Touch is left native (`syncTouch`
off), keyboard is the browser's, and anchor links glide with an offset
for the fixed header. Under reduced motion it is not started at all, so
scrolling is then exactly the browser's own (the skill guidance and WCAG
both count scroll-jacking as a motion-sensitivity hazard).

## The site header

`SiteHeader` (`src/components/SiteHeader.tsx`) is rendered as a sibling
before `<main>`, not inside the splash. It is `position: fixed`, not part
of document flow, on purpose: giving it real flow height would push the
splash's pinned track down and change what `100dvh` means relative to it,
which is exactly the kind of change the geometry above is tuned against.
Floating it instead costs nothing in that math — the splash never has to
know it exists — and it stays visible over both the video and the hero via
`z-index`, the only one set anywhere in the stylesheet.

Anchor links jump via the browser's own hash scroll; `scroll-padding-top`
on `<html>` (set to `--header-h`) keeps a jump from landing a section under
the fixed bar. Nav links collapse below 720px, leaving the logo and the
Contact button.

## The city strip

The skyline with the walking figure along the foot of the hero is
`<portfolio-city-strip>`, a dependency-free web component delivered and
approved separately, kept as delivered: `src/components/city-strip/
city-strip.js` (plain JS, described by the sibling `.d.ts` since `allowJs`
is off). The one adaptation is asset resolution — the original resolved
`./assets/` against `import.meta.url`, which means nothing once bundled, so
it defaults to `/city-strip/` under `public/`: `city.svg` (the skyline,
tiled and mirrored for the loop) and `character-walking.mp4` (the walker;
the component keys its near-white backdrop out on a canvas at runtime, so
the video must stay same-origin).

`CityStrip.tsx` is the React wrapper. The component module touches
`document` at import time, so it is only imported inside an effect; the
element is server-rendered as an unknown tag, and `globals.css` gives it
`display: block` and a `min-height` so its space is held before the
upgrade. The six headings live in `content/experience.json` and are
assigned as a property once the element is defined (an attribute can't
carry an array). The component's own micro-copy — "NEXT PROJECTS", "Hey
there!", the pause labels — stays inside its template: the one exception
to the strings-in-`content/` rule, accepted to keep the approved file
intact. City scroll speed is `CITY.speed` in `src/lib/motion.ts`; the
1.5s heading cadence is fixed inside the component.

Layout: the hero is two grid rows, copy then strip. `.hero-main`'s top
padding equals `--strip-h`, so the copy centres on the FULL screen rather
than on the space left above the strip — the pinned splash centres the
monitor on the hero's centre, and the Figma frame centres the headline in
the whole viewport. `--strip-h` mirrors the component's own heading + scene
heights and has to move with them. Viewports 720px tall or shorter drop
that symmetry and centre in what's left; reduced motion drops it too, the
hero then being plain content at its own height. Inside the monitor at
rest, the strip's heading row shows along the bottom edge and the skyline
is cropped by the bezel: that is the cover-fit doing its job, since the
strip is part of the one full screen the slot contract asks for.

## Section heights

From 860px up, the hero block, "My approach" and "Selected projects" are
each exactly `--section-h` (500px, in `globals.css`) tall, at the user's
explicit request; they were each one full screen before. Below 860px the
stacked layouts cannot fit a fixed box and run at content height (the
hero stays a full screen there).

Approach and projects are plain in-flow boxes. The hero is the awkward
one: the splash stage must stay a full screen (the zoom lands on it), so
the hero is a 500px block at the top of the stage — the fixed header's
76px included, so the copy is set a step smaller inside it
(`--fs-display` capped at 40px, tighter gaps) to fit header clearance,
copy and city strip — with cream below. `.splash-track` carries
`margin-bottom: min(0px, calc(var(--section-h) - 100dvh))`, which pulls
the approach up so that at the instant the pin releases its top is
exactly 500px down the screen; during the settle after the push it slides
up over the stage's empty foot. `HERO.zoomEnd` (0.6) is chosen so the
push is over before it enters on screens up to ~1080px tall; the formula
is in `motion.ts`. None of the splash maths changed: the stage is still
the full screen, it just has content only in its top 500px, so on the
monitor it reads as a page with its content at the top.

Because the page is now short (2,760px at 1440x900) and Projects is the
last section, the `#work` anchor cannot bring it up to the header: the
page bottoms out first. That resolves itself when About/Contact exist.

`npm run qa:sections` gates all of this at four sizes: the three
heights, content inside each box, hero copy clear of header and strip,
the approach at exactly 500px on release and off screen when the push
ends, no gaps between sections.

## Track lengths

Only the splash is pinned now. Its track was shortened at the user's
request (4.5 to 2.4 screens) after they found it took "a couple of
scrolls" to leave the hero: most of the old track was holding, not
moving. The push spans 0.08 to 0.72 of the track with a short settle at
the end. The approach was pinned too (3.2, then 2.4 screens, the line
scrubbed by scroll) until the user asked for it and the projects to
"fit the screen perfectly": both are now exactly one screen, in flow, so
the page after the splash reads as screen, screen, screen. Numbers in
`HERO` and `APPROACH` in `src/lib/motion.ts`; the gates read them from
there.

## The approach section

`Approach.tsx`, the four-step timeline after the hero: exactly
`--section-h` tall (see "Section heights"), in flow. The
sequence plays on its own, once, when the section comes 40% into view:
the entrance cascade (heading, line, markers) lights step 01, then after
`APPROACH.fillDelay` a single motion value `fill` is animated 0 to 1 over
`APPROACH.fillDuration`. That value is the one source of truth: it scales
the orange fill directly (`scaleX`, left origin, spanning marker 01 to 04
as 12.5% to 87.5% of four equal columns), and each step's state — `off`,
`current`, `done` — is read off the same value as the fill crosses each
marker's third. Motion variants only dress those state changes (a marker
pulse, a title then description reveal), every one short.

It used to be pinned (a 2.4-screen track, the line scrubbed by scroll
through a stiff spring, reversible). The user asked for the section to
fit the screen exactly, which leaves no scroll to scrub with, so time
took scroll's place; the state-off-one-value design is unchanged. The
pinned version is in git before the "one screen" commit if it is ever
wanted back.

Two rules worth keeping: the orange on a marker is a disc whose opacity
fades in over the dark base, so activation stays transform/opacity only;
and step copy is always in flow at full size, only its opacity/translate
change, so revealing it never shifts layout (the QA compares title boxes
hidden vs. revealed).

Where four-across can't fit (under 860px), the section grows to its
content and flows: `FLOW_QUERY` in the component and the matching media
rule in `globals.css` must stay in step. Narrow gets a vertical timeline with the marker drawn inside each
step (the horizontal track is hidden), each step lighting as it scrolls
into view; reduced motion shows all four lit at once. Copy is in
`content/approach.json`, timings in `APPROACH` in `src/lib/motion.ts`.

## The projects section

`Projects.tsx`, after the approach: a plain grid, per the Figma frame —
three 2:3 images in a row, square corners, an 8px gutter, a bold title
and a small uppercase tag under each, under the `02 Selected projects`
label, no heading. Ordinary in-flow section, exactly `--section-h` tall
(see "Section heights"), the grid centred under the label. The grid is
capped twice: at the frame's 1150px (its cards measure ~376px at 1440),
and by the box's height — `.projects-body` works out the card height that
fits under the label with the captions and paddings (`--projects-card-h`)
and the grid's `max-width` is three cards of that height at 2:3 plus two
gutters. At 500px that makes the cards 237px wide, well under the
frame's 376px: the price of the fixed height, and the first thing to
revisit if the user finds them small. The gate checks the fit at five
sizes. The caption allowance (`--projects-caption-h`,
60px) is the title and tag with their margins; change those and it must
follow. Phones (one column) are the exception and run past a screen. The only motion is the cards opening one
after another — a gentle fade with a 12px rise, 180ms apart — the first
time they scroll into view (a single simultaneous fade was tried and the
user asked for the sequence); reduced motion shows them outright. One
column under 700px.

Two earlier designs sat here and were replaced at the user's request:
a pinned 3D drum after gabrielbeaugonin.com, then 21st.dev's card-fan
carousel ported from GSAP to Motion. Both are in git if the idea ever
returns. Content in `content/projects.json` (title, tag, image under
`public/projects/`, optional `href`). The current images are cut from the
Figma frame the user sent — a 1109px-wide capture, so each card is
~290x435 and soft at desktop size — and the frame's names ("Travelito",
"Joyn") differ from the thumbnails sent before; the user's own exports
should replace them under the same filenames. `id="work"` is the nav's
Projects target.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
