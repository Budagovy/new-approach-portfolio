"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { RevealGroup, RevealItem } from "@/components/Reveal";
import { SectionBar, type SectionLabel } from "@/components/SectionBar";
import { SectionIntro } from "@/components/SectionIntro";
import { APPROACH } from "@/lib/motion";

export interface ApproachStep {
  title: string;
  description: string;
}

export interface ApproachData {
  label: SectionLabel;
  /** Two lines: the first in ink, the second in grey (SectionIntro). */
  heading: string[];
  intro: string;
  steps: ApproachStep[];
}

const number = (i: number) => String(i + 1).padStart(2, "0");
const clamp = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * "My approach", per the updated homepage frame: the section's opening (a
 * two-line headline and a sentence, left-aligned), then a thin timeline
 * across the whole frame with four evenly spaced numbered circles, the
 * first orange and the rest charcoal, and all four steps' titles and
 * descriptions shown together under them.
 *
 * The section is held in view while its milestones fill, one at a time
 * and in order. It is a plain sticky pin, scrubbed by the real scroll
 * position: the section is the track, the block inside it sticks, and the
 * extra scroll length the sequence needs is a spacer after it
 * (APPROACH.scrubVh), so it is scoped to this section and nothing else on
 * the page moves. Nothing is locked and nothing runs on a clock: the fill
 * is read from where the page is this frame, so it stops the instant the
 * reader stops and reverses exactly when they scroll back.
 *
 * Each milestone's fill is a length of the timeline's own rule, in the
 * accent, lying under the circles (the rule itself is untouched beneath
 * it). Progress p over the held length is shared out between them: bar i
 * runs from p = i/n to (i+1)/n, so the next one starts only once the one
 * before it is full, and the ones behind stay full. Each circle lights in
 * the accent as the bar before it completes — the first is lit at rest, as
 * it always was — so the sequence ends with all four of them lit and the
 * timeline filled end to end.
 *
 * The next section stays in view under the held block, as every section
 * shows the start of the next: it is passed in as `next` and held with
 * this one, directly beneath it, so while the milestones fill the reader
 * sees it waiting. When the hold lets go the pair scroll on together and
 * the section after the next follows at once, because a sticky box lets go
 * at the foot of its track, which is where the scroll length was. It is
 * the browser's own sticky positioning: every section is where the page
 * says it is at every moment, so anchors, find-in-page and keyboard focus
 * land true. The scroll length, the progress and the bars are the same as
 * without it.
 *
 * Where the block is taller than the screen (narrow phones, landscape) it
 * rests against the foot of the screen, less APPROACH.peek, so the fourth
 * milestone is on screen while it fills and the next section still shows
 * beneath it. Under reduced motion there is no hold at all: no added
 * scroll length, nothing held, and the milestones simply read as
 * complete.
 */
export function Approach({ data, next }: { data: ApproachData; next?: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLElement>(null);
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const markersRef = useRef<(HTMLSpanElement | null)[]>([]);
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
    const block = blockRef.current;
    if (!track || !pin || !block) return;
    const bars = barsRef.current.filter((b): b is HTMLSpanElement => !!b);
    const markers = markersRef.current;
    /* Four decimals is finer than a pixel of bar at any width, and it is
       the same number the circle above reads, so a circle and the bar that
       lights it can never disagree about when the milestone is complete. */
    const round = (v: number) => +clamp(v).toFixed(4);
    const fill = (i: number, v: number) => bars[i]?.style.setProperty("--p", String(v));
    /* A milestone's circle lights as the one before it finishes: the first
       is lit from the start, so by the end of the sequence all four are. */
    const light = (i: number, on: boolean) => markers[i]?.classList.toggle("approach-marker--active", on);
    if (!held) {
      bars.forEach((_, i) => { fill(i, 1); light(i, true); });
      return;
    }

    /* Measured, not read per frame: where the block comes to rest under the
       fixed header (or, if it and the next section's peek do not fit under
       it, against the foot of the screen less the peek), and how long the
       held sequence is — the spacer, which is in viewport heights and so
       changes with the window. */
    let top = 0;
    let run = 0;
    const measure = () => {
      const header = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
      top = Math.round(Math.min(header, window.innerHeight - block.offsetHeight - APPROACH.peek));
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
      const filled = bars.map((_, i) => round(p * bars.length - i));
      for (let i = 0; i < bars.length; i++) {
        fill(i, filled[i]);
        light(i, i === 0 || filled[i - 1] === 1);
      }
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
    /* The track: the held block, then the scroll length. The page's guided
       landing is on the track, so it is the start of the sequence (the
       block is a hold, and SmoothScroll takes a hold's content to rest
       where the hold lets go). */
    <div ref={trackRef} className="approach-track" data-snap>
      {/* The held block: this section, and the start of the next one riding
          directly under it (data-hold: see above). */}
      <div ref={pinRef} className="approach-pin" data-hold>
        <section id="approach" ref={blockRef} className="section approach">
          <SectionBar label={data.label} />
          <div className="section-body approach-body">
            <SectionIntro heading={data.heading} intro={data.intro} />

            <div className="approach-timeline">
              <span className="approach-line" aria-hidden="true" />
              <RevealGroup as="ol" className="approach-steps">
                {data.steps.map((step, i) => (
                  <RevealItem as="li" key={step.title} className="approach-step">
                    {/* This milestone's length of the rule. Before the circle in
                        the markup so the circle stays over it, as the rule is. */}
                    <span className="approach-bar" aria-hidden="true" ref={(el) => { barsRef.current[i] = el; }} />
                    <span
                      ref={(el) => { markersRef.current[i] = el; }}
                      className={i === 0 ? "approach-marker approach-marker--active" : "approach-marker"}
                      aria-hidden="true"
                    >
                      {number(i)}
                    </span>
                    <h3 className="approach-step-title">{step.title}</h3>
                    <p className="approach-step-desc">{step.description}</p>
                  </RevealItem>
                ))}
              </RevealGroup>
            </div>
          </div>
        </section>
        {next}
      </div>
      {/* The sequence's scroll length, and nothing else. A spacer, not
          padding on the track: a sticky box may only travel inside its
          parent's CONTENT box, which padding is not part of, so with
          padding here the block had nowhere to stick and simply scrolled
          away. It sits after the block, inside the track, so the length it
          adds is this sequence's own. */}
      {held && <div className="approach-run" aria-hidden="true" style={{ height: `${APPROACH.scrubVh * 100}vh` }} />}
    </div>
  );
}
