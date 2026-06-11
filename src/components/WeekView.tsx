"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CalendarEvent,
  getWeekDates,
  isToday,
  getEventsForDay,
  formatTime,
} from "@/store/calendar";

const WEEKDAY_LABELS = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"];

function getColor(index: number): string {
  const colors = ["#c9a820", "#e04080", "#20c0a0", "#6c5ce7", "#e17055"];
  return colors[index % colors.length];
}

export default function WeekView({
  weekStart,
  events,
  onTapDay,
  onDeleteEvent,
}: {
  weekStart: Date;
  events: CalendarEvent[];
  onTapDay: (date: Date) => void;
  onDeleteEvent: (id: number) => void;
}) {
  const dates = getWeekDates(weekStart);
  const todayRef = useRef<HTMLButtonElement>(null);
  const isCurrentWeek =
    weekStart.toDateString() ===
    (() => {
      const now = new Date();
      const day = now.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      const mon = new Date(now);
      mon.setDate(now.getDate() + diff);
      return mon;
    })().toDateString();

  useEffect(() => {
    if (isCurrentWeek && todayRef.current) {
      todayRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [isCurrentWeek]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="h-full flex flex-col overflow-hidden"
    >
      {/* Day labels */}
      <div className="flex px-3 pb-1.5 shrink-0">
        {WEEKDAY_LABELS.map((l, i) => (
          <div
            key={l}
            className={`flex-1 text-center text-[11px] font-bold tracking-wider ${
              i >= 5
                ? "text-[var(--color-text-tertiary)]/50"
                : "text-[var(--color-text-tertiary)]"
            }`}
          >
            {l}
          </div>
        ))}
      </div>

      {/* Day columns */}
      <div className="flex-1 flex px-3 gap-1.5 min-h-0">
        {dates.map((date, idx) => {
          const dayEvents = getEventsForDay(events, date);
          const todayCheck = isToday(date);
          const isWeekend = idx >= 5;

          return (
            <button
              key={date.toISOString()}
              ref={todayCheck && isCurrentWeek ? todayRef : undefined}
              onClick={() => onTapDay(date)}
              className={`flex-1 flex flex-col rounded-2xl p-1.5 gap-1 transition-colors duration-300 text-left ${
                todayCheck && isCurrentWeek
                  ? "bg-[var(--color-today)] ring-1 ring-[var(--color-accent)]/30"
                  : isWeekend
                  ? "bg-[var(--color-weekend)]"
                  : "bg-transparent"
              }`}
            >
              {/* Day number */}
              <div className="flex justify-center pt-1 pb-0.5">
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold transition-all ${
                    todayCheck && isCurrentWeek
                      ? "bg-[var(--color-accent)] text-black today-pulse shadow-[0_0_12px_var(--color-accent)]"
                      : "text-[var(--color-text-secondary)]"
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>

              {/* Events */}
              <div className="flex-1 flex flex-col gap-1 min-h-0 overflow-hidden">
                {dayEvents.slice(0, 4).map((ev, ei) => (
                  <motion.div
                    key={ev.id || ei}
                    layout
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="rounded-xl px-2 py-1.5 text-[10px] leading-tight font-medium truncate"
                    style={{
                      background: getColor(ei) + "18",
                      color: getColor(ei),
                      borderLeft: `2.5px solid ${getColor(ei)}`,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      ev.id != null && onDeleteEvent(ev.id);
                    }}
                  >
                    <div className="truncate font-semibold mb-0.5">{ev.title}</div>
                    <div className="opacity-70">{formatTime(ev.start_time)}</div>
                  </motion.div>
                ))}
                {dayEvents.length > 4 && (
                  <div className="text-[10px] text-[var(--color-text-tertiary)] text-center font-medium">
                    +{dayEvents.length - 4}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
