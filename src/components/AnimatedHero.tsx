"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { DotPattern } from "@/components/DotPattern";

export interface AnimatedHeroData {
  eyebrow: string;
  prefix: string;
  words: string[];
  note: string;
}

/** How long each rotating phrase holds before the next one enters. */
const WORD_HOLD_MS = 2200;

/**
 * The real hero. Fills the slot the splash hands it: one full screen, root
 * never transformed. The rotating phrase is the only thing that moves;
 * every string comes from content/hero.json.
 */
export function AnimatedHero({ data }: { data: AnimatedHeroData }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setTimeout(() => {
      setIndex((i) => (i + 1) % data.words.length);
    }, WORD_HOLD_MS);
    return () => clearTimeout(id);
  }, [index, data.words.length]);

  return (
    <div className="hero">
      <DotPattern />
      <div className="hero-body">
        <span className="hero-eyebrow">{data.eyebrow}</span>

        <h1 className="hero-headline">
          <span className="hero-line">{data.prefix}</span>
          <span className="hero-word-stage" aria-live="polite">
            {data.words.map((word, i) => (
              <motion.span
                key={word}
                className="hero-word"
                initial={false}
                animate={
                  i === index
                    ? { y: 0, opacity: 1 }
                    : { y: i < index ? "-100%" : "100%", opacity: 0 }
                }
                transition={{ type: "spring", stiffness: 260, damping: 26 }}
              >
                {word}
              </motion.span>
            ))}
          </span>
        </h1>

        <p className="hero-note">{data.note}</p>
      </div>
    </div>
  );
}
