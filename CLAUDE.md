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
  arrives.
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
  `useScroll` only.
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

`npm run qa:approach` gates the approach section the same way: slow
scroll, a fast jump, reversing, a direction change mid-transition, how
fast the line settles after stopping, that revealing copy shifts nothing,
that 04 is readable before release, the handoff at the track end, and the
narrow / short / reduced-motion layouts. It imports its thresholds from
`src/lib/motion.ts`, so it cannot drift from the component.

`npm run qa:projects` gates the projects drum: pinning, whole-project
rounding (no half positions), the spring settling flat on the active card
with its neighbours tilted back at `PROJECTS.step`, reverse and a
mid-spring reversal, the copy crossfade, and the narrow / reduced-motion
lists.

All three need a local Chrome (no browser is bundled); the path is keyed
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

## The approach section

`Approach.tsx`, the pinned four-step timeline after the hero. Same shape
as the splash: the section is a track `APPROACH.pinVh` viewports tall and
`.approach-stage` sticks at the top of it (under the fixed header, hence
its `padding-top: var(--header-h)`). Scroll progress through the track,
put through a stiff, near-critically-damped spring, is the one source of
truth: it scales the orange fill directly (`scaleX`, left origin, spanning
marker 01 to 04 as 12.5% to 87.5% of four equal columns), and each step's
state — `off`, `current`, `done` — is read off the same value as the fill
crosses each marker's third, in either direction. Motion variants only
dress those state changes (a marker pulse, a title then description
reveal) and every one is short and reversible; nothing queues.

The spring is deliberately stiff (700/55, ~40ms time constant). A softer
one was tried and took over half a second to catch up after a long scroll
jump, so the line visibly kept moving after the page had stopped — the
brief rules that out, and the QA script measures both the lag while
moving and the settle after stopping.

Two rules worth keeping: the orange on a marker is a disc whose opacity
fades in over the dark base, so activation stays transform/opacity only;
and step copy is always in flow at full size, only its opacity/translate
change, so revealing it never shifts layout (the QA compares title boxes
hidden vs. revealed).

Where four-across can't fit, the section unpins and flows: `FLOW_QUERY` in
the component (narrow or short viewport) and the matching media rules in
`globals.css` must stay in step. Narrow gets a vertical timeline with the
marker drawn inside each step (the horizontal track is hidden), each step
lighting as it scrolls into view; short-but-wide keeps four across, just
unpinned; reduced motion shows all four lit at once. Copy is in
`content/approach.json`, timings in `APPROACH` in `src/lib/motion.ts`.

## The projects section

`Projects.tsx`, after the approach: a pinned drum of project cards, after
gabrielbeaugonin.com's. There, the page is a fixed 100vh and each wheel
tick turns the drum one project; here native scroll is kept, so the
section pins (a track one viewport plus `pinVhPerItem` per project) and
scroll progress, ROUNDED to a whole project, is the drum's target — one
project per stretch of scroll, no half-positions — with a spring carrying
the drum there. Every card's `rotateX`/`translateZ` and fade are read off
that one sprung value: the active card flat at the front, neighbours
tilted `step` degrees back above and below at `radius`, which is what
makes them read as the flattened strips the reference shows. The drum
sits `translateZ(-radius)` inside a `perspective` viewport so the front
card lands on the page plane. The copy on the left (title, description,
tag, from `content/projects.json`) crossfades to the active project via
`AnimatePresence`; the reference keeps its copy fixed, the Figma ties it
to the project. Same unpin rules as the approach (`FLOW_QUERY` + the
media block): a plain card-then-copy list when narrow, short, or under
reduced motion. The section carries `id="work"`, the nav's Projects
target. Numbers in `PROJECTS` in `src/lib/motion.ts`; the drum's radius is
duplicated in `.projects-drum`'s `translateZ` and must move with it.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
