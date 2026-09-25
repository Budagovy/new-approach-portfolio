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
 *   0.08 -> 0.86   the push, greeting handing over to the hero
 *   0.86 -> 1      a short settle on the finished picture
 *
 * The push is eased in and out, so its last tenth is slow: it covers
 * about a quarter of the scroll. By push 0.8 the monitor already fills
 * the screen and the hero LOOKS arrived. What happens under the hero in
 * that long tail is set by two ranges, in units of push:
 *
 *   roomOut   the room fades out, behind opaque cream, unseen
 *   coverOut  the cream under the hero clears, and the next section,
 *             held there all along, fades in
 *
 * Two rules, both learned from bugs the user reported:
 * - coverOut must start no earlier than roomOut ends. If the cream
 *   starts to clear while any room is left, a slow scroll parks the page
 *   with the room showing through under the hero.
 * - coverOut must not wait for the push to END. It did (the cover
 *   cleared after zoomEnd), and the reader sat looking at an arrived hero
 *   over blank cream for a quarter of the scroll, the next section
 *   nowhere. It has to come in with the tail, complete as the hero
 *   settles.
 * The flow gate checks the first on every frame of real slow and fast
 * scrolls, and the second by parking across the tail.
 */
export const HERO = {
  /**
   * The spring that smooths scroll progress before the splash reads it.
   * It used to be soft (90/26, ~0.5s behind): right when raw wheel input
   * was all there was, but Lenis now smooths the scroll itself, so this
   * was smoothing it twice, and on a fast flick the page released with
   * the hero still mid-zoom, 120px short of where the next section
   * expected it. Stiff and just over critically damped (no overshoot,
   * ~0.05s behind): it keeps up with a hard flick (320/38 still trailed
   * one by 15px at 1920x1080) and still takes the last of the steps out
   * of native touch and trackpad input where Lenis is not running.
   */
  spring: { stiffness: 600, damping: 50, restDelta: 0.0005 },
  zoomStart: 0.08,
  zoomEnd: 0.86,
  /** The room's fade, in push. Starts once the monitor fills the screen. */
  roomOut: [0.78, 0.9],
  /** The cover's clearing, in push. Must start where roomOut ends, or later. */
  coverOut: [0.9, 1],
  /**
   * Pinned scroll length, in viewport heights. Was 4.5 with the push
   * spanning 0.18 to 0.62 — a long hold at each end. The user found it
   * took "a couple of scrolls" to leave the hero: at 900px tall that was
   * ~3,150px of scrolling, most of it holding. Then 2.4; now 2.2 with the
   * push running to 0.86 of it, which keeps the push the length it was
   * and trims the settle after it to about one wheel tick (the guide in
   * SmoothScroll carries a pause there on to the release anyway).
   */
  pinVh: 2.2,
  /**
   * The monitor's resting screen (the greeting) dissolves into the hero
   * over this slice of the push (0 = push starts, 1 = push ends): gone
   * well before the monitor fills the view, so the hero is what arrives.
   */
  screenOut: [0.05, 0.4],
} as const;

/**
 * The greeting typed onto the monitor at rest, after the typewriter the
 * owner pointed at (21st.dev, designali-in): one character at a time
 * behind a thin cursor that blinks, a beat before it starts, held with
 * the cursor blinking once complete.
 */
export const GREETING = {
  /** Before the first character, ms. */
  delay: 600,
  /** Per character, ms. */
  perChar: 70,
  /** The cursor's blink, seconds per cycle (CSS). */
  blink: 1,
} as const;

/**
 * "My approach", held in view while its four milestones fill along the
 * timeline, one at a time and in order.
 */
export const APPROACH = {
  /**
   * The held sequence's scroll length, in viewport heights, shared equally
   * between the milestones: 1.6 gives each one 0.4 of a screen, about four
   * wheel ticks — long enough to watch a bar fill, short enough that the
   * section is not a chore to get past. It is the section's own padding,
   * so changing it changes the sequence and nothing else.
   */
  scrubVh: 1.6,
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
  /** The reach of the splash's landing (the point its pin lets go), which
   *  is longer than the rest: it has to stretch back to where the hero
   *  first LOOKS arrived (push ~0.8), so a reader who pauses anywhere in
   *  the push's slow tail, with the next section only part faded in under
   *  the hero, is carried on to the finished picture instead of being
   *  left on a half-made one. */
  arrival: 0.56,
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
