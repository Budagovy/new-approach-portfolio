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

- **It is one full screen.** In the pinned splash its parent is exactly
  100vw by 100dvh. Fill it with `height: 100%`. A shorter hero leaves a gap as
  the reader arrives.
- **It is never scaled.** It is drawn once at full size and revealed through a
  clip, which is why type stays sharp. Do not add a transform to its root.
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

## Rules carried over from the portfolio

- No copy in component files. Strings live in `content/`.
- No em-dash in visible copy.
- Animate transform and opacity only. No scroll event listeners: Motion
  `useScroll` only.
- The preview layer has `pointer-events: none`. Without it the faded preview
  sits over the hero and swallows every click.
- Video playback starts from the effect, never from an `autoPlay` attribute,
  so reduced motion is honoured before hydration.
- Timings live in `src/lib/motion.ts`. Tokens live in `src/app/globals.css`.
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

## Placeholders

`src/app/icon.svg` is still a placeholder mark.

## The monitor preview

Before the push begins, the monitor shows the hero itself, not separate copy:
`SplashScreen` renders a second copy of `children` in `.splash-preview-stage`,
shrunk with a scale transform to fit inside the screen rectangle. It fades
out as the push starts, handing over to the full-size hero underneath.

`.splash-preview-stage` has no width or height of its own: it shrink-wraps to
whatever `children` naturally renders at, which is the hero's own content box
(e.g. `hero-body`), not the full viewport. It used to be pinned to 100vw,
which measured the wrong box — a `.hero` that stretches to fill its parent
rather than the narrower content centred inside it — so the scale came out
far too small, leaving the preview tiny in a sea of empty cream. `vw`-based
CSS inside the hero (`--wrap`, `--fs-display`) still resolves against the
true viewport regardless of this box's own width, so nothing downstream
needed to change.

The fit itself is measured, not guessed: a `ResizeObserver` on that stage
feeds its real width and height into the scale calculation, so it fits both
dimensions of the monitor rectangle. Matching width alone breaks on a
portrait phone, where the monitor slice is a different shape than on desktop
and content would spill past the top and bottom.

**The handoff.** The full-size hero underneath is never scaled or moved: full
size, centred in the viewport, always. If the preview faded out without
matching that first, the two would be visibly different sizes wherever they
overlapped mid-fade — a small preview crossfading into a much larger
fragment of the real hero peeking through the growing clip. So the preview's
scale and position walk from "fit the monitor" to "match the real hero
exactly", and that walk (`ALIGN_END`) completes well before the opacity fade
(`FADE_END`) does. Alignment finishes while the real hero underneath is
barely visible yet; by the time the fade makes it visible, there is nothing
left to see a seam in. Widening `ALIGN_END` to the same span as the fade
reintroduces the double-exposure glitch this fixed.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
