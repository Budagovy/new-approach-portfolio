"use client";

import { useEffect, useRef, useState } from "react";
import { RevealGroup, RevealItem } from "@/components/Reveal";
import { SectionBar, type SectionLabel } from "@/components/SectionBar";
import { APPROACH } from "@/lib/motion";

export interface ApproachStep {
  title: string;
  description: string;
}

export interface ApproachData {
  label: SectionLabel;
  heading: string;
  steps: ApproachStep[];
}

const number = (i: number) => String(i + 1).padStart(2, "0");
const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * "My approach", per the Figma frame: a small centred heading, then a
 * thin timeline across the whole frame with four evenly spaced numbered
 * circles, the first orange and the rest charcoal, and all four steps'
 * titles and descriptions shown together under them.
 *
 * The section is held in view while its milestones fill, one at a time
 * and in order. It is a plain sticky pin, scrubbed by the real scroll
 * position: the section is the track, the block inside it sticks, and the
 * extra scroll length the sequence needs is the track's own padding
 * (APPROACH.scrubVh), so it is scoped to this section and nothing else on
 * the page moves. Nothing is locked and nothing runs on a clock: the fill
 * is read from where the page is this frame, so it stops the instant the
 * reader stops and reverses exactly when they scroll back.
 *
 * Each milestone's fill is a length of the timeline's own rule, in the
 * accent, lying under the circles (the rule itself is untouched beneath
 * it). Progress p over the held length is shared out between them: bar i
 * runs from p = i/n to (i+1)/n, so the next one starts only once the one
 * before it is full, and the ones behind stay full.
 *
 * Where the block is taller than the screen (narrow phones, landscape) it
 * sticks by its bottom instead, so the fourth milestone is on screen while
 * it fills. Under reduced motion there is no hold at all: no added scroll
 * length, and the milestones simply read as complete.
 */
export function Approach({ data }: { data: ApproachData }) {
  const trackRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);
  /* The server cannot know the reader's motion preference, so it renders
     the held version and an effect turns it off: deciding this in the
     render itself was a hydration mismatch twice elsewhere on this page. */
  const [held, setHeld] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setHeld(!query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    const pin = pinRef.current;
    if (!track || !pin) return;
    const bars = barsRef.current.filter((b): b is HTMLSpanElement => !!b);
    const fill = (i: number, v: number) => bars[i]?.style.setProperty("--p", v.toFixed(4));
    if (!held) {
      bars.forEach((_, i) => fill(i, 1));
      return;
    }

    /* Measured, not read per frame: where the block comes to rest under the
       fixed header (or, if it is taller than the screen, against the foot of
       it), and how long the held sequence is — the track's padding, which is
       in viewport heights and so changes with the window. */
    let top = 0;
    let run = 0;
    const measure = () => {
      const header = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      top = Math.round(Math.min(header, window.innerHeight - pin.offsetHeight));
      pin.style.top = `${top}px`;
      /* Whole pixels, from the same boxes the browser sticks by: a
         fractional run leaves the last bar a thousandth short of full at
         the moment the block lets go. */
      run = track.offsetHeight - pin.offsetHeight;
    };

    let raf = 0;
    const update = () => {
      raf = 0;
      const p = run > 0 ? clamp((top - track.getBoundingClientRect().top) / run) : 0;
      for (let i = 0; i < bars.length; i++) fill(i, clamp(p * bars.length - i));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    const onResize = () => { measure(); onScroll(); };

    measure();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    /* The block's height settles after hydration (fonts, the reveal) and
       changes when the copy rewraps: both move where it rests. */
    const ro = new ResizeObserver(onResize);
    ro.observe(pin);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      cancelAnimationFrame(raf);
      pin.style.top = "";
    };
  }, [held]);

  return (
    <section id="approach" ref={trackRef} className="section approach" data-snap>
      <div ref={pinRef} className="approach-pin">
        <SectionBar label={data.label} />
        <div className="section-body approach-body">
          <RevealItem as="h2" className="section-heading" alone>
            {data.heading}
          </RevealItem>

          <div className="approach-timeline">
            <span className="approach-line" aria-hidden="true" />
            <RevealGroup as="ol" className="approach-steps">
              {data.steps.map((step, i) => (
                <RevealItem as="li" key={step.title} className="approach-step">
                  {/* This milestone's length of the rule. Before the circle in
                      the markup so the circle stays over it, as the rule is. */}
                  <span className="approach-bar" aria-hidden="true" ref={(el) => { barsRef.current[i] = el; }} />
                  <span className={i === 0 ? "approach-marker approach-marker--active" : "approach-marker"} aria-hidden="true">
                    {number(i)}
                  </span>
                  <h3 className="approach-step-title">{step.title}</h3>
                  <p className="approach-step-desc">{step.description}</p>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </div>
      </div>
      {/* The sequence's scroll length, and nothing else. A spacer, not
          padding on the section: a sticky box may only travel inside its
          parent's CONTENT box, which padding is not part of, so with
          padding here the block had nowhere to stick and simply scrolled
          away. It sits after the block, inside this section, so the length
          it adds is this section's own. */}
      {held && <div className="approach-run" aria-hidden="true" style={{ height: `${APPROACH.scrubVh * 100}vh` }} />}
    </section>
  );
}
