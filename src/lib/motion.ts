/**
 * Every timing value on the site lives here. Tune this file, not components.
 */

/** The house curve. Fast out, long settle. */
export const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Splash choreography, as scroll progress 0 to 1 across the pinned range.
 * The push scale is computed per viewport in SplashScreen, not set here.
 *
 *   0    -> 0.18   hold on the room, so it registers as a place
 *   0.18 -> 0.62   the push, greeting handing over to the hero
 *   0.62 -> 1      hold on the hero
 *
 * The last stretch is the longest on purpose. Arriving somewhere and being
 * moved straight on is what makes a transition feel rushed.
 */
export const HERO = {
  zoomStart: 0.18,
  zoomEnd: 0.62,
  /** Pinned scroll length, in viewport heights. */
  pinVh: 4.5,
  /**
   * The monitor's resting screen (the greeting) dissolves into the hero
   * over this slice of the push (0 = push starts, 1 = push ends): gone
   * well before the monitor fills the view, so the hero is what arrives.
   */
  screenOut: [0.05, 0.4],
} as const;

/**
 * "My approach": the four-step section pinned after the hero, as scroll
 * progress 0 to 1 across its track.
 *
 *   0    -> fillStart   step 01 already lit; a beat before the line moves
 *   fillStart -> fillEnd the orange line runs 01 to 04, lighting each step
 *   fillEnd -> 1        hold on the finished state, so 04 can be read
 */
export const APPROACH = {
  /** Track length in viewport heights: one for the stage, the rest is scroll. */
  pinVh: 3.2,
  fillStart: 0.08,
  fillEnd: 0.78,
  /** One step's title/description reveal, seconds. */
  reveal: 0.34,
  /** Title-to-description stagger within a step, seconds. */
  stagger: 0.08,
} as const;

/**
 * "Selected projects": a fan of cards, after 21st.dev's card-fan-carousel
 * (GSAP there, ported to Motion here). The fan's geometry lives with the
 * component; these are its feel. The springs stand in for the original's
 * elastic.out eases: a little overshoot, then settle.
 */
export const FAN = {
  /** Entrance: cards rise from below the centre and open into the fan. */
  enter: { type: "spring", duration: 1.2, bounce: 0.38 },
  enterDelay: 0.2,
  enterStagger: 0.06,
  /** Hover: the lifted card and the neighbours it pushes aside. */
  hover: { type: "spring", duration: 0.55, bounce: 0.32 },
  hoverStagger: 0.02,
  /** Paging (more than seven cards): shifting slot, arriving, leaving. */
  shift: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  pageIn: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  pageOut: { duration: 0.4, ease: [0.55, 0, 1, 0.45] },
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
