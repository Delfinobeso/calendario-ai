"use client";

import { CalendarEvent, isToday, isSameDay } from "@/store/calendar";
import { getEventColor } from "@/lib/timeline";
import { useHorizontalSwipe } from "@/lib/swipe";

const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];
const DAY_HEADERS = ["LU", "MA", "ME", "GI", "VE", "SA", "DO"];

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  let startDay = first.getDay();
  if (startDay === 0) startDay = 7;
  for (let i = 1; i < startDay; i++) days.push(new Date(year, month, 1 - (startDay - i)));
  for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
  while (days.length < 42) {
    const ld = days[days.length - 1];
    days.push(new Date(ld.getFullYear(), ld.getMonth(), ld.getDate() + 1));
  }
  return days;
}

export default function MonthView({
  year, month, events, onMonthChange,
  onTapDay, onTapEvent,
}: {
  year: number; month: number; events: CalendarEvent[];
  onMonthChange: (year: number, month: number) => void;
  onTapDay: (d: Date) => void;
  onTapEvent: (ev: CalendarEvent) => void;
}) {
  const days = getDaysInMonth(year, month);
  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

  const goPrev = () => onMonthChange(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1);
  const goNext = () => onMonthChange(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1);
  const { dragX, dragging, handlers } = useHorizontalSwipe(goNext, goPrev);

  return (
    <div className="h-full flex flex-col overflow-hidden enter-view">
      <header className="shrink-0 flex items-center justify-between px-5 pt-1 pb-1.5">
        <h1 className="text-[20px] font-extrabold text-[var(--text-1)] tracking-tight leading-tight capitalize">{MONTHS_IT[month]} {year}</h1>
        <div className="flex items-center gap-2">
          {!isCurrentMonth && (
            <button onClick={() => onMonthChange(today.getFullYear(), today.getMonth())} className="touch-target text-[13px] font-semibold px-3 py-2 rounded-full" style={{ color: "var(--flare-hi)", background: "var(--flare-dim)" }}>Oggi</button>
          )}
          {/* "+" rimosso (§2): l'unico ingresso per un nuovo appuntamento è
              ora l'azione centrale del dock, identica su ogni tab. */}
        </div>
      </header>

      <div className="grid grid-cols-7 px-3 pb-1.5 shrink-0">
        {DAY_HEADERS.map((h, i) => (
          <div key={i} className="text-center text-[10px] font-bold tracking-wider" style={{ color: i >= 5 ? "var(--text-3)" : "var(--text-2)" }}>
            {h}
          </div>
        ))}
      </div>

      <div
        className="flex-1 grid grid-cols-7 auto-rows-fr gap-px px-2 min-h-0 gpu-layer"
        {...handlers}
        style={{
          paddingBottom: "170px",
          transform: dragging ? `translateX(${dragX * 0.3}px)` : "translateX(0)",
          transition: dragging ? "none" : "transform var(--dur-base) var(--ease-orbit)",
        }}
      >
        {days.map((date, idx) => {
          const dayEvents = events.filter((e) => isSameDay(new Date(e.start_time), date));
          const inMonth = date.getMonth() === month;
          const todayCheck = isToday(date);
          return (
            <button key={idx} onClick={() => inMonth && onTapDay(date)}
              className="flex flex-col items-center rounded-[10px] p-0.5 active:bg-[var(--surface-1)]"
              style={{
                opacity: inMonth ? 1 : 0.3,
                background: todayCheck && isCurrentMonth ? "var(--flare-dim)" : "transparent",
              }}>
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-semibold ${todayCheck && isCurrentMonth ? "today-pulse" : ""}`}
                style={{
                  background: todayCheck && isCurrentMonth ? "var(--flare)" : "transparent",
                  color: todayCheck && isCurrentMonth ? "#fff" : inMonth ? "var(--text-1)" : "var(--text-3)",
                }}>
                {date.getDate()}
              </span>
              <div className="flex flex-col gap-0.5 mt-0.5 w-full px-0.5 min-h-0">
                {dayEvents.slice(0, 3).map((ev, ei) => {
                  const c = getEventColor(ev);
                  return (
                    <button key={ev.id ?? ei}
                      onClick={(e) => { e.stopPropagation(); onTapEvent(ev); }}
                      className="w-full rounded-[3px] px-1 py-px text-[10px] font-semibold leading-tight truncate text-left active:opacity-70"
                      style={{ background: c + "26", color: c }}>
                      {ev.title}
                    </button>
                  );
                })}
                {dayEvents.length > 3 && (
                  <span className="text-[9px] text-center font-medium" style={{ color: "var(--text-3)" }}>
                    +{dayEvents.length - 3}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
