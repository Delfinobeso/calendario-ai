"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarEvent, getWeekDates, isToday, getEventsForDay, formatTime,
} from "@/store/calendar";
import { getColor } from "@/lib/timeline";

const WEEKDAY_LABELS = ["LU", "MA", "ME", "GI", "VE", "SA", "DO"];
const ROW_H = 22; // px per ora — 24×22=528px, fits iPhone senza scroll
const AXIS_W = 24;

export default function WeekView({
  weekStart, events, direction,
  onTapDay, onTapEvent, onSwipeLeft, onSwipeRight,
}: {
  weekStart: Date; events: CalendarEvent[]; direction: number;
  onTapDay: (d: Date) => void; onTapEvent: (ev: CalendarEvent) => void;
  onSwipeLeft: () => void; onSwipeRight: () => void;
}) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayStr = now.toDateString();

  const dates = getWeekDates(weekStart);
  const dayEventLists = dates.map((d) => getEventsForDay(events, d));

  // ── Horizontal weights ──
  // Past days & empty days → compressed. Days with events → proportional width.
  const weights = dates.map((d, i) => {
    const n = dayEventLists[i].length;
    const past = d.toDateString() < todayStr && !isToday(d);
    if (past || n === 0) return i >= 5 ? 0.4 : 0.5;
    if (n === 1) return i >= 5 ? 1.0 : 1.2;
    if (n === 2) return i >= 5 ? 1.3 : 1.6;
    return i >= 5 ? 1.6 : 2.0;
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const mon = (d => { d.setDate(d.getDate() + (d.getDay() === 0 ? -6 : 1 - d.getDay())); return d; })(new Date(now));
  const isCurrentWeek = mounted && weekStart.toDateString() === mon.toDateString();

  const isZoom = direction === 0;
  const variants = isZoom
    ? { enter: { opacity: 0, scale: 0.95 }, center: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.05 } }
    : { enter: (d: number) => ({ x: d > 0 ? "-40%" : "40%", opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (d: number) => ({ x: d > 0 ? "40%" : "-40%", opacity: 0 }) };

  const TOTAL_H = 24 * ROW_H;
  const toY = (min: number) => (min / 60) * ROW_H;
  const toH = (min: number) => Math.max(ROW_H - 1, (min / 60) * ROW_H);

  // Swipe detection
  const handleTouch = useRef<{ x: number }>({ x: 0 });
  const onTouchStart = (e: React.TouchEvent) => { handleTouch.current.x = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - handleTouch.current.x;
    if (Math.abs(dx) > 60) dx < 0 ? onSwipeLeft() : onSwipeRight();
  };

  return (
    <motion.div custom={direction} variants={variants} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.2, ease: "easeOut" }}
      onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      className="h-full flex flex-col overflow-hidden">
      {/* ── Day headers ── */}
      <div className="flex px-2 gap-0.5 shrink-0" style={{ paddingLeft: AXIS_W + 4 }}>
        {dates.map((date, idx) => {
          const todayCheck = isToday(date) && isCurrentWeek;
          return (
            <button key={date.toISOString()} onClick={() => onTapDay(date)}
              style={{ flexGrow: weights[idx], flexBasis: 0, minWidth: 24 }}
              className="flex flex-col items-center gap-0.5 py-0.5">
              <span className={`text-[9px] font-bold tracking-wider ${idx >= 5 ? "text-[var(--color-text-tertiary)]/40" : "text-[var(--color-text-tertiary)]"}`}>
                {WEEKDAY_LABELS[idx]}
              </span>
              <span className={`inline-flex items-center justify-center w-5.5 h-5.5 rounded-full text-[10px] font-bold transition-all ${
                todayCheck ? "bg-[var(--color-accent)] text-black today-pulse shadow-[0_0_8px_var(--color-accent)]" : "text-[var(--color-text-secondary)]"}`}>
                {date.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Timeline (no scroll) ── */}
      <div className="flex-1 min-h-0 flex px-2 gap-0.5" style={{ paddingLeft: AXIS_W + 4 }}>
        {/* Hour axis */}
        <div className="absolute left-2 top-0 bottom-0 flex flex-col pointer-events-none"
          style={{ width: AXIS_W, paddingTop: 32 /* header offset */ }}>
          {Array.from({ length: 24 }, (_, hr) => hr % 3 === 0 && (
            <span key={`h${hr}`}
              className="text-[9px] text-[var(--color-text-tertiary)] tabular-nums font-medium leading-none"
              style={{ height: ROW_H * (hr === 0 ? 1 : 3), display: "flex", alignItems: hr === 0 ? "flex-end" : "center", paddingBottom: hr === 0 ? 1 : 0 }}>
              {hr}
            </span>
          ))}
        </div>

        {/* Day columns */}
        {dates.map((date, idx) => {
          const dayEvents = dayEventLists[idx];
          const todayCheck = isToday(date) && isCurrentWeek;
          const isWeekend = idx >= 5;
          const isPast = date.toDateString() < todayStr && !isToday(date);
          return (
            <div key={date.toISOString()}
              style={{ flexGrow: weights[idx], flexBasis: 0, minWidth: 24 }}
              className="relative h-full">
              <button onClick={() => { if (!isPast) onTapDay(date); }}
                className={`absolute inset-0 rounded-lg overflow-hidden transition-colors ${
                  todayCheck ? "bg-[var(--color-today)] ring-1 ring-[var(--color-accent)]/30 z-10"
                  : isPast ? "opacity-15"
                  : isWeekend ? "bg-[var(--color-weekend)]"
                  : "bg-transparent"}`}>
                {/* Hour lines */}
                {Array.from({ length: 24 }, (_, hr) => (
                  <div key={`gl${hr}`}
                    className="absolute left-0 right-0 border-t border-[var(--color-surface-tertiary)]/12 pointer-events-none"
                    style={{ top: hr * ROW_H }} />
                ))}
                {/* Events */}
                {dayEvents.map((ev, ei) => {
                  const s = new Date(ev.start_time), e = new Date(ev.end_time);
                  const sm = s.getHours() * 60 + s.getMinutes();
                  const em = Math.max(sm + 30, e.getHours() * 60 + e.getMinutes());
                  const top = toY(sm);
                  const height = toH(em - sm);
                  const c = getColor(ei);
                  return (
                    <motion.div key={ev.id || ei}
                      initial={{ opacity: 0, scaleX: 0.9 }} animate={{ opacity: 1, scaleX: 1 }}
                      transition={{ duration: 0.15, ease: "easeOut" }}
                      className="absolute left-0.5 right-0.5 rounded-sm px-0.5 cursor-pointer overflow-hidden flex flex-col justify-center"
                      style={{ top, height, background: c + "35", borderLeft: `2px solid ${c}` }}
                      onClick={(e) => { e.stopPropagation(); onTapEvent(ev); }}>
                      <div className="text-[7px] font-bold leading-tight truncate" style={{ color: c }}>{ev.title}</div>
                      {height >= ROW_H * 2.5 && (
                        <div className="text-[6px] leading-tight truncate mt-px" style={{ color: c, opacity: 0.7 }}>
                          {formatTime(ev.start_time)}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
                {/* Now line */}
                {todayCheck && (
                  <div className="absolute left-0 right-0 h-0.5 bg-[var(--color-danger)] z-20 pointer-events-none rounded-full shadow-[0_0_4px_var(--color-danger)]"
                    style={{ top: toY(nowMinutes) }} />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
