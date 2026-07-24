"use client";

import { useRef, useCallback } from "react";

/**
 * Detects two-finger pinch gestures and calls onPinchOut when
 * fingers close beyond a threshold (zoom out / go back).
 */
export function usePinchZoom(onPinchOut: () => void, threshold = 0.6) {
  const initialDist = useRef<number | null>(null);
  const tracking = useRef(false);

  const getDist = (touches: React.TouchList | TouchList): number => {
    const list = touches as unknown as TouchList;
    if (list.length < 2) return 0;
    const dx = list[0].clientX - list[1].clientX;
    const dy = list[0].clientY - list[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      initialDist.current = getDist(e.touches);
      tracking.current = true;
    }
  }, []);

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!tracking.current || initialDist.current === null) return;
      if (e.touches.length < 2) {
        tracking.current = false;
        initialDist.current = null;
        return;
      }
      const current = getDist(e.touches);
      const ratio = current / initialDist.current;
      if (ratio < threshold) {
        tracking.current = false;
        initialDist.current = null;
        onPinchOut();
      }
    },
    [onPinchOut, threshold]
  );

  const onTouchEnd = useCallback(() => {
    tracking.current = false;
    initialDist.current = null;
  }, []);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
