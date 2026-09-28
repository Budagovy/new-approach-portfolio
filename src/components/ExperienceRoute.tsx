"use client";

import { useEffect, useRef } from "react";
import { ROUTE } from "@/lib/motion";

type Point = [number, number];
/** One straight piece of a stretch, with the way an arrow points along it. */
type Leg = { from: Point; to: Point; length: number; angle: number };
/** The dotted path from one role to the next. */
type Stretch = { legs: Leg[]; length: number };

/**
 * Arrowheads travelling the dotted path between the experience cards, from
 * each role to the next and round again, after the owner's reference (a
 * dashed road with arrows gliding along it): the dashes stay where they
 * are and the arrows move over them, several at once, evenly spaced, each
 * fading in as it sets off and out as it arrives.
 *
 * The path is not redrawn here. Each card draws its stretch as a ::after
 * box with two dashed borders (globals.css), and the route is read back
 * from those boxes, so the arrows follow the dashes exactly in whatever
 * layout the cards are in. Stretches too short to travel (the ticks
 * between stacked cards on a phone) are left still.
 *
 * It runs only while the section is on screen, and not at all under
 * reduced motion, where the dotted path simply stands.
 */
export function ExperienceRoute() {
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    const map = layer?.parentElement;
    if (!layer || !map) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let stretches: Stretch[] = [];
    let total = 0;
    let arrows: HTMLSpanElement[] = [];

    const measure = () => {
      stretches = [];
      for (const card of map.querySelectorAll<HTMLElement>(".role")) {
        const a = getComputedStyle(card, "::after");
        if (a.content === "none" || a.content === "normal") continue;
        const bt = parseFloat(a.borderTopWidth) || 0, br = parseFloat(a.borderRightWidth) || 0;
        const bb = parseFloat(a.borderBottomWidth) || 0, bl = parseFloat(a.borderLeftWidth) || 0;
        /* The ::after's border box, in the map's coordinates (offsets ignore
           the cards' reveal transform, so this is where they settle). */
        const x = card.offsetLeft + parseFloat(a.left), y = card.offsetTop + parseFloat(a.top);
        const w = parseFloat(a.width) + bl + br, h = parseFloat(a.height) + bt + bb;
        let points: Point[];
        if (bt && br) points = [[x, y + 0.5], [x + w - 0.5, y + 0.5], [x + w - 0.5, y + h]];        /* across, then down */
        else if (bb && br) points = [[x, y + h - 0.5], [x + w - 0.5, y + h - 0.5], [x + w - 0.5, y]]; /* across, then up */
        else if (bl) points = [[x + 0.5, y], [x + 0.5, y + h]];                                       /* straight down */
        else continue;
        const legs: Leg[] = [];
        for (let i = 1; i < points.length; i++) {
          const [x1, y1] = points[i - 1], [x2, y2] = points[i];
          legs.push({ from: points[i - 1], to: points[i], length: Math.hypot(x2 - x1, y2 - y1), angle: (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI });
        }
        const length = legs.reduce((sum, leg) => sum + leg.length, 0);
        if (length >= ROUTE.shortest) stretches.push({ legs, length });
      }
      total = stretches.reduce((sum, s) => sum + s.length, 0);
      /* As many arrows as the route has room for at the set spacing. */
      const count = total > 0 ? Math.max(1, Math.round(total / ROUTE.spacing)) : 0;
      while (arrows.length < count) {
        const arrow = document.createElement("span");
        arrow.className = "route-arrow";
        layer.appendChild(arrow);
        arrows.push(arrow);
      }
      while (arrows.length > count) arrows.pop()!.remove();
    };

    /* Where an arrow `d` px along a stretch is, which way it points, how visible it is. */
    const place = (arrow: HTMLSpanElement, stretch: Stretch, d: number) => {
      let left = d;
      for (const leg of stretch.legs) {
        if (left <= leg.length) {
          const t = leg.length ? left / leg.length : 0;
          const px = leg.from[0] + (leg.to[0] - leg.from[0]) * t, py = leg.from[1] + (leg.to[1] - leg.from[1]) * t;
          arrow.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) rotate(${leg.angle}deg)`;
          arrow.style.opacity = String(Math.max(0, Math.min(1, d / ROUTE.fade, (stretch.length - d) / ROUTE.fade)).toFixed(3));
          return;
        }
        left -= leg.length;
      }
    };

    let raf = 0;
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const travelled = ((now - start) / 1000) * ROUTE.speed;
      arrows.forEach((arrow, k) => {
        /* evenly spaced along the whole route, A1 to A5, then round again */
        let d = (travelled + (k * total) / arrows.length) % total;
        for (const stretch of stretches) {
          if (d <= stretch.length) { place(arrow, stretch, d); return; }
          d -= stretch.length;
        }
      });
      raf = requestAnimationFrame(tick);
    };
    const run = () => { if (!raf && total > 0) raf = requestAnimationFrame(tick); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };

    measure();
    /* Card heights settle after fonts load and change when copy rewraps. */
    const ro = new ResizeObserver(() => measure());
    ro.observe(map);
    /* Only while the section is on screen. */
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? run() : stop()));
    io.observe(map);

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      arrows.forEach((arrow) => arrow.remove());
      arrows = [];
    };
  }, []);

  return <div ref={layerRef} className="experience-route" aria-hidden="true" />;
}
