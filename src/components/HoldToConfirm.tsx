"use client";

import { useRef, useState } from "react";

const DURATION = 700; // ms — spec §11.2
const R = 9;
const CIRC = 2 * Math.PI * R;

// Hold-to-confirm radiale (§11.2): pressione ~700ms con anello --flare-hi che si
// riempie in tempo reale (stesso SVG ring §7); rilascio anticipato "scarica"
// l'anello indietro (300ms --ease-snap); completamento → vibrazione + azione.
// È IL pattern per le azioni irreversibili — sostituisce il doppio-tap di
// conferma su EventSheet/DetailSheet. Adattato da
// /DATA/streamtv/src/components/HoldToConfirm.tsx (Kino, riferimento congelato).
export default function HoldToConfirm({
  label, doneLabel, onConfirm,
}: {
  label: string;
  doneLabel: string;
  onConfirm: () => void;
}) {
  const [pct, setPct] = useState(0);
  const [done, setDone] = useState(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef(0);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const tick = (ts: number) => {
    if (!startRef.current) startRef.current = ts;
    const p = Math.min(1, (ts - startRef.current) / DURATION);
    setPct(p);
    if (p >= 1) {
      stop();
      setDone(true);
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(20);
      onConfirm();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const onDown = () => {
    if (done) return;
    startRef.current = 0;
    stop();
    rafRef.current = requestAnimationFrame(tick);
  };
  const onUp = () => {
    stop();
    if (!done) setPct(0); // "scarica" — la transizione CSS sotto la anima a 0 in 300ms
  };

  return (
    <button
      type="button"
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onContextMenu={(e) => e.preventDefault()}
      disabled={done}
      className="relative flex touch-target w-full items-center justify-center gap-2 overflow-hidden rounded-[var(--r-md)] border bg-transparent py-4 text-[16px] font-bold active:scale-[0.98] disabled:opacity-70"
      style={{
        borderColor: "var(--alert)",
        color: "var(--alert)",
        touchAction: "none",
        transitionProperty: "transform",
        transitionDuration: "var(--dur-fast)",
        transitionTimingFunction: "var(--ease-snap)",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0 -rotate-90">
        <circle cx="12" cy="12" r={R} fill="none" stroke="var(--flare-dim)" strokeWidth="2.5" />
        <circle
          cx="12"
          cy="12"
          r={R}
          fill="none"
          stroke="var(--flare-hi)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - pct)}
          style={{ transition: pct === 0 ? "stroke-dashoffset 300ms var(--ease-snap)" : "none" }}
        />
      </svg>
      {done ? doneLabel : label}
    </button>
  );
}
