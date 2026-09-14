"use client";

import { motion } from "motion/react";
import { EASE } from "@/lib/motion";

export interface ServiceCard {
  number: string;
  tag: string;
  body: string;
  bg: string;
  accent: string;
}

export interface ServiceCardsData {
  items: ServiceCard[];
  exploreLabel: string;
}

/**
 * The row of service cards that follows the hero once the splash releases.
 * Ordinary in-flow content: no pin, no scroll listener. Motion's
 * `whileInView` (IntersectionObserver-backed) staggers each card in as it
 * crosses the viewport.
 */
export function ServiceCards({ data }: { data: ServiceCardsData }) {
  return (
    <section className="cards-section">
      <div className="cards-row">
        {data.items.map((card, i) => (
          <motion.article
            key={card.tag}
            className="card"
            style={{ background: card.bg }}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.6, ease: EASE, delay: i * 0.08 }}
          >
            <div className="card-top">
              <h3 className="card-tag">{card.tag}</h3>
              <span className="card-number" style={{ color: card.accent }}>
                {card.number}
              </span>
            </div>

            <p className="card-body">{card.body}</p>

            <div className="card-bottom">
              <span className="card-divider" />
              <div className="card-explore">
                <span className="card-explore-label">{data.exploreLabel}</span>
                <span className="card-explore-arrow" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M3 11L11 3M11 3H4.5M11 3V9.5"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </div>
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
