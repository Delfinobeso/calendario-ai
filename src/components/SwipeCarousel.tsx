"use client";

import { useRef, useLayoutEffect } from "react";
import { motion, useMotionValue, animate, type PanInfo } from "framer-motion";

interface SwipeCarouselProps {
  children: [React.ReactNode, React.ReactNode, React.ReactNode]; // [prev, current, next]
  onSwipeLeft: () => void;  // go to next
  onSwipeRight: () => void; // go to prev
  keyId: string;
}

export function SwipeCarousel({ children, onSwipeLeft, onSwipeRight, keyId }: SwipeCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useRef(typeof window !== "undefined" ? window.innerWidth : 0);
  const x = useMotionValue(-width.current);

  // Re-center on the current panel whenever the carousel content changes.
  useLayoutEffect(() => {
    const w = containerRef.current?.offsetWidth || window.innerWidth;
    width.current = w;
    x.set(-w);
  }, [keyId]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    const w = width.current || window.innerWidth;
    const threshold = w * 0.25;
    const delta = x.get() + w; // offset from resting position (current panel)

    let snapTo = -w;
    let callback: (() => void) | null = null;

    if (delta < -threshold || info.velocity.x < -500) {
      snapTo = -2 * w;
      callback = onSwipeLeft;
    } else if (delta > threshold || info.velocity.x > 500) {
      snapTo = 0;
      callback = onSwipeRight;
    }

    animate(x, snapTo, { type: "tween", duration: 0.2, ease: "easeOut" }).then(() => {
      callback?.();
    });
  };

  return (
    <div ref={containerRef} className="h-full overflow-hidden relative">
      <motion.div
        className="flex h-full"
        style={{ width: "300%", x }}
        drag="x"
        dragConstraints={containerRef}
        dragElastic={0.15}
        onDragEnd={onDragEnd}
        dragMomentum={false}
      >
        {/* Prev */}
        <div className="flex-1 h-full overflow-hidden">
          {children[0]}
        </div>
        {/* Current */}
        <div className="flex-1 h-full overflow-hidden">
          {children[1]}
        </div>
        {/* Next */}
        <div className="flex-1 h-full overflow-hidden">
          {children[2]}
        </div>
      </motion.div>
    </div>
  );
}
