# Splash + hero

A desk video with a monitor. The hero is shown on the monitor, and scrolling
flies into the screen until the hero is the page.

Built with Next.js, React and Motion.

## Run it

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
npm run dev
```

Then open http://localhost:3220

## Put your own hero on the monitor

The hero is a slot. Open `src/app/page.tsx` and replace `AnimatedHero`
with your own component:

```tsx
<SplashScreen data={splash}>
  <YourHero />
</SplashScreen>
```

Design the hero as **one full screen** (100vw by 100vh) and give its root
`height: 100%`. `SplashScreen` scales and positions it for you as the scroll
carries it from a small hero on the monitor to full size as the page; don't
add a competing transform to the hero's own root.

The pinned splash runs on every screen width, mobile included. Only visitors
who turn off motion get the plain fallback: video above, hero as the page
below it.

## What shows on the monitor before you scroll

Whatever you pass to `SplashScreen`'s `screen` prop — on this site, a
one-line greeting (`content/greeting.json`, rendered by `MonitorGreeting`).
It is laid over the hero inside the same stage, so it is cropped and scaled
by exactly the hero's clip and transform, and it dissolves as you start to
scroll in, leaving the hero — the same element that then becomes the page.
Leave `screen` out and the monitor simply shows the hero, shrunk to fit.

## Using a different video

`content/splash.json` also records where the monitor sits inside the video,
at the first frame (`t0`) and the last (`t1`), as percentages of the frame.
They are measured for `hero.mp4`. A different video needs both rectangles
measured again, or the hero will not line up with the screen.

## Tuning the move

`src/lib/motion.ts`: where the push starts and ends in the scroll, and how
long the section stays pinned.
