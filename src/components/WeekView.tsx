"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarEvent, getWeekDates, isToday, getEventsForDay,
} from "@/store/calendar";
import { buildSegments, computeTops, timeToY, getColor } from "@/lib/timeline";

const WEEKDAY_LABELS = ["LUN","MAR","MER","GIO","VEN","SAB","DOM"];
const AXIS_WIDTH = 28;

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

  // "now"-dependent state (current day/hour) is deferred to after mount so the
  // server-rendered (build-time) markup matches the client's first render —
  // otherwise the segment list length can differ and React throws a hydration error.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const mon = (d => { d.setDate(d.getDate() + (d.getDay()===0?-6:1-d.getDay())); return d; })(new Date(now));
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
    ? { enter:{opacity:0,scale:.95}, center:{opacity:1,scale:1}, exit:{opacity:0,scale:1.05} }
    : { enter:(d:number)=>({x:d>0?"-40%":"40%",opacity:0}), center:{x:0,opacity:1}, exit:(d:number)=>({x:d>0?"40%":"-40%",opacity:0}) };

  const swiped = useRef(false);
  const handlePanStart = () => { swiped.current = false; };
  const handlePan = (_: unknown, info: { offset: { x: number; y: number } }) => {
    if (swiped.current) return;
    if (Math.abs(info.offset.x) > 50 && Math.abs(info.offset.x) > Math.abs(info.offset.y) * 2) {
      swiped.current = true;
      if (info.offset.x < 0) onSwipeLeft(); else onSwipeRight();
    }
  };

  return (
    <motion.div custom={direction} variants={variants} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.2, ease: "easeOut" }} className="h-full flex flex-col overflow-hidden">
      <div className="flex px-4 pb-2 gap-1.5 shrink-0">
        <div style={{ width: AXIS_WIDTH }} className="shrink-0" />
        {dates.map((date, idx) => {
          const todayCheck = isToday(date) && isCurrentWeek;
          return (
            <button key={date.toISOString()} onClick={() => onTapDay(date)}
              style={{ flexGrow: colWeight(dayCounts[idx]), flexBasis: 0, minWidth: 40 }}
              className="flex flex-col items-center gap-1">
              <span className={`text-[11px] font-bold tracking-wider ${idx>=5?"text-[var(--color-text-tertiary)]/50":"text-[var(--color-text-tertiary)]"}`}>
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

      <motion.div onPanStart={handlePanStart} onPan={handlePan}
        className="flex-1 overflow-y-auto gpu-scroll px-4 touch-pan-y">
        <div className="flex gap-1.5 relative" style={{ height: totalHeight }}>
          <div style={{ width: AXIS_WIDTH }} className="shrink-0 relative">
            {segments.map((seg, i) => seg.type === "hour" && (
              <span key={`h${seg.hour}`} className="absolute right-1 text-[9px] text-[var(--color-text-tertiary)] leading-none"
                style={{ top: tops[i] - 5 }}>
                {String(seg.hour).padStart(2, "0")}
              </span>
            ))}
          </div>

          {dates.map((date, idx) => {
            const dayEvents = dayEventLists[idx];
            const todayCheck = isToday(date) && isCurrentWeek;
            const isWeekend = idx >= 5;
            const w = 100 / Math.max(1, dayEvents.length);
            return (
              <button key={date.toISOString()} onClick={() => onTapDay(date)}
                style={{ flexGrow: colWeight(dayCounts[idx]), flexBasis: 0, minWidth: 40 }}
                className={`relative rounded-2xl overflow-hidden transition-colors duration-300 ${
                  todayCheck ? "bg-[var(--color-today)] ring-1 ring-[var(--color-accent)]/30"
                  : isWeekend ? "bg-[var(--color-weekend)]" : "bg-transparent"}`}>
                {segments.map((seg, i) => seg.type === "hour" && (
                  <div key={`l${seg.hour}`} className="absolute left-0 right-0 border-t border-[var(--color-surface-tertiary)]/20"
                    style={{ top: tops[i] }} />
                ))}
                {dayEvents.map((ev, ei) => {
                  const s = new Date(ev.start_time), e = new Date(ev.end_time);
                  const startMin = s.getHours() * 60 + s.getMinutes();
                  const endMin = Math.max(startMin + 30, e.getHours() * 60 + e.getMinutes());
                  const top = timeToY(segments, tops, startMin);
                  const height = Math.max(6, timeToY(segments, tops, endMin) - top);
                  return (
                    <motion.div key={ev.id || ei}
                      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute rounded-md"
                      style={{ top, height, left: `calc(${w * ei}% + 1px)`, width: `calc(${w}% - 2px)`, background: getColor(ei) }}
                      onClick={(e) => { e.stopPropagation(); onTapEvent(ev); }} />
                  );
                })}
                {todayCheck && (
                  <div ref={nowRef} className="absolute left-0 right-0 h-px bg-[var(--color-danger)] z-10 pointer-events-none"
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
