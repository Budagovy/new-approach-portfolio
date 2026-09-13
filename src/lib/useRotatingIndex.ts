"use client";

import { useEffect, useState } from "react";

/**
 * Cycles through `count` items, derived from wall-clock time rather than
 * this instance's own mount time. The hero is rendered twice at once (full
 * size, and shrunk into the monitor preview); two independent per-instance
 * timers can start a render tick apart and drift further from there, so the
 * two copies can land on a different phrase at the same moment. Deriving the
 * index from `Date.now()` instead means every instance agrees on the current
 * index by construction, with no timer to drift.
 *
 * Starts at 0 rather than the time-derived value: the server renders at a
 * different wall-clock moment than the client hydrates, so computing the
 * real index during render disagrees between them whenever that gap crosses
 * a word boundary, which React reports as a hydration mismatch and can
 * paint incorrectly. 0 is deterministic on both sides; the effect corrects
 * it to the real index immediately after mount, client-only.
 */
export function useRotatingIndex(count: number, holdMs: number) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const getIndex = () => Math.floor(Date.now() / holdMs) % count;
    setIndex(getIndex());
    const id = setInterval(() => setIndex(getIndex()), 150);
    return () => clearInterval(id);
  }, [count, holdMs]);

  return index;
}
