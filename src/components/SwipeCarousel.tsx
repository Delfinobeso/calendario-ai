"use client";

import { useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface SwipeCarouselProps {
  children: [React.ReactNode, React.ReactNode, React.ReactNode]; // [prev, current, next]
  onSwipeLeft: () => void;  // go to next
  onSwipeRight: () => void; // go to prev
  keyId: string;
}

export function SwipeCarousel({ children, onSwipeLeft, onSwipeRight, keyId }: SwipeCarouselProps) {
  const [offset, setOffset] = useState(0);
  const [animating, setAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useRef(0);
  const constrain = useRef(0);

  const onDragEnd = useCallback((_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const w = width.current || window.innerWidth;
    const threshold = w * 0.25;
    const absOffset = Math.abs(info.offset.x);
    const absVel = Math.abs(info.velocity.x);

    if (absOffset > threshold || absVel > 500) {
      const dir = info.offset.x > 0 ? 1 : -1;
      setAnimating(true);
      setOffset(dir * w);
      // After snap animation, shift window
      setTimeout(() => {
        if (dir === -1) onSwipeLeft();
        else onSwipeRight();
        setOffset(0);
        setAnimating(false);
      }, 250);
    } else {
      setAnimating(true);
      setOffset(0);
      setTimeout(() => setAnimating(false), 250);
    }
  }, [onSwipeLeft, onSwipeRight]);

  const onMeasure = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      width.current = node.offsetWidth;
      constrain.current = node.offsetWidth * 0.6;
    }
  }, []);

  return (
    <div ref={onMeasure} className="h-full overflow-hidden relative">
      <motion.div
        key={keyId}
        className="flex h-full"
        style={{ width: "300%" }}
        animate={{ x: `calc(-100% + ${offset}px)` }}
        transition={animating ? { type: "spring", stiffness: 300, damping: 35 } : { duration: 0 }}
        drag="x"
        dragConstraints={{ left: -constrain.current, right: constrain.current }}
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
