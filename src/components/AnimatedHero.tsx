"use client";

import { motion } from "motion/react";
import { CityStrip, type CityStripExperience } from "@/components/CityStrip";
import { CITY } from "@/lib/motion";
import { useRotatingIndex } from "@/lib/useRotatingIndex";

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
 * never transformed. The copy sits centred with the city strip along the
 * foot of the screen; every string comes from content/.
 */
export function AnimatedHero({
  data,
  experience,
}: {
  data: AnimatedHeroData;
  experience: CityStripExperience[];
}) {
  const index = useRotatingIndex(data.words.length, WORD_HOLD_MS);

  return (
    <div className="hero">
      <div className="hero-main">
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

      <div className="hero-strip">
        <CityStrip experiences={experience} speed={CITY.speed} />
      </div>
    </div>
  );
}
