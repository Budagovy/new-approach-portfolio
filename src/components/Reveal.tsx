"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { EASE, REVEAL } from "@/lib/motion";

type Tag = "div" | "ol" | "ul" | "li" | "h2" | "p";

/* Under reduced motion the reveal is a cut: no duration, no stagger, so
   nothing is seen to move. Only the TRANSITION may depend on the reader's
   preference. The hidden state is written into the server-rendered style,
   and the server cannot know the preference: anything in it that varied
   with useReducedMotion() (the initial variant's name, then its `y`) was
   a hydration mismatch, twice. */
const groupVariants = (reduce: boolean): Variants => ({
  hidden: {},
  shown: { transition: { staggerChildren: reduce ? 0 : REVEAL.stagger } },
});
const itemVariants = (reduce: boolean): Variants => ({
  hidden: { opacity: 0, y: REVEAL.rise },
  shown: { opacity: 1, y: 0, transition: reduce ? { duration: 0 } : { duration: REVEAL.duration, ease: EASE } },
});
const viewport = { once: true, amount: REVEAL.inView } as const;

/**
 * The site's one reveal: a fade with a small rise, once, the first time
 * the element scrolls into view. `RevealGroup` reveals its `RevealItem`
 * children one after another; a `RevealItem` marked `alone` watches its
 * own entry. Opacity and transform only, so nothing shifts layout.
 */
export function RevealGroup({ as = "div", className, children }: { as?: Tag; className?: string; children: ReactNode }) {
  const reduce = !!useReducedMotion();
  const Component = motion[as];
  return (
    <Component className={className} variants={groupVariants(reduce)} initial="hidden" whileInView="shown" viewport={viewport}>
      {children}
    </Component>
  );
}

export function RevealItem({ as = "div", className, children, alone = false }: { as?: Tag; className?: string; children: ReactNode; alone?: boolean }) {
  const reduce = !!useReducedMotion();
  const Component = motion[as];
  /* Inside a group the parent drives the variant; alone, it watches its own entry. */
  const own = alone ? { initial: "hidden", whileInView: "shown", viewport } : {};
  return (
    <Component className={className} variants={itemVariants(reduce)} {...own}>
      {children}
    </Component>
  );
}
