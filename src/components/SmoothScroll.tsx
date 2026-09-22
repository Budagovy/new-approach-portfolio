"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { SCROLL, SNAP } from "@/lib/motion";

/**
 * Where an element comes to rest in the document, in px from the top.
 *
 * Not simply its rectangle plus the scroll position: the splash holds
 * everything after the hero stuck in view beneath it for the length of
 * its pin, displaced from where it will finally sit. That sticky box is
 * marked `data-hold` and is followed in its container only by the spacer
 * it sticks through, so once it lets go it sits at the container's
 * bottom; the distance it still has to travel is the gap between its own
 * bottom and its container's, whatever the scroll position. Summed over
 * every hold above the element, that turns "where it is now" into "where
 * it rests". On routes with no hold it is the plain rectangle.
 */
function restingTop(el: Element): number {
  let y = el.getBoundingClientRect().top + window.scrollY;
  for (let hold = el.closest("[data-hold]"); hold; hold = hold.parentElement?.closest("[data-hold]") ?? null) {
    const container = hold.parentElement;
    if (!container || getComputedStyle(hold).position !== "sticky") continue;
    y += container.getBoundingClientRect().bottom - hold.getBoundingClientRect().bottom;
  }
  return y;
}

const scrollPad = () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

/**
 * The page's landings: the top, plus one per `data-snap` element. "start"
 * (the default) lands the element's top under the fixed header; "end"
 * lands its bottom on the screen's bottom (the splash's track: the point
 * its pin lets go, hero arrived). `data-snap-reach` widens how far ahead
 * that landing is offered from. Read fresh each time: layout settles
 * after hydration and changes on resize.
 */
function landings(): { at: number; reach: number }[] {
  const pad = scrollPad();
  const points: { at: number; reach: number }[] = [{ at: 0, reach: SNAP.ahead }];
  document.querySelectorAll<HTMLElement>("[data-snap]").forEach((el) => {
    const top = restingTop(el);
    const at = el.dataset.snap === "end" ? top + el.offsetHeight - window.innerHeight : top - pad;
    points.push({ at: Math.round(Math.max(0, Math.min(maxScroll(), at))), reach: parseFloat(el.dataset.snapReach ?? "") || SNAP.ahead });
  });
  return points;
}

/**
 * Inertia scrolling for the whole page: wheel and trackpad input is eased
 * toward its target instead of stepping, so moving between sections
 * glides. Lenis drives the real window scroll position, so everything
 * that reads it (the splash via Motion's useScroll, the in-view reveals)
 * keeps working untouched. Touch stays native (syncTouch off) and
 * keyboard scrolling is the browser's.
 *
 * Guided scrolling sits on top of that: when wheel input goes quiet, if
 * the glide would come to rest just short of a landing in the direction
 * of travel, it is extended onto the landing. Forward only, close only,
 * interruptible; the rules and numbers are SNAP in motion.ts. It is
 * written here rather than taken from `lenis/snap`, whose proximity mode
 * snaps to the NEAREST point whichever way the reader was going: nudge
 * one tick past a landing, pause, and it drags you back, every time.
 * Touch is left alone (native momentum should not be fought), as are the
 * keyboard, the scrollbar and programmatic scrolls.
 *
 * Anchor links glide too, landing below the fixed header (the page's
 * scroll-padding-top), at the target's RESTING position (see restingTop).
 *
 * Not started at all under reduced motion: scrolling and anchors are then
 * exactly the browser's own, and nothing on the page holds.
 */
export function SmoothScroll() {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  /* Arriving with a hash, on load or by a client-side route change (a case
     study's "Back to projects" is a Link to "/#work"): the browser has
     already jumped to the target's CURRENT rectangle, which inside the
     splash's hold is not where it rests. Correct that once layout has
     settled: the splash measures its hero and pulls the page up after
     hydration, so a second pass a little later catches that. */
  useEffect(() => {
    const settle = () => {
      const lenis = lenisRef.current;
      const id = decodeURIComponent(window.location.hash.slice(1));
      const target = id && document.getElementById(id);
      if (!lenis || !target) return;
      lenis.scrollTo(Math.max(0, Math.min(maxScroll(), Math.round(restingTop(target) - scrollPad()))), { immediate: true });
    };
    const timers = [150, 700].map((ms) => window.setTimeout(settle, ms));
    return () => timers.forEach(clearTimeout);
  }, [pathname]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({
      lerp: SCROLL.lerp,
      smoothWheel: true,
      syncTouch: false,
      autoRaf: true,
    });
    lenisRef.current = lenis;

    /* --- guided scrolling --- */
    let direction = 0;
    let quiet = 0;
    const guide = () => {
      if (direction === 0) return;
      /* Where the glide in progress will come to rest, not where the page
         is this frame: redirecting the glide is one continuous movement;
         waiting for it to stop and then moving again would be two. */
      const rest = lenis.targetScroll;
      let landing: number | null = null;
      for (const { at, reach } of landings()) {
        const gap = (at - rest) * direction; // > 0: ahead of the reader
        if (gap >= -SNAP.behind && gap <= reach * window.innerHeight && (landing === null || Math.abs(at - rest) < Math.abs(landing - rest))) {
          landing = at;
        }
      }
      if (landing !== null && Math.abs(landing - rest) > 1) lenis.scrollTo(landing, { lerp: SNAP.lerp });
    };
    const onInput = ({ deltaY, event }: { deltaY: number; event: Event }) => {
      if (event.type.startsWith("touch")) return;
      if (deltaY !== 0) direction = Math.sign(deltaY);
      window.clearTimeout(quiet);
      quiet = window.setTimeout(guide, SNAP.quiet);
    };
    lenis.on("virtual-scroll", onInput);

    /* --- anchor links --- */
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.('a[href^="#"]');
      if (!link) return;
      const id = decodeURIComponent((link.getAttribute("href") ?? "").slice(1));
      const target = id ? document.getElementById(id) : document.documentElement;
      if (!target) return;
      e.preventDefault();
      window.clearTimeout(quiet);
      lenis.scrollTo(Math.max(0, Math.min(maxScroll(), Math.round(restingTop(target) - scrollPad()))));
      history.pushState(null, "", id ? `#${id}` : window.location.pathname);
    };
    document.addEventListener("click", onClick);

    return () => {
      window.clearTimeout(quiet);
      lenisRef.current = null;
      document.removeEventListener("click", onClick);
      lenis.destroy();
    };
  }, []);
  return null;
}
