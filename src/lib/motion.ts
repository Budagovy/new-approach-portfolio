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
 * "My approach": one screen, no pin. The sequence plays on its own the
 * first time the section comes into view: step 01 lights with the
 * entrance, then the orange line runs 01 to 04 over `fillDuration`,
 * lighting each step as it passes its marker. (It used to be scrubbed by
 * scroll across a 2.4-screen track; the user asked for the section to fit
 * the screen exactly, which leaves no scroll to scrub with.)
 */
export const APPROACH = {
  /** Beat between the entrance and the line starting to move, seconds. */
  fillDelay: 0.6,
  /** The line's run from 01 to 04, seconds. */
  fillDuration: 2.4,
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
