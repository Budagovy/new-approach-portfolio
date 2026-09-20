"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { SCROLL, SNAP } from "@/lib/motion";

/**
 * Where an element comes to rest in the document, in px from the top.
 *
 * Not simply its rectangle plus the scroll position: sections that hold
 * the reader (the splash, the approach) keep what follows them stuck in
 * view, displaced from where it will finally sit. Each such sticky box is
 * marked `data-hold` and is followed in its container only by the spacer
 * it sticks through, so once it lets go it sits at the container's
 * bottom; the distance it still has to travel is therefore the gap
 * between its own bottom and its container's, whatever the scroll
 * position. Summed over every hold above the element, that turns "where
 * it is now" into "where it rests".
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

/**
 * The page's landings, as scroll positions: the top, plus one per element
 * marked `data-snap`. "start" lands the element's top under the fixed
 * header (a section arriving); "end" lands its bottom on the screen's
 * bottom (the splash: the point its pin lets go, hero arrived and the
 * page about to move). `data-snap-reach` overrides how far ahead (as a
 * share of the screen) that landing is offered from; the default is
 * SNAP.ahead. Read fresh each time: they depend on layout that settles
 * after hydration and changes on resize.
 */
function landings(): { at: number; reach: number }[] {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const pad = scrollPad();
  const points: { at: number; reach: number }[] = [{ at: 0, reach: SNAP.ahead }];
  document.querySelectorAll<HTMLElement>("[data-snap]").forEach((el) => {
    const top = restingTop(el);
    const at = el.dataset.snap === "end" ? top + el.offsetHeight - window.innerHeight : top - pad;
    points.push({ at: Math.round(Math.max(0, Math.min(max, at))), reach: parseFloat(el.dataset.snapReach ?? "") || SNAP.ahead });
  });
  return points;
}

/**
 * Inertia scrolling for the whole page: wheel and trackpad input is eased
 * toward its target instead of stepping, so moving between sections
 * glides. Lenis drives the real window scroll position, so everything
 * that reads it (the pinned splash and approach via Motion's useScroll,
 * the in-view reveals) keeps working untouched. Touch stays native
 * (syncTouch off) and keyboard scrolling is the browser's.
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
 * scroll-padding-top). They are handled here rather than by Lenis's own
 * `anchors` option, which aims at the target's current rectangle: see
 * restingTop for why that is the wrong place on this page.
 *
 * Not started at all under reduced motion: scrolling is then exactly the
 * browser's own, and nothing on the page holds, so native anchors are
 * right as they are.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({
      lerp: SCROLL.lerp,
      smoothWheel: true,
      syncTouch: false,
      autoRaf: true,
    });

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
      if (!target) return; // a section that doesn't exist yet: leave it to the browser
      e.preventDefault();
      window.clearTimeout(quiet);
      lenis.scrollTo(Math.max(0, Math.round(restingTop(target) - scrollPad())));
      history.pushState(null, "", id ? `#${id}` : window.location.pathname);
    };
    document.addEventListener("click", onClick);

    return () => {
      window.clearTimeout(quiet);
      document.removeEventListener("click", onClick);
      lenis.destroy();
    };
  }, []);
  return null;
}
