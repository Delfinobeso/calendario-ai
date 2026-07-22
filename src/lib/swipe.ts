"use client";

import { useRef, useState, useCallback } from "react";

/**
 * Swipe orizzontale nativo (spec §12 rollout: niente librerie nuove dopo la
 * rimozione di framer-motion). translateX in tempo reale durante il drag,
 * poi snap-back o trigger callback in base a una soglia. Nessuna dipendenza:
 * solo React state + touch handlers.
 */
export function useHorizontalSwipe(onSwipeLeft: () => void, onSwipeRight: () => void, threshold = 60) {
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const locked = useRef<"x" | "y" | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    locked.current = null;
    setDragging(true);
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    if (locked.current === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      locked.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    }
    if (locked.current === "x") {
      setDragX(dx);
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    setDragging(false);
    if (locked.current === "x") {
      if (dragX <= -threshold) onSwipeLeft();
      else if (dragX >= threshold) onSwipeRight();
    }
    setDragX(0);
    locked.current = null;
  }, [dragX, threshold, onSwipeLeft, onSwipeRight]);

  return {
    dragX,
    dragging,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
