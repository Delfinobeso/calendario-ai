"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CalendarEvent,
  getEventsForDay,
  formatTime,
} from "@/store/calendar";
import { buildSegments, computeTops, timeToY, getColor } from "@/lib/timeline";

export default function DayView({
  date, events, direction,
  onTapEvent, onSwipeLeft, onSwipeRight,
}: {
  date: Date; events: CalendarEvent[]; direction: number;
  onTapEvent: (ev: CalendarEvent) => void;
  onSwipeLeft: () => void; onSwipeRight: () => void;
}) {
  const dayEvents = getEventsForDay(events, date)
    .slice()
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const segments = buildSegments(dayEvents, isToday ? now.getHours() : null);
  const { tops, totalHeight } = computeTops(segments);

  const isZoom = direction === 0;
  const variants = isZoom
    ? { enter: { opacity: 0, scale: 0.95 }, center: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.05 } }
    : { enter: (d: number) => ({ x: d > 0 ? "-40%" : "40%", opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (d: number) => ({ x: d > 0 ? "40%" : "-40%", opacity: 0 }) };

  // Swipe detection (horizontal only, high threshold to avoid scroll conflicts)
  const swiped = useRef(false);
  const handlePanStart = () => { swiped.current = false; };
  const handlePan = (_: unknown, info: { offset: { x: number; y: number } }) => {
    if (swiped.current) return;
    if (Math.abs(info.offset.x) > 80 && Math.abs(info.offset.x) > Math.abs(info.offset.y) * 3) {
      swiped.current = true;
      info.offset.x < 0 ? onSwipeLeft() : onSwipeRight();
    }
  };

  // Auto-scroll to first event (any count) — Apple Calendar behavior
  const scrollRef = useRef<HTMLDivElement>(null);
  const firstEventRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (dayEvents.length > 0 && scrollRef.current && firstEventRef.current) {
      // Scroll to 80px above first event so it's not flush with the top
      const container = scrollRef.current;
      const el = firstEventRef.current;
      container.scrollTo({ top: el.offsetTop - 80, behavior: "auto" });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div custom={direction} variants={variants} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="h-full flex flex-col overflow-hidden">
      {/* Date header */}
      <div className="text-center py-4 shrink-0">
        <p className="text-[15px] font-semibold text-[var(--color-text-secondary)] capitalize">
          {date.toLocaleDateString("it", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        {isToday && <p className="text-[11px] text-[var(--color-accent)] mt-0.5 font-medium">Oggi</p>}
      </div>

      <div ref={scrollRef}
        className="flex-1 overflow-y-auto gpu-scroll relative px-3 touch-pan-y">
        {/* Empty state — Things 3 style */}
        {dayEvents.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 pointer-events-none">
            <span className="text-3xl mb-2 opacity-40">🗓️</span>
            <p className="text-[14px] text-[var(--color-text-secondary)] font-medium">Nessun evento in programma</p>
            <p className="text-[11px] text-[var(--color-text-tertiary)] mt-1">Usa il pulsante + per aggiungerne uno</p>
          </div>
        )}

        <motion.div onPanStart={handlePanStart} onPan={handlePan}
          className="relative" style={{ height: totalHeight }}>
          {/* Hour markers */}
          {segments.map((seg, i) =>
            seg.type === "hour" ? (
              <div key={`h${seg.hour}`} className="absolute left-0 right-0 flex items-start" style={{ top: tops[i], height: seg.height }}>
                <span className="text-[11px] text-[var(--color-text-tertiary)] w-8 text-right pr-2 leading-none mt-0 font-medium tabular-nums">{seg.hour}</span>
                <div className="flex-1 border-t border-[var(--color-surface-tertiary)]/30" />
              </div>
            ) : (
              <div key={`g${seg.hours[0]}`} className="absolute left-0 right-0 flex items-center px-2 gap-2" style={{ top: tops[i], height: seg.height }}>
                {seg.hours.length < 24 && (
                  <>
                    <div className="flex-1 h-px bg-[var(--color-surface-tertiary)]/25" />
                    <span className="text-[9px] text-[var(--color-text-tertiary)]/70 font-semibold tabular-nums shrink-0">
                      {seg.hours[0]}–{seg.hours[seg.hours.length - 1] + 1}
                    </span>
                    <div className="flex-1 h-px bg-[var(--color-surface-tertiary)]/25" />
                  </>
                )}
              </div>
            )
          )}

          {/* Event cards */}
          {dayEvents.map((ev, ei) => {
            const s = new Date(ev.start_time), e = new Date(ev.end_time);
            const startMin = s.getHours() * 60 + s.getMinutes();
            const endMin = Math.max(startMin + 30, e.getHours() * 60 + e.getMinutes());
            const top = timeToY(segments, tops, startMin);
            const height = Math.max(36, timeToY(segments, tops, endMin) - top);
            const c = getColor(ei);
            return (
              <motion.div key={ev.id || ei} ref={ei === 0 ? firstEventRef : undefined}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2, ease: "easeOut" }} whileTap={{ scale: 0.98 }}
                className="absolute left-12 right-1.5 rounded-xl px-3 py-2 cursor-pointer overflow-hidden touch-target"
                style={{ top, height, background: c + "18", borderLeft: `3px solid ${c}`, color: c }}
                onClick={() => onTapEvent(ev)}>
                <div className="text-[12px] font-semibold leading-tight truncate">{ev.title}</div>
                <div className="text-[11px] opacity-70 leading-tight mt-0.5">
                  {formatTime(ev.start_time)} – {formatTime(ev.end_time)}
                </div>
                {ev.location && (
                  <div className="text-[11px] opacity-50 leading-tight truncate mt-0.5">📍 {ev.location}</div>
                )}
              </motion.div>
            );
          })}

          {/* Now line */}
          {isToday && nowMinutes >= 0 && nowMinutes < 24 * 60 && (
            <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: timeToY(segments, tops, nowMinutes) }}>
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-danger)] -ml-1.5 shadow-[0_0_6px_var(--color-danger)]" />
                <div className="flex-1 h-0.5 bg-[var(--color-danger)] rounded-full" />
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
}
