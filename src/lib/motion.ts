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
} as const;
