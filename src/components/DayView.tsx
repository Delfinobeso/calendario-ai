"use client";

import { motion, PanInfo } from "framer-motion";
import {
  CalendarEvent,
  getEventsForDay,
  formatTime,
} from "@/store/calendar";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function eventTop(ev: CalendarEvent): number {
  return new Date(ev.start_time).getHours() * 60 + new Date(ev.start_time).getMinutes();
}
function eventHeight(ev: CalendarEvent): number {
  const ms = new Date(ev.end_time).getTime() - new Date(ev.start_time).getTime();
  return Math.max(30, ms / (1000 * 60));
}

const COLORS = ["#c9a820", "#e04080", "#20c0a0", "#6c5ce7", "#e17055"];
function getColor(idx: number) { return COLORS[idx % COLORS.length]; }

export default function DayView({
  date, events, direction,
  onTapEvent, onSwipeLeft, onSwipeRight,
}: {
  date: Date; events: CalendarEvent[]; direction: number;
  onTapEvent: (id: number) => void;
  onSwipeLeft: () => void; onSwipeRight: () => void;
}) {
  const dayEvents = getEventsForDay(events, date);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // direction=0 → scale (zoom), else → slide
  const isZoom = direction === 0;
  const variants = isZoom
    ? { enter: { opacity: 0, scale: 0.95 }, center: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.05 } }
    : { enter: (d: number) => ({ x: d > 0 ? "40%" : "-40%", opacity: 0 }), center: { x: 0, opacity: 1 }, exit: (d: number) => ({ x: d > 0 ? "-40%" : "40%", opacity: 0 }) };

  const handlePanEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 50 && Math.abs(info.offset.x) > Math.abs(info.offset.y) * 2) {
      info.offset.x < 0 ? onSwipeLeft() : onSwipeRight();
    }
  };

  return (
    <motion.div custom={direction} variants={variants} initial="enter" animate="center" exit="exit"
      transition={{ type: "tween", duration: 0.2, ease: "easeOut" }}
      className="h-full flex flex-col overflow-hidden">
      <div className="text-center py-3 shrink-0">
        <p className="text-sm font-semibold text-[var(--color-text-secondary)] capitalize">
          {date.toLocaleDateString("it", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        {isToday && <p className="text-[11px] text-[var(--color-accent)] mt-0.5 font-medium">Oggi</p>}
      </div>

      <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.1} onPanEnd={handlePanEnd}
        className="flex-1 overflow-y-auto relative px-2 touch-pan-y">
        <div className="relative" style={{ height: 24 * 60 + "px" }}>
          {HOURS.map((h) => (
            <div key={h} className="absolute left-0 right-0 flex items-start" style={{ top: h * 60, height: 60 }}>
              <span className="text-[10px] text-[var(--color-text-tertiary)] w-8 text-right pr-2 leading-none mt-0">{String(h).padStart(2,"0")}</span>
              <div className="flex-1 border-t border-[var(--color-surface-tertiary)]/30" />
            </div>
          ))}
          {dayEvents.map((ev, ei) => {
            const top = eventTop(ev), h = eventHeight(ev), c = getColor(ei);
            return (
              <motion.div key={ev.id || ei} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} whileTap={{ scale: 0.98 }}
                className="absolute left-10 right-1 rounded-xl px-2.5 py-1.5 cursor-pointer overflow-hidden"
                style={{ top, height: h, background: c + "20", borderLeft: `3px solid ${c}`, color: c }}
                onClick={() => ev.id != null && onTapEvent(ev.id)}>
                <div className="text-[11px] font-semibold leading-tight truncate">{ev.title}</div>
                <div className="text-[10px] opacity-70 leading-tight">{formatTime(ev.start_time)} – {formatTime(ev.end_time)}</div>
                {ev.location && <div className="text-[10px] opacity-50 leading-tight truncate mt-0.5">📍 {ev.location}</div>}
              </motion.div>
            );
          })}
          {isToday && nowMinutes >= 0 && nowMinutes < 24 * 60 && (
            <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: (nowMinutes / (24 * 60)) * 100 + "%" }}>
              <div className="flex items-center"><div className="w-2 h-2 rounded-full bg-[var(--color-danger)] -ml-1" /><div className="flex-1 h-px bg-[var(--color-danger)]" /></div>
            </div>
          )}
        </div>
      </motion.div>
      <div className="text-center py-1.5 shrink-0 pointer-events-none">
        <p className="text-[10px] text-[var(--color-text-tertiary)]/50">← swipe → giorno · pizzica per settimana</p>
      </div>
    </motion.div>
  );
}
