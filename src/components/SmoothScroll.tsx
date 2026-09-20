"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { SCROLL } from "@/lib/motion";

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

/**
 * Inertia scrolling for the whole page: wheel and trackpad input is eased
 * toward its target instead of stepping, so moving between sections
 * glides. Lenis drives the real window scroll position, so everything
 * that reads it (the pinned splash and approach via Motion's useScroll,
 * the in-view reveals) keeps working untouched. Touch stays native
 * (syncTouch off) and keyboard scrolling is the browser's.
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

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.('a[href^="#"]');
      if (!link) return;
      const id = decodeURIComponent((link.getAttribute("href") ?? "").slice(1));
      const target = id ? document.getElementById(id) : document.documentElement;
      if (!target) return; // a section that doesn't exist yet: leave it to the browser
      e.preventDefault();
      const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      lenis.scrollTo(Math.max(0, Math.round(restingTop(target) - pad)));
      history.pushState(null, "", id ? `#${id}` : window.location.pathname);
    };
    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
      lenis.destroy();
    };
  }, []);
  return null;
}
