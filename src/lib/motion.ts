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
 *   0.72 -> 1      a settle on the hero before the page moves on
 *
 * The settle is short but not nothing: arriving somewhere and being moved
 * straight on is what makes a transition feel rushed. The holds used to be
 * far longer (0.18 and 0.38 of a 4.5-screen track); see pinVh.
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
 * "My approach": the four-step section pinned after the hero, as scroll
 * progress 0 to 1 across its track.
 *
 *   0    -> fillStart   step 01 already lit; a beat before the line moves
 *   fillStart -> fillEnd the orange line runs 01 to 04, lighting each step
 *   fillEnd -> 1        hold on the finished state, so 04 can be read
 */
export const APPROACH = {
  /** Track length in viewport heights: one for the stage, the rest is
   *  scroll. 2.4 gives each of the three steps a comfortable stretch
   *  without the section overstaying (it was 3.2). */
  pinVh: 2.4,
  fillStart: 0.06,
  fillEnd: 0.8,
  /** One step's title/description reveal, seconds. */
  reveal: 0.34,
  /** Title-to-description stagger within a step, seconds. */
  stagger: 0.08,
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
