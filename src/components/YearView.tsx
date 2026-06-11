"use client";

import { motion } from "framer-motion";
import { CalendarEvent, isToday, isSameDay } from "@/store/calendar";

const MONTHS_SHORT = [
  "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
  "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
];

function getMonthDays(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  // Pad to Monday
  let startDay = first.getDay();
  if (startDay === 0) startDay = 7;
  for (let i = 1; i < startDay; i++) {
    currentWeek.push(new Date(year, month, 1 - (startDay - i)));
  }

  for (let d = 1; d <= last.getDate(); d++) {
    currentWeek.push(new Date(year, month, d));
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      const ld = currentWeek[currentWeek.length - 1];
      currentWeek.push(new Date(ld.getFullYear(), ld.getMonth(), ld.getDate() + 1));
    }
    weeks.push(currentWeek);
  }
  return weeks;
}

export default function YearView({
  year,
  events,
  onTapMonth,
}: {
  year: number;
  events: CalendarEvent[];
  onTapMonth: (month: number) => void;
}) {
  const today = new Date();
  const isCurrentYear = today.getFullYear() === year;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="h-full flex flex-col overflow-hidden"
    >
      {/* Year title */}
      <div className="text-center py-2.5 shrink-0">
        <p className="text-lg font-bold text-[var(--color-text-primary)]">
          {year}
        </p>
      </div>

      {/* Month grid */}
      <div className="flex-1 overflow-y-auto px-2">
        <div className="grid grid-cols-3 gap-3">
          {MONTHS_SHORT.map((name, monthIdx) => {
            const weeks = getMonthDays(year, monthIdx);
            const isCurrentMonth =
              isCurrentYear && today.getMonth() === monthIdx;

            return (
              <button
                key={monthIdx}
                onClick={() => onTapMonth(monthIdx)}
                className={`rounded-2xl p-2.5 transition-all active:scale-95 text-left ${
                  isCurrentMonth
                    ? "bg-[var(--color-today)] ring-1 ring-[var(--color-accent)]/30"
                    : "bg-[var(--color-surface-secondary)]"
                }`}
              >
                <p
                  className={`text-xs font-semibold mb-1.5 ${
                    isCurrentMonth
                      ? "text-[var(--color-accent)]"
                      : "text-[var(--color-text-secondary)]"
                  }`}
                >
                  {name}
                </p>

                {/* Mini week headers */}
                <div className="grid grid-cols-7 gap-0 mb-0.5">
                  {["L","M","M","G","V","S","D"].map((h, i) => (
                    <span
                      key={i}
                      className="text-[7px] text-[var(--color-text-tertiary)]/40 text-center font-medium"
                    >
                      {h}
                    </span>
                  ))}
                </div>

                {/* Mini days */}
                {weeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7 gap-0">
                    {week.map((d, di) => {
                      const isDay = d.getMonth() === monthIdx;
                      const hasEvents = events.some((e) =>
                        isSameDay(new Date(e.start_time), d)
                      );
                      return (
                        <span
                          key={di}
                          className={`text-[8px] text-center leading-relaxed rounded-sm ${
                            !isDay
                              ? "text-transparent"
                              : isToday(d)
                              ? "bg-[var(--color-accent)] text-black font-bold"
                              : hasEvents
                              ? "text-[var(--color-accent)] font-semibold"
                              : "text-[var(--color-text-tertiary)]"
                          }`}
                        >
                          {d.getDate()}
                        </span>
                      );
                    })}
                  </div>
                ))}
              </button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
