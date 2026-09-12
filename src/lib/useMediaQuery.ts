"use client";

import { useEffect, useState } from "react";

/**
 * SSR-safe media query. Starts false so the server and the first client render
 * agree, then corrects on mount. Callers must treat false as "not yet known"
 * and pick the layout that is safe in both states.
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const on = () => setMatches(mql.matches);
    on();
    mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, [query]);

  return matches;
}
