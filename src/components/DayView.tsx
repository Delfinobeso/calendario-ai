"use client";

import { motion } from "framer-motion";
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
  onTapEvent,
  onPinchOut,
}: {
  date: Date;
  events: CalendarEvent[];
  onTapEvent: (id: number) => void;
  onPinchOut: () => void;
}) {
  const dayEvents = getEventsForDay(events, date);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowY = (nowMinutes / (24 * 60)) * 100; // percentage

  const dayLabel = date.toLocaleDateString("it", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const { onTouchStart, onTouchMove, onTouchEnd } = {
    onTouchStart: (e: React.TouchEvent) => {
      if (e.touches.length >= 2) {
        // pinch detection handled by parent wrapper — this is fallback
      }
    },
    onTouchMove: () => {},
    onTouchEnd: () => {},
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="h-full flex flex-col overflow-hidden"
    >
      {/* Day header */}
      <div className="text-center py-3 shrink-0">
        <p className="text-sm font-semibold text-[var(--color-text-secondary)] capitalize">
          {dayLabel}
        </p>
        {isToday && (
          <p className="text-[11px] text-[var(--color-accent)] mt-0.5 font-medium">
            Oggi
          </p>
        )}
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto relative px-2">
        {/* Hour grid */}
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

          {/* Events */}
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
                <div className="text-[11px] font-semibold leading-tight truncate">
                  {ev.title}
                </div>
                <div className="text-[10px] opacity-70 leading-tight">
                  {formatTime(ev.start_time)} – {formatTime(ev.end_time)}
                </div>
                {ev.location && (
                  <div className="text-[10px] opacity-50 leading-tight truncate mt-0.5">
                    📍 {ev.location}
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Now line */}
          {isToday && nowMinutes >= 0 && nowMinutes < 24 * 60 && (
            <div
              className="absolute left-0 right-0 z-10 pointer-events-none"
              style={{ top: nowY + "%" }}
            >
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-[var(--color-danger)] -ml-1" />
                <div className="flex-1 h-px bg-[var(--color-danger)]" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pinch hint */}
      <div className="text-center py-1.5 shrink-0">
        <p className="text-[10px] text-[var(--color-text-tertiary)]/50">
          pizzica per tornare alla settimana
        </p>
      </div>
    </motion.div>
  );
}
