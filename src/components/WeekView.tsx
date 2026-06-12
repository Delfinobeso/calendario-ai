"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarEvent, getWeekDates, isToday, getEventsForDay, formatTime,
} from "@/store/calendar";
import { buildSegments, computeTops, timeToY, getColor } from "@/lib/timeline";

const WEEKDAY_LABELS = ["LU", "MA", "ME", "GI", "VE", "SA", "DO"];
const AXIS_WIDTH = 32;

export default function WeekView({
  weekStart, events, direction,
  onTapDay, onTapEvent, onSwipeLeft, onSwipeRight,
}: {
  weekStart: Date; events: CalendarEvent[]; direction: number;
  onTapDay: (d: Date) => void; onTapEvent: (ev: CalendarEvent) => void;
  onSwipeLeft: () => void; onSwipeRight: () => void;
}) {
  const dates = getWeekDates(weekStart);
  const dayEventLists = dates.map((d) => getEventsForDay(events, d));
  const dayCounts = dayEventLists.map((evs) => evs.length);
  const colWeight = (n: number) => (n === 0 ? 1 : 1 + Math.min(n, 3));

  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const mon = (d => { d.setDate(d.getDate() + (d.getDay() === 0 ? -6 : 1 - d.getDay())); return d; })(new Date(now));
  const isCurrentWeek = mounted && weekStart.toDateString() === mon.toDateString();

  const weekEvents = dayEventLists.flat();
  const segments = buildSegments(weekEvents, isCurrentWeek ? now.getHours() : null);
  const { tops, totalHeight } = computeTops(segments);

  const nowRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isCurrentWeek) nowRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [isCurrentWeek]); // eslint-disable-line react-hooks/exhaustive-deps

  const isZoom = direction === 0;
  const variants = isZoom
    ? { enter: { opacity: 0, scale: 0.95 }, center: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.05 } }
    : { enter: (d: number) => ({ x: d > 0 ? "-40%" : "40%", opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (d: number) => ({ x: d > 0 ? "40%" : "-40%", opacity: 0 }) };

  const swiped = useRef(false);
  const handlePanStart = () => { swiped.current = false; };
  const handlePan = (_: unknown, info: { offset: { x: number; y: number } }) => {
    if (swiped.current) return;
    // Horizontal swipe must be dominant and past threshold
    if (Math.abs(info.offset.x) > 80 && Math.abs(info.offset.x) > Math.abs(info.offset.y) * 3) {
      swiped.current = true;
      info.offset.x < 0 ? onSwipeLeft() : onSwipeRight();
    }
  };

  return (
    <motion.div custom={direction} variants={variants} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.2, ease: "easeOut" }} className="h-full flex flex-col overflow-hidden">
      {/* Day headers */}
      <div className="flex px-4 pb-2 gap-1.5 shrink-0">
        <div style={{ width: AXIS_WIDTH }} className="shrink-0" />
        {dates.map((date, idx) => {
          const todayCheck = isToday(date) && isCurrentWeek;
          return (
            <button key={date.toISOString()} onClick={() => onTapDay(date)}
              style={{ flexGrow: colWeight(dayCounts[idx]), flexBasis: 0, minWidth: 40 }}
              className="flex flex-col items-center gap-1">
              <span className={`text-[11px] font-bold tracking-wider ${idx >= 5 ? "text-[var(--color-text-tertiary)]/50" : "text-[var(--color-text-tertiary)]"}`}>
                {WEEKDAY_LABELS[idx]}
              </span>
              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold transition-all ${
                todayCheck ? "bg-[var(--color-accent)] text-black today-pulse shadow-[0_0_12px_var(--color-accent)]" : "text-[var(--color-text-secondary)]"}`}>
                {date.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Time grid */}
      <motion.div onPanStart={handlePanStart} onPan={handlePan}
        className="flex-1 overflow-y-auto gpu-scroll px-4 touch-pan-y">
        <div className="flex gap-1.5 relative" style={{ height: totalHeight }}>
          {/* Hour axis */}
          <div style={{ width: AXIS_WIDTH }} className="shrink-0 relative">
            {segments.map((seg, i) => seg.type === "hour" && (
              <span key={`h${seg.hour}`} className="absolute right-1 text-[11px] text-[var(--color-text-tertiary)] font-medium tabular-nums leading-none"
                style={{ top: tops[i] + 2 }}>
                {seg.hour}
              </span>
            ))}
          </div>

          {/* Day columns */}
          {dates.map((date, idx) => {
            const dayEvents = dayEventLists[idx];
            const todayCheck = isToday(date) && isCurrentWeek;
            const isWeekend = idx >= 5;
            return (
              <button key={date.toISOString()} onClick={() => onTapDay(date)}
                style={{ flexGrow: colWeight(dayCounts[idx]), flexBasis: 0, minWidth: 40 }}
                className={`relative rounded-2xl overflow-hidden transition-colors duration-300 ${
                  todayCheck ? "bg-[var(--color-today)] ring-1 ring-[var(--color-accent)]/30"
                  : isWeekend ? "bg-[var(--color-weekend)]" : "bg-transparent"}`}>
                {/* Hour separator lines */}
                {segments.map((seg, i) => seg.type === "hour" && (
                  <div key={`l${seg.hour}`} className="absolute left-0 right-0 border-t border-[var(--color-surface-tertiary)]/20"
                    style={{ top: tops[i] }} />
                ))}
                {/* Event bars with text */}
                {dayEvents.map((ev, ei) => {
                  const s = new Date(ev.start_time), e = new Date(ev.end_time);
                  const startMin = s.getHours() * 60 + s.getMinutes();
                  const endMin = Math.max(startMin + 30, e.getHours() * 60 + e.getMinutes());
                  const top = timeToY(segments, tops, startMin);
                  const height = Math.max(28, timeToY(segments, tops, endMin) - top);
                  const c = getColor(ei);
                  return (
                    <motion.div key={ev.id || ei}
                      initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute left-0.5 right-0.5 rounded-lg px-1.5 py-0.5 cursor-pointer overflow-hidden"
                      style={{ top, height, background: c + "25", borderLeft: `2px solid ${c}` }}
                      onClick={(e) => { e.stopPropagation(); onTapEvent(ev); }}>
                      {height >= 40 && (
                        <>
                          <div className="text-[9px] font-bold leading-tight truncate" style={{ color: c }}>{ev.title}</div>
                          <div className="text-[8px] leading-tight mt-0.5 truncate" style={{ color: c, opacity: 0.7 }}>
                            {formatTime(ev.start_time)}
                          </div>
                        </>
                      )}
                    </motion.div>
                  );
                })}
                {/* Now line */}
                {todayCheck && (
                  <div ref={nowRef} className="absolute left-0 right-0 h-0.5 bg-[var(--color-danger)] z-10 pointer-events-none rounded-full"
                    style={{ top: timeToY(segments, tops, nowMinutes) }} />
                )}
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
