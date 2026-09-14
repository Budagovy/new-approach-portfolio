"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import { EASE } from "@/lib/motion";

type CSSVars = CSSProperties & Record<string, string | number | undefined>;

export interface ServiceCard {
  number: string;
  tag: string;
  body: string;
  bg: string;
  text: string;
}

export interface ServiceCardsData {
  items: ServiceCard[];
  exploreLabel: string;
}

interface PreparedCard extends ServiceCard {
  _rotation: number;
  _baseX: number;
  _baseZ: number;
}

/** Small alternating tilt per card, so the resting stack reads as a fanned deck. */
const PRESET_ROTATIONS = [-6, 3, -4, 5, -3, 4];

const CARD_WIDTH = 320;
const CARD_HEIGHT = 400;
const OVERLAP = 180;
const HOVER_LIFT = 34;
const PUSH_DISTANCE = 260;
const SPREAD = 26;
const DURATION = 0.5;
const EASE_CSS = "cubic-bezier(0.22, 1, 0.36, 1)";
/** One fixed hover ring for every card, regardless of its own colour. */
const HOVER_RING = "#31302C";

function ArrowUpRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M3 11L11 3M11 3H4.5M11 3V9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Tag + number up top, body copy, then the divider / explore / arrow footer. */
function CardFace({ card, exploreLabel }: { card: ServiceCard; exploreLabel: string }) {
  return (
    <>
      <div className="card-top">
        <h3 className="card-tag">{card.tag}</h3>
        <span className="card-number">{card.number}</span>
      </div>

      <p className="card-body">{card.body}</p>

      <div className="card-bottom">
        <span className="card-divider" />
        <div className="card-explore">
          <span className="card-explore-label">{exploreLabel}</span>
          <span className="card-explore-arrow" aria-hidden="true">
            <ArrowUpRight />
          </span>
        </div>
      </div>
    </>
  );
}

/**
 * The service cards that follow the hero once the splash releases. Ordinary
 * in-flow content: no pin, no scroll listener.
 *
 * Desktop/pointer: a fanned, overlapping stack. Hovering a card lifts it and
 * pushes its neighbours apart, the same interaction as the reference
 * "HoverStack" component — reimplemented here with this site's own card
 * face (tag, body copy, divider, Explore + arrow, side number) instead of
 * its pull-quote layout.
 * Touch: the stack has nothing to hover, so it falls back to a plain
 * vertical list, full width, in reading order.
 */
/**
 * Below this, the resting fan (fixed-width cards, CARD_WIDTH + 4*OVERLAP =
 * 1040px total) doesn't fit inside the container's content box at any of
 * the tiers above; use the list instead. Recomputed for the new tiered
 * container, not the old flat 5vw padding.
 */
const COMPACT_BREAKPOINT = 1240;

export function ServiceCards({ data }: { data: ServiceCardsData }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isTouch, setIsTouch] = useState(false);
  const [isNarrow, setIsNarrow] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [hasMounted, setHasMounted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    const pointerMq = window.matchMedia("(pointer: coarse)");
    const updatePointer = () => setIsTouch(pointerMq.matches);
    updatePointer();
    pointerMq.addEventListener("change", updatePointer);

    const updateWidth = () => {
      setIsNarrow(window.innerWidth < COMPACT_BREAKPOINT);
      setViewportWidth(window.innerWidth);
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);

    const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = (e: MediaQueryList | MediaQueryListEvent) => {
      setReduceMotion(e.matches);
      if (e.matches) setActiveIndex(null);
    };
    updateMotion(motionMq);
    motionMq.addEventListener("change", updateMotion);

    return () => {
      pointerMq.removeEventListener("change", updatePointer);
      window.removeEventListener("resize", updateWidth);
      motionMq.removeEventListener("change", updateMotion);
    };
  }, []);

  const isCompact = isTouch || isNarrow;

  const cards: PreparedCard[] = useMemo(
    () =>
      data.items.map((card, index) => ({
        ...card,
        _rotation: PRESET_ROTATIONS[index % PRESET_ROTATIONS.length],
        _baseX: index * OVERLAP,
        _baseZ: index + 1,
      })),
    [data.items]
  );

  const totalWidth =
    cards.length > 0 ? cards[cards.length - 1]._baseX + CARD_WIDTH : CARD_WIDTH;

  /**
   * The fan renders as soon as it fits at rest (COMPACT_BREAKPOINT), but a
   * hover push of the full PUSH_DISTANCE can still carry an edge card past
   * the viewport edge on the narrower end of that range, causing real page
   * horizontal scroll (confirmed at 1240-1440px). Scale the push down to
   * whatever room is actually available on either side of the resting fan,
   * so it can never push a card further than the viewport allows; it only
   * reaches the full, original distance once there's room to spare.
   */
  const pushDistance = Math.min(
    PUSH_DISTANCE,
    Math.max(40, (viewportWidth - totalWidth) / 2 - 24)
  );

  const getCardStyle = (card: PreparedCard, index: number): CSSVars => {
    if (reduceMotion) {
      return {
        transform: `translate3d(${card._baseX}px, 0, 0) rotate(${card._rotation}deg)`,
        zIndex: activeIndex === index ? 999 : card._baseZ,
        transition: "none",
        background: card.bg,
        color: card.text,
      };
    }

    const hasActive = activeIndex !== null;
    const isActive = activeIndex === index;
    let x = card._baseX;
    let y = 0;
    let rotate = card._rotation;
    let zIndex = card._baseZ;
    let scale = 1;
    let boxShadow: string | undefined;

    if (hasActive) {
      if (index < (activeIndex as number)) {
        x -= pushDistance;
        y -= SPREAD * 0.4;
      } else if (index > (activeIndex as number)) {
        x += pushDistance;
        y += SPREAD * 0.4;
      }
      if (isActive) {
        x = card._baseX;
        y = -HOVER_LIFT;
        rotate = 0;
        zIndex = 999;
        scale = 1.035;
        boxShadow = `0 0 0 3px ${HOVER_RING}, 0 24px 48px -22px rgb(40 54 24 / 0.4)`;
      }
    }

    const ms = DURATION * 1000;
    const transition = isActive
      ? `transform ${ms}ms cubic-bezier(0.22, 1.6, 0.32, 1), box-shadow ${ms * 1.3}ms cubic-bezier(0.22, 1.6, 0.32, 1)`
      : hasActive
        ? `transform ${ms}ms ${EASE_CSS}, box-shadow ${ms}ms ${EASE_CSS}`
        : `transform ${ms * 0.7}ms cubic-bezier(0.4, 0, 0.2, 1)`;

    return {
      transform: `translate3d(${x}px, ${y}px, 0) rotate(${rotate}deg) scale(${scale})`,
      zIndex,
      transition,
      background: card.bg,
      color: card.text,
      boxShadow,
    };
  };

  if (!hasMounted) {
    return <section id="work" className="cards-section" aria-hidden="true" />;
  }

  return (
    <motion.section
      id="work"
      className="cards-section"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: EASE }}
    >
      <div className="container">
        {isCompact ? (
          <div className="stack-mobile-list">
            {cards.map((card) => (
              <div key={card.tag} className="card" style={{ background: card.bg, color: card.text }}>
                <CardFace card={card} exploreLabel={data.exploreLabel} />
              </div>
            ))}
          </div>
        ) : (
          <div className="stack-outer">
            <div
              className="stack-frame"
              style={
                {
                  "--stack-width": `${totalWidth}px`,
                  "--stack-height": `${CARD_HEIGHT + (reduceMotion ? 0 : HOVER_LIFT) + 24}px`,
                } as CSSVars
              }
            >
              {cards.map((card, index) => (
                <div
                  key={card.tag}
                  className="card stack-card"
                  style={getCardStyle(card, index)}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  <CardFace card={card} exploreLabel={data.exploreLabel} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}
