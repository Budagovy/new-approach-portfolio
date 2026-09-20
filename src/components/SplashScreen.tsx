"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { HERO } from "@/lib/motion";

/** Where the monitor screen sits in the frame, as percentages of it. */
export interface ScreenRect {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

/**
 * The footage and its calibration travel together. The take is a slow dolly
 * toward the desk, so the monitor grows steadily across it: `t0` is the screen
 * at the first frame and `t1` at the last. Measured every 0.4s and found to be
 * linear to within 0.1%, so two endpoints describe it exactly.
 *
 * A different video needs its own two rectangles. Nothing else changes.
 */
export interface SplashVideo {
  src: string;
  poster: string;
  alt: string;
  /** Pixel size of the footage, for its aspect ratio. */
  frame: { w: number; h: number };
  screen: { t0: ScreenRect; t1: ScreenRect };
}

export interface SplashData {
  video: SplashVideo;
}

/**
 * The room, with whatever hero it is given displayed on the monitor. Scrolling
 * walks into the screen until the hero is the page.
 *
 * The hero is a slot. It is rendered once at full viewport size and revealed
 * through a clip, so design it as one full screen: it fills its parent, which
 * in the pinned splash is exactly 100vw by 100dvh.
 *
 * Pinned on every viewport width so mobile gets the same hook as desktop.
 * Only reduced motion falls back to a plain backdrop with the hero as the
 * page beneath it.
 */
export function SplashScreen({
  data,
  id,
  screen,
  next,
  children,
}: {
  data: SplashData;
  id?: string;
  /**
   * What the monitor shows at rest, before any scrolling: an opaque full
   * screen laid over the hero inside the same stage, so it shares the
   * hero's exact clip and transform, and dissolved (opacity only) as the
   * push begins. Under reduced motion there is no monitor to show it on.
   */
  screen?: ReactNode;
  /**
   * Whatever follows the splash on the page. It is a slot, not a sibling,
   * because a hero shorter than the screen leaves room under it, and the
   * reader should see what comes next sitting there the moment the hero
   * arrives, not watch it slide in on the next scroll. So the splash holds
   * it directly under the hero for the whole pin, beneath the room: the
   * room's own fade at the end of the push is what reveals it. After the
   * pin it scrolls on with the page like anything else. With a
   * full-height hero it simply waits below the screen, as before.
   */
  next?: ReactNode;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  return !reduce ? (
    <SplashPinned data={data} id={id} screen={screen} next={next}>{children}</SplashPinned>
  ) : (
    <>
      <SplashFlat data={data} id={id} reduce={!!reduce}>{children}</SplashFlat>
      {next}
    </>
  );
}

/**
 * The room is alive, on its own clock, and rests when off screen.
 *
 * Playback starts here and never from an autoplay attribute. The server cannot
 * know the reader's motion preference, so markup rendered with autoplay starts
 * the footage before hydration, and under reduced motion nothing stops it.
 */
function usePlayWhileVisible(ref: React.RefObject<HTMLVideoElement | null>, enabled: boolean) {
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!enabled) {
      video.pause();
      return;
    }
    const play = () => void video.play().catch(() => {});
    if (video.readyState >= 2) play();
    else video.addEventListener("canplay", play, { once: true });
    const io = new IntersectionObserver(
      ([e]) => (e.isIntersecting ? play() : video.pause()),
      { threshold: 0 }
    );
    io.observe(video);
    return () => {
      video.removeEventListener("canplay", play);
      io.disconnect();
    };
  }, [ref, enabled]);
}

/* The `screen` prop is bound as `resting` in here: `screen` is already the
   monitor's calibration rectangles (data.video.screen) throughout. */
function SplashPinned({
  data,
  id,
  screen: resting,
  next,
  children,
}: {
  data: SplashData;
  id?: string;
  screen?: ReactNode;
  next?: ReactNode;
  children: ReactNode;
}) {
  const { frame, screen } = data.video;
  const RATIO = frame.w / frame.h;

  const trackRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  usePlayWhileVisible(videoRef, true);

  /* The stage's size — the coordinate system everything below works in.
     Read from the stage's own box, not window.innerWidth/Height: those can
     lie (mobile Chrome settles its viewport in steps and reports an
     interim inner size while the CSS viewport is already final, with no
     resize event to follow), and innerWidth includes a scrollbar the page
     column doesn't, which would put the hero's column 8px off the other
     sections' on desktops that show one. The room, the clip and the hero
     stage are all sized against this same box (100%), so the numbers
     agree by construction. Re-measured on resize and whenever the box
     itself changes. The screen rectangle is derived per frame from the
     video clock, so it is not state. */
  const stageRef = useRef<HTMLDivElement>(null);
  const [vp, setVp] = useState({ vw: 0, vh: 0 });
  const measure = useCallback(() => {
    const el = stageRef.current;
    if (el) setVp({ vw: el.clientWidth, vh: el.clientHeight });
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    const ro = new ResizeObserver(measure);
    if (stageRef.current) ro.observe(stageRef.current);
    return () => {
      window.removeEventListener("resize", measure);
      ro.disconnect();
    };
  }, [measure]);

  /* Guards the small-scale end of the hero's transform against a mismatch
     between the monitor's aspect ratio and the hero's own: covering the
     window by WIDTH (below) is what gives the "flying into the screen" crop
     rather than a shrinking rectangle, but on a monitor rectangle much
     squarer than the hero's content, covering by width alone can crop the
     bottom of the content — the subtitle line gone below the bezel — well
     before scale reaches 1. `.hero-body` is the actual content block (not
     the full-page .hero, which is always exactly the stage's own height and
     so useless as a size to compare against); measuring it is a real,
     if narrow, coupling to the hero's internal markup, kept to this one
     class name. */
  const heroStageRef = useRef<HTMLDivElement>(null);
  const heroContentH = useMotionValue(0);
  /* The slot's own height. The stage is always one full screen, but the
     hero in it may be shorter (content-height, on the reference's rhythm:
     see "Section rhythm" in CLAUDE.md), leaving room below it, which the
     `next` slot fills: see the markup at the bottom. A full-height hero
     measures equal to the stage and `next` waits below the screen.
     offsetHeight, not a client rect: the stage is scaled mid-push. */
  const [heroBlockH, setHeroBlockH] = useState(0);
  useEffect(() => {
    const stage = heroStageRef.current;
    if (!stage) return;
    const target = stage.querySelector<HTMLElement>(".hero-body") ?? stage;
    const ro = new ResizeObserver(([entry]) => heroContentH.set(entry.contentRect.height));
    ro.observe(target);
    /* The slot's root: the stage's child that is neither the foot layer
       nor the resting screen. */
    const block = stage.querySelector<HTMLElement>(":scope > :not(.splash-foot):not(.splash-screen)");
    const blockRo = new ResizeObserver(() => { if (block) setHeroBlockH(block.offsetHeight); });
    if (block) blockRo.observe(block);
    return () => { ro.disconnect(); blockRo.disconnect(); };
  }, [heroContentH]);

  /* Video progress, 0 to 1. Driven by rAF rather than React state so tracking
     the monitor never costs a render. */
  const vt = useMotionValue(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const v = videoRef.current;
      if (v && v.duration) vt.set(v.currentTime / v.duration);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [vt]);

  /** The screen rectangle in viewport pixels at a given point in the take. */
  const rectAt = useCallback(
    (f: number) => {
      const { vw, vh } = vp;
      const fw = Math.max(vw, vh * RATIO);
      const fh = Math.max(vh, vw / RATIO);
      const left = (vw - fw) / 2;
      const top = (vh - fh) / 2;
      const lerp = (a: number, b: number) => a + (b - a) * f;
      return {
        cx: left + (lerp(screen.t0.cx, screen.t1.cx) / 100) * fw,
        cy: top + (lerp(screen.t0.cy, screen.t1.cy) / 100) * fh,
        w: (lerp(screen.t0.w, screen.t1.w) / 100) * fw,
        h: (lerp(screen.t0.h, screen.t1.h) / 100) * fh,
      };
    },
    [vp, RATIO, screen]
  );

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  /*
   * ONE hero instance, always. It used to be two: a small scaled-down
   * "preview" copy for rest, and a full-size never-scaled copy revealed
   * through a growing clip, swapped (or crossfaded) between at some point in
   * the scroll. Two independently-computed layers can only ever coincide by
   * coincidence — any handoff between them, instant or gradual, is visibly
   * two different sizes of the same content for at least a moment. Merging
   * them removes the handoff instead of tuning it: heroTransform (below) IS
   * the geometry, computed from the exact same roomScale and monitor
   * rectangle the clip uses, so hero and window are mathematically the same
   * shape at every step, not two curves hoped into agreement.
   *
   * The clip is likewise DERIVED from the room's scale rather than
   * interpolated separately, so the bezel and the reveal can never slide
   * against each other. That is what makes it read as flying into the
   * screen rather than a rectangle growing over a zooming photograph.
   */

  /* Scroll is smoothed before anything reads it. Raw wheel and trackpad input
     is stepped, and every value downstream inherits that judder. */
  const p = useSpring(scrollYProgress, { stiffness: 90, damping: 26, restDelta: 0.0005 });

  /* Scale at which the monitor exactly fills the viewport. */
  const { vw, vh } = vp;
  const base = rectAt(0);
  const fill = base.w > 0 ? Math.max(vw / base.w, vh / base.h) : 5;

  /* Ease the push so it gathers pace and settles. */
  const easeInOut = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  const pushRaw = useTransform(p, [HERO.zoomStart, HERO.zoomEnd], [0, 1], { clamp: true });
  const push = useTransform(pushRaw, easeInOut);

  /* A little past fill, so the room is still moving as it leaves rather than
     stopping dead at the moment it hands over. Everything below — the clip
     AND the hero's own transform — is driven by this one value, so nothing
     downstream can drift out of step with anything else downstream. */
  const roomScale = useTransform(push, (v) => 1 + v * (fill * 1.18 - 1));

  /* The clip follows the monitor as the camera dollies AND as the push scales
     the room, so both motions are accounted for at once.

     A uniform outward bleed was tried here first, to cover a light sliver
     reported along the left inner edge. Measuring pixel luminance directly
     across all four edges (not just the reported one) before committing to
     that ruled it out: the top and bottom edges land within a fraction of a
     pixel of the true bezel line already — a uniform bleed large enough to
     help the left edge would have started painting over bezel that was
     already exactly right on those two sides. The left/right asymmetry (left
     needed several pixels of correction, right well under one) is not what
     symmetric antialiasing looks like; it is what a small left-biased
     calibration measurement looks like. Fixed in `content/splash.json`
     instead: `screen.t0`/`t1` nudged (cx slightly left, w slightly wider),
     the same correction applied to both endpoints since the two frames were
     measured the same way and showed the same bias. */
  const clip = useTransform([roomScale, vt], ([s, f]: number[]) => {
    const r = rectAt(f);
    if (r.w === 0) return "inset(0px)";
    const w = r.w * s;
    const h = r.h * s;
    const left = Math.max(0, r.cx - w / 2);
    const top = Math.max(0, r.cy - h / 2);
    const right = Math.max(0, vw - (r.cx + w / 2));
    const bottom = Math.max(0, vh - (r.cy + h / 2));
    return `inset(${top.toFixed(1)}px ${right.toFixed(1)}px ${bottom.toFixed(1)}px ${left.toFixed(1)}px)`;
  });

  /*
   * The hero's own transform: rendered at its natural full-page size always
   * (100vw by 100dvh, so its internal vw/vh-based CSS resolves against the
   * true viewport regardless of the scale applied to its box), then scaled
   * and positioned to COVER the exact same window the clip just computed —
   * same r.cx/r.cy/w/h, same source, so it cannot mismatch the window it is
   * cropped to. Covering (not containing) it means the hero may overflow
   * the window on one axis; the clip above crops that overflow away, the
   * same way the room itself covers the viewport before being cropped to
   * the footage frame.
   *
   * scale reaches exactly 1 (the hero's true, never-magnified size) at the
   * exact instant the window's width AND height have both reached the
   * viewport's — i.e. once the monitor has genuinely grown to fill the
   * screen. Clamping scale to that point, and never past it, is what keeps
   * type sharp at rest: the hero is only ever shown at native size or
   * smaller, never magnified beyond its own painted resolution.
   *
   * Position is driven by `push` (0 at rest, 1 at the end of the track),
   * NOT by that same clamped scale value: scale starts the walk already
   * partway in (it is the monitor's natural fit ratio at rest, not 0), so
   * using it to drive position too pulled position off the monitor and
   * partway toward centre from the very first frame, at rest, before any
   * scrolling — hero visibly offset from the monitor before you had even
   * scrolled. push is genuinely 0 at rest and reaches exactly 1 at the end
   * of the track, so position starts exactly on the monitor and finishes
   * exactly at (vw/2, vh/2) — the same place an ordinary unscaled, centred,
   * full-page hero sits — so nothing jumps when the pin releases.
   *
   * Content sets a third, softer influence on top of covering by
   * width/height: on a monitor rectangle much squarer than the hero's
   * content, covering by width alone can crop the bottom of the content —
   * the subtitle gone below the bezel — well before scale reaches 1.
   * Shrinking scale enough to fully rule that out was tried and rejected:
   * it stops the hero covering the window on the other axis, opening a
   * gap that shows the raw footage through the bezel — swapping a cropped
   * line of copy for a visibly broken illusion of the screen itself, a
   * worse trade. So this is a blend (CONTENT_WEIGHT), not a hard ceiling:
   * mostly still covers the window, nudged smaller to give the content a
   * little more room, accepting that a very square monitor rectangle may
   * still crop the last line. Content stops influencing this once it
   * already fits (contentCeiling >= coverFit) — it can only ever pull
   * scale down, never past what covering the window would already give,
   * so this cannot cost scale reaching exactly 1 at arrival either.
   */
  const CONTENT_WEIGHT = 0.8;
  const heroTransform = useTransform(
    [roomScale, vt, push, heroContentH],
    ([s, f, pushV, contentH]: number[]) => {
      const r = rectAt(f);
      if (r.w === 0 || vw === 0 || vh === 0) return { cx: vw / 2, cy: vh / 2, scale: 1 };
      const w = r.w * s;
      const h = r.h * s;
      const coverFit = Math.max(w / vw, h / vh);
      const contentCeiling = contentH > 0 ? h / contentH : Infinity;
      const blended = contentCeiling < coverFit
        ? coverFit + (contentCeiling - coverFit) * CONTENT_WEIGHT
        : coverFit;
      const scale = Math.min(1, blended);
      return {
        cx: r.cx + (vw / 2 - r.cx) * pushV,
        cy: r.cy + (vh / 2 - r.cy) * pushV,
        scale,
      };
    }
  );
  const heroX = useTransform(heroTransform, (v) => v.cx);
  const heroY = useTransform(heroTransform, (v) => v.cy);
  const heroScale = useTransform(heroTransform, (v) => v.scale);

  /* The room only leaves once the hero already fills most of the view. */
  const roomOpacity = useTransform(push, [0.82, 1], [1, 0]);

  /* The resting screen. NOT a second copy of the hero at a second geometry
     (the handoff that ghosted, see above): it is a different picture laid
     over the hero INSIDE the same stage, cropped and scaled by the very
     same clip and transform, so it can only ever sit exactly where the
     hero sits. It just fades — opacity, nothing else — early in the push,
     and stops taking clicks the moment it is no longer visible so the
     hero beneath is what the reader interacts with from then on. */
  const screenOpacity = useTransform(push, [HERO.screenOut[0], HERO.screenOut[1]], [1, 0], { clamp: true });
  const screenPointer = useTransform(screenOpacity, (o) => (o > 0.02 ? "auto" : "none"));
  /* Blur removed for now while the handoff geometry is the thing being
     verified: it previously masked the point where the footage would show
     its own pixels through the reveal, which is a real seam worth checking
     for honestly rather than obscuring. Reintroduce once the geometry itself
     is confirmed correct. */

  const origin = `${(screen.t0.cx + screen.t1.cx) / 2}% ${(screen.t0.cy + screen.t1.cy) / 2}%`;

  /* Geometry known: `next` can be placed under the hero. */
  const held = heroBlockH > 0 && vp.vh > 0;

  return (
    <section id={id} className="splash">
      <div
        ref={trackRef}
        className="splash-track"
        style={{
          height: `${HERO.pinVh * 100}vh`,
          /* Pulls `next` all the way up to the hero's foot at the top of
             the page: it then starts life exactly where it will be seen. */
          marginBottom: held ? `calc(${heroBlockH}px - ${HERO.pinVh * 100}vh)` : 0,
        }}
      >
        <div ref={stageRef} className="splash-stage">
          {/* The room. Sized to cover the viewport at the footage aspect. */}
          <motion.div
            className="splash-frame"
            style={{
              width: `max(100%, calc(100dvh * ${RATIO}))`,
              height: `max(100%, calc(100vw / ${RATIO}))`,
              scale: roomScale,
              opacity: roomOpacity,
              transformOrigin: origin,
            }}
          >
            <video
              ref={videoRef}
              src={data.video.src}
              poster={data.video.poster}
              muted
              loop
              playsInline
              preload="auto"
              aria-label={data.video.alt}
            />
          </motion.div>

          {/* The hero: one instance, always. Two nested elements, not one —
              clip-path insets are computed in viewport-absolute pixels, which
              only stays correct if the clipped element's own local origin
              sits at the viewport's origin. Put the position/scale transform
              on the SAME element as the clip and that stops being true: its
              local (0,0) moves away from the viewport's, and the clip crops
              the wrong region entirely. So the outer element does only the
              clipping, sitting exactly at inset:0 same as before; the inner
              one does only the transform, and gets cropped by its parent's
              clip-path like any overflowing child would.
              At rest this reads as a small hero on the screen; by the end,
              scale has reached 1 and position has reached the viewport
              centre, so it reads as the hero being the page, because by then
              it simply is — same element throughout, no handoff to see a
              seam in. */}
          <motion.div className="splash-hero" style={{ clipPath: clip }}>
            <motion.div
              ref={heroStageRef}
              className="splash-hero-stage"
              style={{ left: heroX, top: heroY, scale: heroScale }}
            >
              {/* The stage under a short hero: cream while the monitor is
                  still a monitor (it would otherwise show raw footage
                  below the hero), leaving with the room so that what is
                  held beneath, `next`, is what the reader arrives at. */}
              <motion.div className="splash-foot" style={{ opacity: roomOpacity }} aria-hidden="true" />
              {children}
              {resting && (
                <motion.div
                  className="splash-screen"
                  style={{ opacity: screenOpacity, pointerEvents: screenPointer }}
                  aria-hidden="true"
                >
                  {resting}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>
      {/* `next`, held under the hero. It sits below the track in the
          stacking order, so the room covers it until it fades. The sticky
          wrapper keeps it at the hero's foot for the pin's whole length
          (the spacer after it is that length); a sticky box ends up at the
          bottom of its container once it lets go, so afterwards `next`
          is simply the next thing on the page, directly under the hero,
          with no gap. data-hold marks it for the anchor maths in
          SmoothScroll. */}
      {next && (
        <div className="splash-next">
          <div className="splash-next-stick" data-hold style={{ top: held ? heroBlockH : "100dvh" }}>
            {next}
          </div>
          <div aria-hidden="true" style={{ height: held ? `calc(${HERO.pinVh * 100}vh - ${vp.vh}px)` : 0 }} />
        </div>
      )}
    </section>
  );
}

/** Room above, hero as the page. Narrow viewports and reduced motion. */
function SplashFlat({
  data,
  id,
  reduce,
  children,
}: {
  data: SplashData;
  id?: string;
  reduce: boolean;
  children: ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  usePlayWhileVisible(videoRef, !reduce);

  return (
    <section id={id} className="splash splash-flat">
      <video
        ref={videoRef}
        src={data.video.src}
        poster={data.video.poster}
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={data.video.alt}
        className="splash-flat-media"
      />
      <div className="splash-flat-hero">{children}</div>
    </section>
  );
}
