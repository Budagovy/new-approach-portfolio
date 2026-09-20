"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type Variants,
} from "motion/react";
import { APPROACH, EASE } from "@/lib/motion";

export interface ApproachStep {
  title: string;
  description: string;
}

export interface ApproachData {
  label: { index: string; text: string };
  heading: string;
  steps: ApproachStep[];
}

type StepState = "off" | "current" | "done";

/** Where the held, four-across layout can't fit; mirrors the CSS breakpoint. */
const FLOW_QUERY = "(max-width: 859px), (max-height: 599px)";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/* Entrance, as the section scrolls into view: heading, then line, then the
   markers, in a short cascade. Played once. */
const entrance: Variants = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};
const settle: Variants = {
  hidden: { opacity: 0, y: 8 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};
const fade: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.5, ease: EASE } },
};

/* Activation. The line's position decides WHICH state a step is in; these
   only polish the switch, so every one is short. A step orchestrates its
   children: marker, then title, then description. */
const step: Variants = {
  off: { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
  current: { transition: { staggerChildren: APPROACH.stagger } },
  done: { transition: { staggerChildren: 0.04 } },
};
const marker: Variants = {
  off: { scale: 1 },
  current: {
    scale: [1, 1.12, 1],
    transition: { duration: 0.5, times: [0, 0.4, 1], ease: EASE },
  },
  done: { scale: 1 },
};
/* The orange is a disc that fades in over the dark marker, so activating a
   marker is opacity only, never a background-colour tween. */
const disc: Variants = {
  off: { opacity: 0, transition: { duration: 0.2 } },
  current: { opacity: 1, transition: { duration: 0.25 } },
  done: { opacity: 1, transition: { duration: 0.25 } },
};
const title: Variants = {
  off: { opacity: 0, y: 12, transition: { duration: 0.25, ease: EASE } },
  current: { opacity: 1, y: 0, transition: { duration: APPROACH.reveal, ease: EASE } },
  done: { opacity: 0.72, y: 0, transition: { duration: APPROACH.reveal, ease: EASE } },
};
const description: Variants = {
  off: { opacity: 0, y: 12, transition: { duration: 0.25, ease: EASE } },
  current: { opacity: 1, y: 0, transition: { duration: APPROACH.reveal, ease: EASE } },
  done: { opacity: 0.6, y: 0, transition: { duration: APPROACH.reveal, ease: EASE } },
};

const number = (i: number) => String(i + 1).padStart(2, "0");

function Marker({ index, state }: { index: number; state: StepState }) {
  return (
    <motion.span
      className="approach-marker"
      variants={marker}
      initial={false}
      animate={state}
      aria-hidden="true"
    >
      <motion.span className="approach-marker-fill" variants={disc} />
      <span className="approach-marker-num">{number(index)}</span>
    </motion.span>
  );
}

/**
 * The four-step timeline: scroll-driven, and held while it plays.
 *
 * Layout does the holding, not script. `.approach-panel` is as tall as
 * what it holds plus a spacer (`APPROACH.holdVh` screens);
 * `.approach-stage` inside it is `position: sticky` under the fixed
 * header, so it stays put while the reader scrolls the spacer's distance.
 * What it holds is this section AND whatever follows it (the `next`
 * slot): the reader should see the next section sitting under this one
 * while the milestones reveal, not an empty gap that it later slides
 * into. The two hold as one and release as one. Scroll is never
 * intercepted: the scrollbar, keyboard and Lenis all behave as on any
 * other part of the page (anchor jumps account for the hold, see
 * SmoothScroll).
 *
 * Progress through the hold (0 when the panel's top reaches the sticking
 * point, 1 a spacer later) is the one source of truth: it scales the
 * orange line directly, and each step's state ("off", "current", "done")
 * is read off the same value as the line crosses each marker's third.
 * Motion variants only dress the state changes. Step 01 lights with the
 * entrance, as the section comes into view; 02 to 04 need scroll. Where
 * the held layout can't fit, or under reduced motion, there is no hold
 * and the section flows (see FLOW_QUERY and the matching media rule in
 * globals.css).
 */
export function Approach({ data, next }: { data: ApproachData; next?: ReactNode }) {
  const reduce = useReducedMotion();
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(FLOW_QUERY);
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const flowing = !!reduce || compact;

  const panelRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const holdRef = useRef<HTMLDivElement>(null);
  /* Low threshold on purpose: on desktop the section sits under the hero
     from the start, showing only its top strip, and that strip should be
     the heading and step 01, not blank paper waiting for a scroll. */
  const bodyRef = useRef<HTMLDivElement>(null);
  const entered = useInView(bodyRef, { once: true, amount: 0.15 });

  /* Where the stage sticks (the header's height, from CSS) and how long
     the hold is, in px. Re-read on resize; both are 0 when flowing. */
  const geometry = useRef({ stickTop: 0, hold: 0 });
  useEffect(() => {
    const read = () => {
      const stage = stageRef.current, hold = holdRef.current;
      if (!stage || !hold) return;
      geometry.current = {
        stickTop: parseFloat(getComputedStyle(stage).top) || 0,
        hold: hold.offsetHeight,
      };
    };
    read();
    window.addEventListener("resize", read);
    return () => window.removeEventListener("resize", read);
  }, [flowing]);

  /* Progress through the hold, read from where the panel actually is
     rather than from cached document offsets: the splash above changes
     its own height after hydration, which would leave those stale. */
  const { scrollY } = useScroll();
  const raw = useTransform(scrollY, () => {
    const panel = panelRef.current;
    const { stickTop, hold } = geometry.current;
    if (!panel || hold === 0) return 0;
    return clamp01((stickTop - panel.getBoundingClientRect().top) / hold);
  });
  /* Stiff and near-critically damped (~40ms): takes the steps out of wheel
     input without the line trailing after the page has stopped. */
  const p = useSpring(raw, { stiffness: 700, damping: 55, mass: 1 });

  /* The line, 01 to 04. Latched (by default) at the furthest point
     reached, so a revealed milestone stays revealed. */
  const furthest = useRef(0);
  const fill = useTransform(p, (v) => {
    const f = clamp01((v - APPROACH.fillStart) / (APPROACH.fillEnd - APPROACH.fillStart));
    if (!APPROACH.latch) return f;
    furthest.current = Math.max(furthest.current, f);
    return furthest.current;
  });

  /* Steps 02.. light as the line reaches their marker. Held in a ref and
     mirrored to state only when the count changes. */
  const last = data.steps.length - 1;
  const [reached, setReached] = useState(0);
  const reachedRef = useRef(0);
  useMotionValueEvent(fill, "change", (v) => {
    const n = Math.max(0, Math.min(last, Math.floor(v * last + 0.002)));
    if (n !== reachedRef.current) {
      reachedRef.current = n;
      setReached(n);
    }
  });

  const active = entered ? reached + 1 : 0;
  const stateOf = (i: number): StepState =>
    flowing ? "current" : i < active - 1 ? "done" : i === active - 1 ? "current" : "off";

  return (
    <div ref={panelRef} className="approach-panel">
      <div ref={stageRef} className="approach-stage" data-hold>
      <section id="approach" className="approach">
        <motion.div
          ref={bodyRef}
          className="page page-frame approach-body"
          variants={entrance}
          initial="hidden"
          animate={entered ? "shown" : "hidden"}
        >
          <span className="approach-label">
            <span>{data.label.index}</span>
            <span>{data.label.text}</span>
          </span>

          <motion.h2 className="approach-heading" variants={rise}>
            {data.heading}
          </motion.h2>

          <div className="approach-steps">
            <div className="approach-track" aria-hidden="true">
              <motion.span className="approach-line" variants={fade} />
              <motion.span
                className="approach-fill"
                variants={fade}
                style={{ scaleX: reduce ? 1 : fill }}
              />
              <div className="approach-markers">
                {data.steps.map((s, i) => (
                  <motion.div key={s.title} className="approach-marker-slot" variants={settle}>
                    <Marker index={i} state={stateOf(i)} />
                  </motion.div>
                ))}
              </div>
            </div>

            <ol className="approach-copy">
              {data.steps.map((s, i) => (
                <motion.li
                  key={s.title}
                  className="approach-step"
                  variants={step}
                  /* Held: scroll sets the state. Flowing: each
                     step lights as it scrolls into view. Reduced motion:
                     all lit, at once. */
                  initial={flowing && !reduce ? "off" : false}
                  animate={flowing && !reduce ? undefined : stateOf(i)}
                  whileInView={flowing && !reduce ? "current" : undefined}
                  viewport={{ once: true, amount: 0.5 }}
                >
                  <motion.span className="approach-marker approach-marker--inline" variants={marker} aria-hidden="true">
                    <motion.span className="approach-marker-fill" variants={disc} />
                    <span className="approach-marker-num">{number(i)}</span>
                  </motion.span>
                  <motion.h3 className="approach-step-title" variants={title}>
                    {s.title}
                  </motion.h3>
                  <motion.p className="approach-step-desc" variants={description}>
                    {s.description}
                  </motion.p>
                </motion.li>
              ))}
            </ol>
          </div>
        </motion.div>
      </section>
      {next}
      </div>
      {/* The hold: the distance the stage stays stuck for. A sticky box
          ends up at the bottom of its container once it lets go, so this
          never shows as a gap. Hidden by CSS where the section flows. */}
      <div ref={holdRef} className="approach-hold" style={{ height: `${APPROACH.holdVh * 100}vh` }} aria-hidden="true" />
    </div>
  );
}
