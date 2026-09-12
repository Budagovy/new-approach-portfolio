"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { HERO } from "@/lib/motion";
import { useMediaQuery } from "@/lib/useMediaQuery";

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
  /** What the monitor says before the push begins. */
  greeting: string;
  /** The tail of that line, set in the heavier weight. */
  greetingAccent: string;
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
 * Below 900px, and under reduced motion, the room plays as a plain backdrop
 * and the hero is simply the page beneath it.
 */
export function SplashScreen({
  data,
  id,
  children,
}: {
  data: SplashData;
  id?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  const wide = useMediaQuery("(min-width: 900px)");
  return wide && !reduce ? (
    <SplashPinned data={data} id={id}>{children}</SplashPinned>
  ) : (
    <SplashFlat data={data} id={id} reduce={!!reduce}>{children}</SplashFlat>
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

function SplashPinned({ data, id, children }: { data: SplashData; id?: string; children: ReactNode }) {
  const { frame, screen } = data.video;
  const RATIO = frame.w / frame.h;

  const trackRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  usePlayWhileVisible(videoRef, true);

  /* Viewport size, recomputed on resize only. The screen rectangle itself is
     derived per frame from the video clock, so it is not state. */
  const [vp, setVp] = useState({ vw: 0, vh: 0 });
  const measure = useCallback(() => {
    setVp({ vw: window.innerWidth, vh: window.innerHeight });
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

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
   * The hero is NEVER scaled. A transformed layer is rasterised once at its
   * painted size, so scaling the hero would draw the type small and then
   * magnify it. Clipping keeps every glyph at native resolution for the whole
   * move.
   *
   * The clip is DERIVED from the room's scale rather than interpolated
   * separately, so the bezel and the reveal can never slide against each
   * other. That is what makes it read as flying into the screen rather than a
   * rectangle growing over a zooming photograph.
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
     stopping dead at the moment it hands over. */
  const roomScale = useTransform(push, (v) => 1 + v * (fill * 1.18 - 1));

  /* The clip follows the monitor as the camera dollies AND as the push scales
     the room, so both motions are accounted for at once. */
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
   * At rest the monitor carries a greeting, not the page: clipped to the
   * monitor, the hero would frame an arbitrary slice of itself.
   *
   * The greeting sits ON TOP of the hero and fades away to reveal it. The hero
   * is never faded: it carries the page ground, so cross-fading it would let
   * the footage show through. Tied to the push so the handover always lands at
   * the same point in the move.
   */
  const greetOpacity = useTransform(push, [0.02, 0.22], [1, 0]);
  const greetX = useTransform(vt, (f) => rectAt(f).cx);
  const greetY = useTransform(vt, (f) => rectAt(f).cy);

  /* The room only leaves once the hero already fills most of the view. */
  const roomOpacity = useTransform(push, [0.82, 1], [1, 0]);
  /* Softening the room as it passes the camera hides the point where the
     footage would start to show its own pixels. */
  const roomBlur = useTransform(
    useTransform(push, [0.25, 1], [0, 16]),
    (b) => `blur(${b.toFixed(2)}px)`
  );

  const origin = `${(screen.t0.cx + screen.t1.cx) / 2}% ${(screen.t0.cy + screen.t1.cy) / 2}%`;

  return (
    <section id={id} className="splash">
      <div ref={trackRef} className="splash-track" style={{ height: `${HERO.pinVh * 100}vh` }}>
        <div className="splash-stage">
          {/* The room. Sized to cover the viewport at the footage aspect. */}
          <motion.div
            className="splash-frame"
            style={{
              width: `max(100vw, calc(100dvh * ${RATIO}))`,
              height: `max(100dvh, calc(100vw / ${RATIO}))`,
              scale: roomScale,
              opacity: roomOpacity,
              filter: roomBlur,
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

          {/* The hero, full size, never scaled, clipped to the monitor. */}
          <motion.div className="splash-hero" style={{ clipPath: clip }}>
            {children}
          </motion.div>

          {/* The greeting, above the hero, sized for the monitor. It is
              decorative and never takes the pointer, or it would sit invisibly
              over the hero's links once it has faded. */}
          <motion.div
            className="splash-greeting"
            aria-hidden="true"
            style={{ clipPath: clip, opacity: greetOpacity }}
          >
            <motion.span
              style={{
                left: greetX,
                top: greetY,
                fontSize: `clamp(11px, ${(base.h * 0.12).toFixed(1)}px, 30px)`,
              }}
            >
              {data.greeting}
              {data.greetingAccent ? (
                <>
                  {" "}
                  <b>{data.greetingAccent}</b>
                </>
              ) : null}
            </motion.span>
          </motion.div>
        </div>
      </div>
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
