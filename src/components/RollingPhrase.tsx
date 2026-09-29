"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { HEADLINE } from "@/lib/motion";

/**
 * The hero headline's second line, rolling through the phrases: each holds
 * a moment, then rolls up and out as the next rolls in from below. This is
 * the headline the site had before the Figma rebuild (in git at 9675ac1),
 * brought back in the frame's styling: the page opens on the first phrase,
 * the one the Figma frame shows, and moves on from there.
 *
 * Every change rolls upward, the wrap from the last phrase back to the
 * first included: the phrase leaving goes up, the one arriving comes from
 * below, and the rest wait below, unseen (parked there without animating).
 * All the phrases share one grid cell, so the line is always as wide as the
 * widest and nothing around it moves as they change.
 *
 * For a screen reader the headline is the first phrase, said once: the
 * rolling line is hidden from it rather than announced every few seconds.
 * Under reduced motion it stays on the first phrase. The server renders the
 * first phrase too, so hydration always agrees.
 */
export function RollingPhrase({ phrases }: { phrases: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (phrases.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % phrases.length), HEADLINE.hold);
    return () => window.clearInterval(id);
  }, [phrases.length]);

  const leaving = (index - 1 + phrases.length) % phrases.length;

  return (
    <>
      <span className="hero-emphasis hero-roll" aria-hidden="true">
        {phrases.map((phrase, i) => {
          const state = i === index ? "in" : i === leaving ? "out" : "wait";
          return (
            <motion.span
              key={phrase}
              className="hero-roll-phrase"
              initial={false}
              animate={state === "in" ? { y: "0%", opacity: 1 } : { y: state === "out" ? "-100%" : "100%", opacity: 0 }}
              transition={state === "wait" ? { duration: 0 } : HEADLINE.spring}
            >
              {phrase}
            </motion.span>
          );
        })}
      </span>
      <span className="visually-hidden">{phrases[0]}</span>
    </>
  );
}
