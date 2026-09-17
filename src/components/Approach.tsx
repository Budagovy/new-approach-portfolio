"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
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

/** Where the pinned four-across layout can't fit; mirrors the CSS breakpoint. */
const FLOW_QUERY = "(max-width: 859px), (max-height: 699px)";

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

/* Activation. Scroll decides WHICH state a step is in; these only polish
   the switch, so every one is short and every one reverses cleanly. A step
   orchestrates its children: marker, then title, then description. */
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
 * Pinned four-step timeline. The track is `pinVh` viewports tall and the
 * stage sticks inside it; scroll progress through the track, lightly
 * smoothed, is the single source of truth: it scales the orange fill
 * directly, and each step's state ("off", "current", "done") is read off
 * it as thresholds are crossed, in either direction. Motion variants only
 * dress the state changes. Where the four-across layout can't fit, or under
 * reduced motion, the section unpins and flows (see FLOW_QUERY and the
 * matching media rules in globals.css).
 */
export function Approach({ data }: { data: ApproachData }) {
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

  const trackRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });
  /* Light smoothing only: about critically damped with a ~40ms time
     constant, so wheel steps blend but the line settles on the scroll
     position within a quarter second of it stopping and never visibly
     trails it. A softer spring (260/42) was tried first and took over half
     a second to catch up after a long jump — the line kept moving on its
     own after the page had stopped, which the brief rules out. */
  const p = useSpring(scrollYProgress, { stiffness: 700, damping: 55, mass: 1, restDelta: 0.0005 });
  const fill = useTransform(p, [APPROACH.fillStart, APPROACH.fillEnd], [0, 1], { clamp: true });

  const entered = useInView(stageRef, { once: true, amount: 0.3 });

  /* Steps 02.. light as the fill reaches their marker. Held in a ref and
     mirrored to state only when the count actually changes, so scrolling
     costs no renders between thresholds. */
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
    <section
      id="approach"
      ref={trackRef}
      className="approach"
      style={{ "--approach-pin": APPROACH.pinVh } as CSSProperties}
    >
      <div ref={stageRef} className="approach-stage">
        <motion.div
          className="container approach-body"
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
                  /* Pinned: scroll sets the state. Flowing: each step lights
                     as it scrolls into view. Reduced motion: all lit, at once. */
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
      </div>
    </section>
  );
}
