"use client";

import { useMountTransition } from "@/lib/transition";

// Bottom sheet livello 2 (§8.4/§8.5.1 modo 2), timing esatti §5: 420ms in
// orbit / 260ms out snap. Sostituisce AnimatePresence+framer-motion (rimosso
// project-wide, vedi CLAUDE_HANDOFF.md) con un mount/unmount CSS puro.
export default function Sheet({
  open, onClose, children, labelledBy, maxHeightRatio = 0.9,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  labelledBy?: string;
  maxHeightRatio?: number;
}) {
  const { mounted, entered } = useMountTransition(open, 260);
  if (!mounted) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 sheet-backdrop-blur"
        style={{
          background: "oklch(0% 0 0 / 0.5)",
          opacity: entered ? 1 : 0,
          transition: `opacity ${entered ? "var(--dur-sheet-in)" : "var(--dur-sheet-out)"} ${entered ? "var(--ease-orbit)" : "var(--ease-snap)"}`,
        }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-[var(--r-lg)] px-6 pt-6 pb-safe overflow-y-auto glass-2"
        style={{
          maxHeight: `calc(var(--app-vh) * ${maxHeightRatio})`,
          transform: entered ? "translateY(0)" : "translateY(100%)",
          transition: `transform ${entered ? "var(--dur-sheet-in)" : "var(--dur-sheet-out)"} ${entered ? "var(--ease-orbit)" : "var(--ease-snap)"}`,
        }}
      >
        <div className="w-9 h-[5px] rounded-full mx-auto mb-6" style={{ background: "var(--text-3)", opacity: 0.4 }} />
        {children}
      </div>
    </>
  );
}
