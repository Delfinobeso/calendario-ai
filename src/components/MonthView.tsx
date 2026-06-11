"use client";

import { motion, PanInfo } from "framer-motion";
import { CalendarEvent, isToday, isSameDay } from "@/store/calendar";

const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];
const DAY_HEADERS = ["L", "M", "M", "G", "V", "S", "D"];

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  let startDay = first.getDay();
  if (startDay === 0) startDay = 7;
  for (let i = 1; i < startDay; i++) {
    days.push(new Date(year, month, 1 - (startDay - i)));
  }

  for (let d = 1; d <= last.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  while (days.length < 42) {
    const lastDay = days[days.length - 1];
    days.push(new Date(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate() + 1));
  }
  return days;
}

const EVENT_COLORS = ["#c9a820", "#e04080", "#20c0a0", "#6c5ce7", "#e17055"];
function getColor(idx: number) {
  return EVENT_COLORS[idx % EVENT_COLORS.length];
}

export default function MonthView({
  year,
  month,
  events,
  direction,
  onTapDay,
  onSwipeLeft,
  onSwipeRight,
}: {
  year: number;
  month: number;
  events: CalendarEvent[];
  direction: number;
  onTapDay: (date: Date) => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}) {
  const days = getDaysInMonth(year, month);
  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

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
      <div className="text-center py-2.5 shrink-0">
        <p className="text-sm font-semibold text-[var(--color-text-secondary)]">
          {MONTHS_IT[month]} {year}
        </p>
      </div>

      <div className="grid grid-cols-7 px-1 pb-1 shrink-0">
        {DAY_HEADERS.map((h, i) => (
          <div
            key={i}
            className={`text-center text-[10px] font-bold tracking-wider ${
              i >= 5 ? "text-[var(--color-text-tertiary)]/40" : "text-[var(--color-text-tertiary)]"
            }`}
          >
            {h}
          </div>
        ))}
      </div>

      {/* Day grid — draggable */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.1}
        onPanEnd={handlePanEnd}
        className="flex-1 grid grid-cols-7 auto-rows-fr gap-px px-1 min-h-0"
      >
        {days.map((date, idx) => {
          const dayEvents = events.filter((e) => isSameDay(new Date(e.start_time), date));
          const isCurrentMonthDay = date.getMonth() === month;
          const todayCheck = isToday(date);

          return (
            <button
              key={idx}
              onClick={() => isCurrentMonthDay && onTapDay(date)}
              className={`flex flex-col items-center rounded-lg p-0.5 transition-colors active:bg-[var(--color-surface-secondary)] ${
                !isCurrentMonthDay ? "opacity-30" : ""
              } ${
                todayCheck && isCurrentMonth
                  ? "bg-[var(--color-today)] ring-1 ring-[var(--color-accent)]/30"
                  : ""
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold ${
                  todayCheck && isCurrentMonth
                    ? "bg-[var(--color-accent)] text-black today-pulse"
                    : isCurrentMonthDay
                    ? "text-[var(--color-text-primary)]"
                    : "text-[var(--color-text-tertiary)]"
                }`}
              >
                {date.getDate()}
              </span>
              <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                {dayEvents.slice(0, 3).map((ev, ei) => (
                  <span key={ei} className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: getColor(ei) }} />
                ))}
              </div>
            </button>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
