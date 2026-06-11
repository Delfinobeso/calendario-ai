"use client";

import { motion, PanInfo } from "framer-motion";
import {
  CalendarEvent,
  getEventsForDay,
  formatTime,
} from "@/store/calendar";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function eventTop(ev: CalendarEvent): number {
  const d = new Date(ev.start_time);
  return d.getHours() * 60 + d.getMinutes();
}

function eventHeight(ev: CalendarEvent): number {
  const start = new Date(ev.start_time).getTime();
  const end = new Date(ev.end_time).getTime();
  return Math.max(30, ((end - start) / (1000 * 60)));
}

const EVENT_COLORS = ["#c9a820", "#e04080", "#20c0a0", "#6c5ce7", "#e17055"];
function getColor(idx: number) {
  return EVENT_COLORS[idx % EVENT_COLORS.length];
}

export default function DayView({
  date,
  events,
  direction,
  onTapEvent,
  onSwipeLeft,
  onSwipeRight,
}: {
  date: Date;
  events: CalendarEvent[];
  direction: number;
  onTapEvent: (id: number) => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}) {
  const dayEvents = getEventsForDay(events, date);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? "40%" : "-40%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? "-40%" : "40%", opacity: 0 }),
  };

  const handlePanEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 60 && Math.abs(info.offset.x) > Math.abs(info.offset.y) * 2) {
      if (info.offset.x < 0) onSwipeLeft();
      else onSwipeRight();
    }
  };

  return (
    <motion.div
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: "spring", stiffness: 350, damping: 32 }}
      className="h-full flex flex-col overflow-hidden"
    >
      {/* Day header */}
      <div className="text-center py-3 shrink-0">
        <p className="text-sm font-semibold text-[var(--color-text-secondary)] capitalize">
          {date.toLocaleDateString("it", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        {isToday && (
          <p className="text-[11px] text-[var(--color-accent)] mt-0.5 font-medium">Oggi</p>
        )}
      </div>

      {/* Timeline — draggable for swipe */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onPanEnd={handlePanEnd}
        className="flex-1 overflow-y-auto relative px-2 touch-pan-y"
      >
        <div className="relative" style={{ height: 24 * 60 + "px" }}>
          {HOURS.map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 flex items-start"
              style={{ top: h * 60 + "px", height: "60px" }}
            >
              <span className="text-[10px] text-[var(--color-text-tertiary)] w-8 text-right pr-2 leading-none mt-0">
                {String(h).padStart(2, "0")}
              </span>
              <div className="flex-1 border-t border-[var(--color-surface-tertiary)]/30" />
            </div>
          ))}

          {dayEvents.map((ev, ei) => {
            const top = eventTop(ev);
            const h = eventHeight(ev);
            const color = getColor(ei);
            return (
              <motion.div
                key={ev.id || ei}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                whileTap={{ scale: 0.98 }}
                className="absolute left-10 right-1 rounded-xl px-2.5 py-1.5 cursor-pointer overflow-hidden"
                style={{
                  top: top + "px",
                  height: h + "px",
                  background: color + "20",
                  borderLeft: `3px solid ${color}`,
                  color,
                }}
                onClick={() => ev.id != null && onTapEvent(ev.id)}
              >
                <div className="text-[11px] font-semibold leading-tight truncate">{ev.title}</div>
                <div className="text-[10px] opacity-70 leading-tight">
                  {formatTime(ev.start_time)} – {formatTime(ev.end_time)}
                </div>
                {ev.location && (
                  <div className="text-[10px] opacity-50 leading-tight truncate mt-0.5">📍 {ev.location}</div>
                )}
              </motion.div>
            );
          })}

          {isToday && nowMinutes >= 0 && nowMinutes < 24 * 60 && (
            <div
              className="absolute left-0 right-0 z-10 pointer-events-none"
              style={{ top: (nowMinutes / (24 * 60)) * 100 + "%" }}
            >
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-[var(--color-danger)] -ml-1" />
                <div className="flex-1 h-px bg-[var(--color-danger)]" />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Pinch hint */}
      <div className="text-center py-1.5 shrink-0 pointer-events-none">
        <p className="text-[10px] text-[var(--color-text-tertiary)]/50">
          ← swipe → giorno · pizzica per settimana
        </p>
      </div>
    </motion.div>
  );
}
