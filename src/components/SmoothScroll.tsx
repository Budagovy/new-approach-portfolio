"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { SCROLL, SNAP } from "@/lib/motion";

const scrollPad = () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;

/** Where an element's top lands under the fixed header, as a scroll position. */
const landingOf = (el: Element) => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return Math.round(Math.max(0, Math.min(max, el.getBoundingClientRect().top + window.scrollY - scrollPad())));
};

/**
 * The page's landings: the top, plus every `data-snap` section's top under
 * the header. Read fresh each time: they depend on layout that settles
 * after hydration and changes on resize.
 */
const landings = () => [0, ...[...document.querySelectorAll("[data-snap]")].map(landingOf)];

/**
 * Inertia scrolling for the whole page: wheel and trackpad input is eased
 * toward its target instead of stepping, so moving between sections
 * glides. Lenis drives the real window scroll position, so everything
 * that reads it (the in-view reveals) keeps working untouched. Touch
 * stays native (syncTouch off) and keyboard scrolling is the browser's.
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
 * scroll-padding-top).
 *
 * Not started at all under reduced motion: scrolling and anchors are then
 * exactly the browser's own.
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
      const reach = SNAP.ahead * window.innerHeight;
      let landing: number | null = null;
      for (const at of landings()) {
        const gap = (at - rest) * direction; // > 0: ahead of the reader
        if (gap >= -SNAP.behind && gap <= reach && (landing === null || Math.abs(at - rest) < Math.abs(landing - rest))) {
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
      lenis.scrollTo(landingOf(target));
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
