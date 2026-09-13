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
- The greeting layer has `pointer-events: none`. Without it the faded greeting
  sits over the hero and swallows every click.
- Video playback starts from the effect, never from an `autoPlay` attribute,
  so reduced motion is honoured before hydration.
- Timings live in `src/lib/motion.ts`. Tokens live in `src/app/globals.css`.

## QA

With the dev server up (`npm run dev`, port 3220): `npm run qa`.
19 checks: screen fit against the bezel, the push, arrival, the hero content
taking the click, mobile, reduced motion, console errors. Tolerance defaults to
exact; a check that needs slack asks for it.

## Placeholders

`src/app/icon.svg` is still a placeholder mark. The greeting ("Nice to meet
you") was carried over from the portfolio.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
