"use client";

import { useEffect, useState } from "react";

export interface RailItem {
  id: string;
  number: string;
  name: string;
}

/**
 * The section index: a fixed rail down the left of a case study, one line
 * per section, number and tick with the name alongside. At rest the names
 * are folded away and the rail reads as ticks; hovering or focusing the
 * rail unfolds them. The active section's line is ink with a longer tick,
 * the rest are faint; the change eases. Modelled on the rail at
 * pleurat.com/work/mindpath, measured there (10px tracked caps, 18px tick
 * growing to 30px, 0.25s colour), on this site's tokens.
 *
 * Which section is active is decided by scroll position, not intersection
 * ratio: the section whose top has most recently passed a line a third of
 * the way down the screen. That is stable through sections taller than the
 * screen and through the short ones, and it lands on the right item after
 * the rail's own click (the anchor goes through SmoothScroll like any
 * other; nothing here scrolls). The rail is hidden while the page's hero
 * is on screen and appears as the first section arrives (its links leave
 * the tab order while hidden), and is not shown at all where the column
 * runs edge to edge (globals.css).
 */
export function SectionRail({ items, label }: { items: RailItem[]; label: string }) {
  const [active, setActive] = useState<string | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const sections = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => !!el);
    if (sections.length === 0) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.34;
      let current: string | null = null;
      for (const s of sections) if (s.getBoundingClientRect().top <= line) current = s.id;
      /* Past the last section's end (the footer), keep the last one. */
      setActive(current);
      setShown(sections[0].getBoundingClientRect().top < window.innerHeight * 0.8);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, [items]);

  return (
    <nav className={shown ? "cs-rail cs-rail--on" : "cs-rail"} aria-label={label}>
      {items.map((item) => (
        <a key={item.id} href={`#${item.id}`} className={item.id === active ? "cs-rail-item cs-rail-item--active" : "cs-rail-item"} aria-current={item.id === active ? "location" : undefined} tabIndex={shown ? 0 : -1}>
          <span className="cs-rail-number">{item.number}</span>
          <i className="cs-rail-tick" aria-hidden="true" />
          <span className="cs-rail-name">{item.name}</span>
        </a>
      ))}
    </nav>
  );
}
