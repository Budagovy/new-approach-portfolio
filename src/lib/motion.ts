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
 * Splash choreography, as scroll progress 0 to 1 across the pinned range.
 * The push scale is computed per viewport in SplashScreen, not set here.
 *
 *   0    -> 0.08   a beat on the room, so it registers as a place
 *   0.08 -> 0.74   the push, greeting handing over to the hero; the room
 *                  fades out over its last stretch, behind opaque cream
 *   0.74 -> 0.86   the cream under the hero clears, uncovering the next
 *                  section, which has been held there all along
 *   0.86 -> 1      a short settle on the finished picture
 *
 * The middle two must never overlap: the cream may only start to clear
 * once the push is complete and the room is fully gone, or a slow scroll
 * shows the room through it (a real bug, since fixed). revealEnd > zoomEnd
 * is the whole rule; the flow gate checks the invariant on every frame of
 * a slow and a fast scroll.
 */
export const HERO = {
  /**
   * The spring that smooths scroll progress before the splash reads it.
   * It used to be soft (90/26, ~0.5s behind): right when raw wheel input
   * was all there was, but Lenis now smooths the scroll itself, so this
   * was smoothing it twice, and on a fast flick the page released with
   * the hero still mid-zoom, 120px short of where the next section
   * expected it. Stiffer and just over critically damped (no overshoot,
   * ~0.1s behind): it keeps up with a flick and still takes the steps out
   * of native touch and trackpad input where Lenis is not running.
   */
  spring: { stiffness: 320, damping: 38, restDelta: 0.0005 },
  zoomStart: 0.08,
  zoomEnd: 0.74,
  /** Where the cover has fully cleared. */
  revealEnd: 0.86,
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
  /** Leaves the tail of the hold for 04's reveal to finish before the
   *  section lets go. */
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
  /** How much of the grid must be on screen before the cards start. Low,
   *  because the projects sit in view under the approach while it holds
   *  (the user asked to see the next section without scrolling for it),
   *  showing only the top of the grid on a short screen: that much has
   *  to be enough to open the cards. */
  inView: 0.12,
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
