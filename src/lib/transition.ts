"use client";

import { useEffect, useState } from "react";

/**
 * Mount/unmount timing for CSS-only enter/exit transitions (framer-motion
 * removed project-wide — see /DATA/calendario-ai/CLAUDE_HANDOFF.md for the
 * hydration crash that motivated it). `mounted` keeps the node in the DOM
 * while the exit transition plays; `entered` flips true one frame after
 * mount so a CSS transition on transform/opacity actually animates instead
 * of starting already in its end state.
 */
export function useMountTransition(active: boolean, exitDuration = 260) {
  const [mounted, setMounted] = useState(active);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    let raf = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (active) {
      setMounted(true);
      raf = requestAnimationFrame(() => setEntered(true));
    } else {
      setEntered(false);
      timeout = setTimeout(() => setMounted(false), exitDuration);
    }
    return () => {
      cancelAnimationFrame(raf);
      if (timeout) clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return { mounted, entered };
}
