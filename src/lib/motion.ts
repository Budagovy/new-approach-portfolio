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
 * Splash choreography, as scroll progress 0 to 1 across the pinned range.
 * The push scale is computed per viewport in SplashScreen, not set here.
 *
 *   0    -> 0.08   a beat on the room, so it registers as a place
 *   0.08 -> 0.72   the push, greeting handing over to the hero
 *   0.72 -> 1      the settle, during which the next section slides up
 *                  under the hero
 *
 * On desktop the hero is a content-height block at the top of the
 * full-screen stage and the next section is pulled up beneath it
 * (SplashScreen's measured margin), so that section enters the screen
 * (stage height - hero height) before the pin ends: ~210px at 1440x900,
 * ~350px at 1920x1080. The push must be over by then:
 * zoomEnd <= 1 - (vh - heroH) / ((pinVh - 1) * vh), which is 0.83 and
 * 0.77 at those sizes, so 0.72 clears both with room. The sections gate
 * checks it.
 */
export const HERO = {
  zoomStart: 0.08,
  zoomEnd: 0.72,
  /**
   * Pinned scroll length, in viewport heights. Was 4.5 with the push
   * spanning 0.18 to 0.62 — a long hold at each end. The user found it
   * took "a couple of scrolls" to leave the hero: at 900px tall that was
   * ~3,150px of scrolling, most of it holding. Now 2.4, with the push
   * taking most of it and a short settle after arrival.
   */
  pinVh: 2.4,
  /**
   * The monitor's resting screen (the greeting) dissolves into the hero
   * over this slice of the push (0 = push starts, 1 = push ends): gone
   * well before the monitor fills the view, so the hero is what arrives.
   */
  screenOut: [0.05, 0.4],
} as const;

/**
 * "My approach": scroll-driven and held. The section is content-height
 * and sticks under the header while the reader scrolls through `holdVh`
 * more screens; progress through that hold, 0 to 1, is the only thing
 * that moves the line:
 *
 *   0         -> fillStart  step 01 (lit by the entrance); a beat
 *   fillStart -> fillEnd    the line runs 01 to 04, lighting each step
 *   fillEnd   -> 1          04 finishes revealing, then the hold releases
 *
 * Nothing here runs on a clock: stop scrolling and the line stops.
 */
export const APPROACH = {
  /** Length of the hold, in viewport heights. ~0.3 of a screen per
   *  milestone: enough that each reveal is a deliberate scroll, short
   *  enough not to overstay (the user disliked long holds on the hero). */
  holdVh: 0.9,
  fillStart: 0.04,
  /** Leaves the tail of the hold for 04's reveal to finish, and keeps the
   *  projects (which rise from below during the hold) from starting their
   *  own reveal before 04 has landed. */
  fillEnd: 0.8,
  /** A milestone stays revealed once it has appeared, even if the reader
   *  scrolls back up ("each milestone should stay visible after it
   *  appears"). false makes the whole sequence reversible with scroll. */
  latch: true,
  /** One step's title/description reveal, seconds. */
  reveal: 0.34,
  /** Title-to-description stagger within a step, seconds. */
  stagger: 0.08,
} as const;

/**
 * "Selected projects": the label fades in as the section enters, then the
 * cards open one after another, left to right. Deliberately quiet: a fade
 * with a small rise, nothing else.
 */
export const PROJECTS = {
  /** How much of the grid must be on screen before the cards start. The
   *  section rises from below during the approach's hold, so this is set
   *  high enough that the cards cannot begin before milestone 04 has
   *  landed (the sequence gate checks exactly that). */
  inView: 0.35,
  /** Seconds between one card starting and the next. */
  stagger: 0.18,
  /** One card's fade, seconds. */
  duration: 0.9,
  /** How far a card rises as it fades in, px. */
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
