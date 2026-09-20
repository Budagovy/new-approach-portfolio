/**
 * Every timing value on the site lives here. Tune this file, not components.
 */

/** The house curve. Fast out, long settle. */
export const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Page scrolling (SmoothScroll.tsx / Lenis). `lerp` is how much of the
 * remaining distance each frame covers: 0.1 is a soft glide that still
 * arrives promptly; higher is snappier, lower floatier.
 */
export const SCROLL = {
  lerp: 0.1,
} as const;

/**
 * Guided scrolling: a gentle assist that settles a wheel or trackpad
 * scroll onto the next section's landing, never a lock. The rules that
 * keep it from feeling rigid:
 *
 * - forward only: it helps toward a landing that lies AHEAD in the
 *   direction the reader is moving and is already close; it never pulls
 *   back against them (the stock proximity snap does, and a reader
 *   nudging one tick at a time could not get past a landing);
 * - close only: beyond `ahead` of a screen it does nothing, so a short
 *   deliberate scroll stays exactly where the reader put it;
 * - interruptible: any new input takes over at once.
 */
export const SNAP = {
  /** How near (as a share of the screen's height) a landing ahead must be
   *  to where the scroll would come to rest before it is offered. */
  ahead: 0.3,
  /** A landing just passed, within this many px, is settled back onto:
   *  a few px of overshoot tidied, not a pull. Under one wheel tick. */
  behind: 56,
  /** Input must be quiet this long (ms) before the guide acts, so it
   *  never competes with a scroll still in progress. */
  quiet: 120,
  /** The glide onto a landing: a little softer than ordinary scrolling. */
  lerp: 0.075,
} as const;

/**
 * Section reveals: each section's content comes in once, the first time
 * it scrolls into view. Deliberately quiet, a fade with a small rise,
 * items in a row a beat apart. Under reduced motion everything is simply
 * there.
 */
export const REVEAL = {
  /** Share of the element that must be on screen before it reveals. */
  inView: 0.2,
  /** One item's fade, seconds. */
  duration: 0.8,
  /** Seconds between items in a row (approach steps, project cards). */
  stagger: 0.14,
  /** How far an item rises as it fades in, px. */
  rise: 12,
} as const;

/**
 * The city strip at the foot of the hero. The heading cadence (one every
 * 1.5s) is fixed inside the approved component itself; only the city's
 * scroll speed is tunable from outside.
 */
export const CITY = {
  /** CSS px per second. The approved value. */
  speed: 22,
} as const;
