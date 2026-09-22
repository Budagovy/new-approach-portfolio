"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { GREETING } from "@/lib/motion";

export interface MonitorGreetingData {
  lead: string;
  emphasis: string;
  mark: string;
  cue?: string;
}

/**
 * The picture on the monitor before the reader scrolls: "Nice to meet
 * you." typed out one character at a time behind a thin cursor, then held
 * with the cursor blinking. Handed to SplashScreen's `screen` slot, which
 * lays it over the hero and dissolves it as the push begins.
 *
 * The count of typed characters starts at 0 on both server and client
 * (nothing time-based reaches the first render) and advances in an
 * effect. Under reduced motion the line is simply there.
 */
export function MonitorGreeting({ data }: { data: MonitorGreetingData }) {
  const reduce = useReducedMotion();
  const full = data.lead + data.emphasis + data.mark;
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    if (reduce) {
      setTyped(full.length);
      return;
    }
    let n = 0;
    let timer = window.setTimeout(function tick() {
      n += 1;
      setTyped(n);
      if (n < full.length) timer = window.setTimeout(tick, GREETING.perChar);
    }, GREETING.delay);
    return () => window.clearTimeout(timer);
  }, [reduce, full.length]);

  /* Each part shows only the characters typed so far. */
  const slice = (text: string, from: number) => text.slice(0, Math.max(0, Math.min(text.length, typed - from)));
  const leadEnd = data.lead.length;
  const emphasisEnd = leadEnd + data.emphasis.length;

  return (
    <div className="greeting">
      <p className="greeting-line" aria-label={full}>
        <span aria-hidden="true">
          {slice(data.lead, 0)}
          <strong className="greeting-emphasis">{slice(data.emphasis, leadEnd)}</strong>
          <span className="greeting-mark">{slice(data.mark, emphasisEnd)}</span>
          <span className={typed < full.length ? "greeting-cursor greeting-cursor--typing" : "greeting-cursor"} />
        </span>
      </p>
    </div>
  );
}
