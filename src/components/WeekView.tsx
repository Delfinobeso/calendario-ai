"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarEvent, getWeekDates, isToday, getEventsForDay, formatTime,
} from "@/store/calendar";
import { getColor } from "@/lib/timeline";

const WEEKDAY_LABELS = ["LU", "MA", "ME", "GI", "VE", "SA", "DO"];
const ROW_H = 24; // px per ora

// L'app non viene mai smontata: una volta superata l'hydration sul client,
// resta vera anche quando SwipeCarousel rimonta WeekView ad ogni swipe.
let clientHydrated = false;

export default function WeekView({
  weekStart, events,
  onTapDay, onTapEvent,
}: {
  weekStart: Date; events: CalendarEvent[];
  onTapDay: (d: Date) => void; onTapEvent: (ev: CalendarEvent) => void;
}) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayStr = now.toDateString();

  const dates = getWeekDates(weekStart);
  const dayEventLists = dates.map((d) => getEventsForDay(events, d));

  // ── Horizontal weights ──
  const weights = dates.map((d, i) => {
    const n = dayEventLists[i].length;
    const past = d.toDateString() < todayStr && !isToday(d);
    if (past || n === 0) return i >= 5 ? 0.7 : 0.75;
    if (n === 1) return i >= 5 ? 0.95 : 1.05;
    if (n === 2) return i >= 5 ? 1.1 : 1.2;
    return i >= 5 ? 1.25 : 1.4;
  });

  const [mounted, setMounted] = useState(clientHydrated);
  useEffect(() => { clientHydrated = true; setMounted(true); }, []);

  const mon = (d => { d.setDate(d.getDate() + (d.getDay() === 0 ? -6 : 1 - d.getDay())); return d; })(new Date(now));
  const isCurrentWeek = mounted && weekStart.toDateString() === mon.toDateString();

  const TOTAL_H = 24 * ROW_H;
  const toY = (min: number) => (min / 60) * ROW_H;

  // Scroll alle prime ore del pomeriggio: i 24h non entrano nel contenitore.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: Math.max(0, toY(nowMinutes) - 100), behavior: "auto" });
  }, []); // eslint-disable-line

  return (
    <div className="h-full flex flex-col">
      {/* ── Day headers ── */}
      <div className="flex px-3 gap-1 shrink-0 pb-1">
        <div className="w-5 shrink-0" />
        {dates.map((date, idx) => {
          const todayCheck = isToday(date) && isCurrentWeek;
          return (
            <button key={date.toISOString()} onClick={() => onTapDay(date)}
              style={{ flexGrow: weights[idx], flexBasis: 0, minWidth: 22 }}
              className="flex flex-col items-center py-1 rounded-xl active:bg-[var(--color-surface-secondary)] transition-colors">
              <span className={`text-[10px] font-bold tracking-wider ${idx >= 5 ? "text-[var(--color-text-tertiary)]/40" : "text-[var(--color-text-tertiary)]"}`}>
                {WEEKDAY_LABELS[idx]}
              </span>
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold transition-all mt-0.5 ${
                todayCheck ? "bg-[var(--color-accent)] text-black today-pulse shadow-[0_0_10px_var(--color-accent)]" : "text-[var(--color-text-secondary)]"}`}>
                {date.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Timeline grid ── */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto gpu-scroll touch-pan-y">
      <div className="flex px-3 gap-1 relative" style={{ height: TOTAL_H }}>
        {/* Hour labels */}
        <div className="relative w-5 shrink-0 pointer-events-none">
          {Array.from({ length: 9 }, (_, i) => {
            const hr = i * 3;
            return (
              <span key={hr}
                className="absolute right-0.5 text-[9px] text-[var(--color-text-tertiary)]/60 tabular-nums font-medium leading-none"
                style={{ top: hr * ROW_H - 4 }}>
                {hr}
              </span>
            );
          })}
        </div>

        {/* Day columns */}
        {dates.map((date, idx) => {
          const dayEvents = dayEventLists[idx];
          const todayCheck = isToday(date) && isCurrentWeek;
          const isWeekend = idx >= 5;
          const isPast = date.toDateString() < todayStr && !isToday(date);
          return (
            <div key={date.toISOString()}
              style={{ flexGrow: weights[idx], flexBasis: 0, minWidth: 22 }}
              className="relative">
              <button onClick={() => { if (!isPast) onTapDay(date); }}
                className={`absolute inset-0 rounded-lg overflow-hidden transition-colors ${
                  todayCheck ? "bg-[var(--color-today)] ring-1 ring-[var(--color-accent)]/20 z-10"
                  : isPast ? "opacity-15"
                  : isWeekend ? "bg-[var(--color-weekend)]"
                  : "bg-transparent"}`}
                style={{ left: 2, right: 2 }}>
                {/* Hour grid lines (subtle) */}
                {Array.from({ length: 24 }, (_, hr) => (
                  <div key={`g${hr}`}
                    className="absolute left-0 right-0 border-t pointer-events-none"
                    style={{
                      top: hr * ROW_H,
                      borderColor: hr === 0 ? "var(--color-surface-tertiary)" : "var(--color-surface-tertiary)",
                      borderWidth: hr === 0 ? 1 : hr % 6 === 0 ? 0.5 : 0,
                      opacity: hr === 0 ? 0.08 : hr % 6 === 0 ? 0.06 : 0,
                    }} />
                ))}
                {/* Events */}
                {dayEvents.map((ev, ei) => {
                  const s = new Date(ev.start_time), e = new Date(ev.end_time);
                  const sm = s.getHours() * 60 + s.getMinutes();
                  const em = Math.max(sm + 30, e.getHours() * 60 + e.getMinutes());
                  const top = toY(sm);
                  const height = Math.max(ROW_H - 1, toY(em - sm));
                  const c = getColor(ei);
                  return (
                    <motion.div key={ev.id || ei}
                      initial={false} animate={{ opacity: 1, scaleX: 1 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0.5 right-0.5 rounded-md px-1 py-0.5 cursor-pointer overflow-hidden flex items-center"
                      style={{ top, height, background: c + "25", borderLeft: `2px solid ${c}` }}
                      onClick={(e) => { e.stopPropagation(); onTapEvent(ev); }}>
                      <div className="text-[8px] font-bold leading-tight tabular-nums whitespace-nowrap" style={{ color: c }}>
                        {formatTime(ev.start_time)}
                      </div>
                    </motion.div>
                  );
                })}
                {/* Now line */}
                {todayCheck && (
                  <div className="absolute left-0 right-0 h-0.5 bg-[var(--color-danger)] z-20 pointer-events-none rounded-full shadow-[0_0_6px_var(--color-danger)]"
                    style={{ top: toY(nowMinutes) - 0.5 }} />
                )}
              </button>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
