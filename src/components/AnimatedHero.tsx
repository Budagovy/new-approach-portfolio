"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";

export interface AnimatedHeroData {
  eyebrow: string;
  prefix: string;
  words: string[];
  note: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
}

/** How long each rotating word holds before the next one enters. */
const WORD_HOLD_MS = 2200;

/**
 * The real hero. Fills the slot the splash hands it: one full screen, root
 * never transformed. The rotating word is the only thing that moves; every
 * string comes from content/hero.json.
 */
export function AnimatedHero({ data }: { data: AnimatedHeroData }) {
  const [index, setIndex] = useState(0);
  const longest = data.words.reduce((a, b) => (b.length > a.length ? b : a), "");

  useEffect(() => {
    const id = setTimeout(() => {
      setIndex((i) => (i + 1) % data.words.length);
    }, WORD_HOLD_MS);
    return () => clearTimeout(id);
  }, [index, data.words.length]);

  return (
    <div className="hero">
      <div className="hero-body">
        <span className="hero-eyebrow">{data.eyebrow}</span>

        <h1 className="hero-headline">
          <span>{data.prefix}</span>
          <span className="hero-word-stage" aria-live="polite">
            <span className="hero-word-sizer" aria-hidden="true">
              {longest}
            </span>
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

        <div className="hero-actions">
          <a className="hero-cta hero-cta-primary" href={data.primaryCta.href}>
            {data.primaryCta.label}
            <svg
              className="hero-cta-icon"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
          <a className="hero-cta hero-cta-secondary" href={data.secondaryCta.href}>
            {data.secondaryCta.label}
          </a>
        </div>
      </div>
    </div>
  );
}
