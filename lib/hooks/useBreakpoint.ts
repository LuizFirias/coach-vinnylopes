"use client";

import { useEffect, useState } from "react";

const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
} as const;

export type BreakpointName = keyof typeof BREAKPOINTS;

/**
 * Retorna true quando a largura da viewport é menor que o breakpoint.
 * mobile → < 768px | tablet → < 1024px
 */
export function useBreakpoint(bp: BreakpointName): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const maxWidth = BREAKPOINTS[bp] - 1;
    const mql = window.matchMedia(`(max-width: ${maxWidth}px)`);

    const update = () => setMatches(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [bp]);

  return matches;
}
