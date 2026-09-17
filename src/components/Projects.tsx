"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion, type TargetAndTransition, type Variants } from "motion/react";
import { EASE, FAN } from "@/lib/motion";

export interface Project {
  title: string;
  image: string;
  href?: string | null;
}

export interface ProjectsData {
  label: { index: string; text: string };
  heading: string;
  paging: { previous: string; next: string };
  items: Project[];
}

/* The fan, after 21st.dev's card-fan-carousel. Its numbers are kept as
   delivered: seven resting slots (rotation in degrees, scale, x and y in
   rem), a parabola for fewer cards, and the hover push. Only the engine
   changed, GSAP to Motion, and where sizes come from: the original read
   window.innerWidth against fixed breakpoints, this measures the fan's own
   box, so it fits whatever column it is put in. */
const MAX_VISIBLE = 7;
const HALF = 3;
const REM = 16;
/** The card width (rem) the y offsets were drawn for. */
const FULL_CARD_REM = 17;

interface Slot {
  rot: number;
  scale: number;
  x: number;
  y: number;
  zIndex: number;
}

const FAN_POSITIONS: Slot[] = [
  { rot: -21, scale: 0.7756, x: -30, y: 7.3, zIndex: 1 },
  { rot: -14, scale: 0.8498, x: -22, y: 4.0, zIndex: 2 },
  { rot: -7, scale: 0.9346, x: -11, y: 1.3, zIndex: 3 },
  { rot: 0, scale: 1.0, x: 0, y: 0.0, zIndex: 10 },
  { rot: 7, scale: 0.9346, x: 11, y: 1.3, zIndex: 3 },
  { rot: 14, scale: 0.8498, x: 22, y: 4.0, zIndex: 2 },
  { rot: 21, scale: 0.7756, x: 30, y: 7.3, zIndex: 1 },
];

/**
 * Resting pose for `slot` of `count`. Seven or more use the table. Fewer
 * sit on the same curve, but a step apart rather than stretched to the
 * fan's full width: the original spreads any count edge to edge, which
 * leaves three cards stranded 30rem from each other; half a fan-width per
 * step keeps a small set reading as one hand of cards.
 */
function slotConfig(count: number, slot: number): Slot {
  if (count >= MAX_VISIBLE) return FAN_POSITIONS[slot];
  const center = (count - 1) / 2;
  const step = center > 0 ? Math.min(0.5, 1 / center) : 0;
  const d = (slot - center) * step;
  return {
    rot: d * 21,
    scale: 1 - 0.2244 * d * d,
    x: d * 30,
    y: d * d * 7.3,
    zIndex: 10 - Math.round(Math.abs(slot - center) * 2),
  };
}

/** The original's hover layout: lift the hovered card, push the rest aside. */
function hoverPose(base: Slot, slot: number, hovered: number | null, count: number) {
  let { x, y, rot, scale } = base;
  if (hovered === null) return { x, y, rot, scale };
  const centerSlot = count >> 1;
  const distance = Math.abs(slot - hovered);
  if (slot === hovered) {
    y -= 2.5;
    scale *= 1.08;
  } else {
    /* Where the card sits across the fan, -1..1. Seven cards span it edge
       to edge, as in the original; a smaller set only reaches part-way
       (see slotConfig), so its outer cards still have some push in them. */
    const center = (count - 1) / 2;
    const step = count >= MAX_VISIBLE ? 1 / HALF : center > 0 ? Math.min(0.5, 1 / center) : 0;
    const normalized = (slot - center) * step;
    let push = 8 * (1 - Math.abs(normalized)) * (1 + 0.2 * Math.max(0, 3 - distance));
    /* In a full fan a pushed card slides onto a neighbour that is moving
       too. In a small one the neighbour is the last card, so an uncapped
       push parks the centre card right on top of it: keep the slide under
       half a step there. Seven and up are untouched. */
    if (count < MAX_VISIBLE) push = Math.min(push, step * 30 * 0.45);
    if (slot < hovered) {
      x -= push;
      rot -= 3 / (distance + 1);
    } else {
      x += push;
      rot += 3 / (distance + 1);
    }
    if (slot === count - 1 && hovered < centerSlot) y -= 1;
    if (slot === 0 && hovered > centerSlot) y -= 1;
  }
  return { x, y, rot, scale };
}

const rise: Variants = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points={direction === "left" ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
    </svg>
  );
}

/**
 * Selected projects: an ordinary in-flow section (no pin) holding a fan of
 * project cards. They rise into the fan when it scrolls into view, hovering
 * one lifts it and pushes its neighbours aside, and past seven cards the
 * fan pages with arrows. Under reduced motion the fan is simply there.
 */
export function Projects({ data }: { data: ProjectsData }) {
  const reduce = useReducedMotion();
  const total = data.items.length;
  const paged = total > MAX_VISIBLE;
  const count = paged ? MAX_VISIBLE : total;

  const bodyRef = useRef<HTMLDivElement>(null);
  const fanRef = useRef<HTMLDivElement>(null);
  const entered = useInView(fanRef, { once: true, amount: 0.35 });
  const headed = useInView(bodyRef, { once: true, amount: 0.15 });

  /* Sizes from the fan's own box: `mult` scales x so the outermost card
     still lands inside the fan, `hMult` scales y with the card's size. */
  const [geo, setGeo] = useState({ mult: 1, hMult: 1 });
  useEffect(() => {
    const fan = fanRef.current;
    if (!fan) return;
    const measure = () => {
      const card = fan.querySelector<HTMLElement>(".fan-card");
      if (!card) return;
      const cardW = card.offsetWidth;
      const maxX = Math.max(...Array.from({ length: count }, (_, s) => Math.abs(slotConfig(count, s).x)), 1) * REM;
      const room = (fan.clientWidth - cardW * 0.92) / 2;
      setGeo({ mult: Math.max(0.2, Math.min(1, room / maxX)), hMult: cardW / (FULL_CARD_REM * REM) });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(fan);
    return () => ro.disconnect();
  }, [count]);

  /* Hover only once the entrance has played out, as in the original. */
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!entered) return;
    if (reduce) return setReady(true);
    const t = setTimeout(() => setReady(true), (FAN.enterDelay + count * FAN.enterStagger + FAN.enter.duration) * 1000);
    return () => clearTimeout(t);
  }, [entered, reduce, count]);
  const [hovered, setHovered] = useState<number | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Paging, only past seven cards: which card sits in which slot. */
  const [center, setCenter] = useState(paged ? HALF : total >> 1);
  const direction = useRef<"left" | "right">("right");
  const wasVisible = useRef<Set<number>>(new Set());
  const busy = useRef(false);
  const slotOf = useCallback(
    (i: number): number | undefined => {
      if (!paged) return i;
      for (let s = 0; s < MAX_VISIBLE; s++) if ((((center + s - HALF) % total) + total) % total === i) return s;
      return undefined;
    },
    [paged, center, total]
  );
  useEffect(() => {
    wasVisible.current = new Set(data.items.map((_, i) => i).filter((i) => slotOf(i) !== undefined));
  }, [data.items, slotOf]);
  const cycle = (dir: "left" | "right") => {
    if (busy.current || !paged) return;
    busy.current = true;
    direction.current = dir;
    setHovered(null);
    setCenter((c) => (dir === "right" ? (c + 1) % total : (c - 1 + total) % total));
    setTimeout(() => (busy.current = false), FAN.pageIn.duration * 1000 + 50);
  };

  const px = (rem: number, m: number) => rem * m * REM;

  const poseFor = (i: number): { animate: TargetAndTransition; zIndex: number } => {
    const slot = slotOf(i);
    const still = { duration: 0 };

    if (slot === undefined) {
      /* Off the fan: leaving if it was just on it, otherwise parked. */
      const out = direction.current === "right" ? -1 : 1;
      return wasVisible.current.has(i)
        ? { zIndex: 0, animate: { x: px(40 * out, 1), opacity: 0, scale: 0.5, rotate: 30 * out, transition: reduce ? still : FAN.pageOut } }
        : { zIndex: 0, animate: { x: 0, y: 0, opacity: 0, scale: 0.3, rotate: 0, transition: still } };
    }

    const base = slotConfig(count, slot);
    if (!entered && !reduce) {
      return { zIndex: base.zIndex, animate: { x: 0, y: px(12, geo.hMult), rotate: 0, scale: 0.5, opacity: 0, transition: still } };
    }

    const p = hoverPose(base, slot, ready && !reduce ? hovered : null, count);
    const target = { x: px(p.x, geo.mult), y: px(p.y, geo.hMult), rotate: p.rot, scale: p.scale, opacity: 1 };
    if (reduce) return { zIndex: base.zIndex, animate: { ...target, transition: still } };

    if (!ready) {
      return { zIndex: base.zIndex, animate: { ...target, transition: { ...FAN.enter, delay: FAN.enterDelay + slot * FAN.enterStagger } } };
    }
    if (paged && !wasVisible.current.has(i)) {
      /* Arriving from the side the fan is turning towards. */
      const from = direction.current === "right" ? 1 : -1;
      return {
        zIndex: base.zIndex,
        animate: { x: [px(40 * from, 1), target.x], y: target.y, rotate: [30 * from, target.rotate], scale: [0.5, target.scale], opacity: [0, 1], transition: FAN.pageIn },
      };
    }
    const delay = Math.abs(slot - (hovered ?? count >> 1)) * FAN.hoverStagger;
    return { zIndex: base.zIndex, animate: { ...target, transition: busy.current ? FAN.shift : { ...FAN.hover, delay } } };
  };

  const onEnter = (slot: number | undefined) => {
    if (!ready || busy.current || slot === undefined) return;
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setHovered(slot);
  };
  const onLeaveFan = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setHovered(null), 50);
  };

  return (
    <section id="work" className="projects">
      <div ref={bodyRef} className="page page-frame projects-body">
        <span className="projects-label">
          <span>{data.label.index}</span>
          <span>{data.label.text}</span>
        </span>

        <motion.h2 className="projects-heading" variants={rise} initial="hidden" animate={headed ? "shown" : "hidden"}>
          {data.heading}
        </motion.h2>

        <div ref={fanRef} className="fan-layout" role="list" onMouseLeave={onLeaveFan}>
          {data.items.map((project, i) => {
            const { animate, zIndex } = poseFor(i);
            const slot = slotOf(i);
            const img = <img src={project.image} alt={project.title} loading="lazy" draggable={false} />;
            const shared = {
              className: "fan-card",
              role: "listitem",
              style: { zIndex },
              initial: false as const,
              animate,
              onMouseEnter: () => onEnter(slot),
            };
            return project.href ? (
              <motion.a
                key={project.title}
                {...shared}
                href={project.href}
                target={project.href.startsWith("http") ? "_blank" : undefined}
                rel={project.href.startsWith("http") ? "noopener noreferrer" : undefined}
              >
                {img}
              </motion.a>
            ) : (
              <motion.div key={project.title} {...shared}>
                {img}
              </motion.div>
            );
          })}
        </div>

        {paged && (
          <div className="fan-paging">
            <button type="button" className="fan-arrow" onClick={() => cycle("left")} aria-label={data.paging.previous}>
              <Chevron direction="left" />
            </button>
            <div className="fan-dots" aria-hidden="true">
              {data.items.map((p, i) => (
                <span key={p.title} className={i === center ? "fan-dot is-active" : "fan-dot"} />
              ))}
            </div>
            <button type="button" className="fan-arrow" onClick={() => cycle("right")} aria-label={data.paging.next}>
              <Chevron direction="right" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
