"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { SCROLL } from "@/lib/motion";

/**
 * Inertia scrolling for the whole page: wheel and trackpad input is eased
 * toward its target instead of stepping, so moving between sections
 * glides. Lenis drives the real window scroll position, so everything
 * that reads it (the pinned splash and approach via Motion's useScroll,
 * the in-view reveals) keeps working untouched. Touch stays native
 * (syncTouch off) and keyboard scrolling is the browser's. Anchor links
 * glide too, landing below the fixed header (Lenis reads the page's
 * scroll-padding-top for that). Not started at all under
 * reduced motion: scrolling is then exactly the browser's own.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    /* `anchors` glides anchor links and already honours the page's
       scroll-padding-top (the header's height); an explicit offset here
       doubled it, measured. */
    const lenis = new Lenis({
      lerp: SCROLL.lerp,
      smoothWheel: true,
      syncTouch: false,
      anchors: true,
      autoRaf: true,
    });
    return () => lenis.destroy();
  }, []);
  return null;
}
