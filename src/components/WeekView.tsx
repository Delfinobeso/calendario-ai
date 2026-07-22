"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarEvent, getWeekStart, getWeekDates, isToday, getEventsForDay, formatTime,
} from "@/store/calendar";
import { getEventColor, getEventMinutes } from "@/lib/timeline";
import { useHorizontalSwipe } from "@/lib/swipe";

const WEEKDAY_LABELS = ["LU", "MA", "ME", "GI", "VE", "SA", "DO"];
const HOUR_TICKS = [0, 6, 12, 18, 24];
const LANE_H = 10;
const TICK_H = 12;

function addWeeks(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n * 7); return r; }

export default function WeekView({
  weekStart, events, onWeekChange, onAddNew,
  onTapDay, onTapEvent,
}: {
  weekStart: Date; events: CalendarEvent[];
  onWeekChange: (d: Date) => void;
  onAddNew: () => void;
  onTapDay: (d: Date) => void; onTapEvent: (ev: CalendarEvent) => void;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayStr = now.toDateString();

  const dates = getWeekDates(weekStart);
  const dayEventLists = dates.map((d) => getEventsForDay(events, d));
  const isCurrentWeek = weekStart.toDateString() === getWeekStart(now).toDateString();

  const todayRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (isCurrentWeek) todayRef.current?.scrollIntoView({ block: "nearest" });
  }, [isCurrentWeek]);

  const goPrev = () => onWeekChange(addWeeks(weekStart, -1));
  const goNext = () => onWeekChange(addWeeks(weekStart, 1));
  const { dragX, dragging, handlers } = useHorizontalSwipe(goNext, goPrev);

  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 6);
  const label = weekStart.getMonth() === weekEnd.getMonth()
    ? weekStart.toLocaleDateString("it", { month: "long", year: "numeric" })
    : `${weekStart.getDate()} – ${weekEnd.getDate()} ${weekEnd.toLocaleDateString("it", { month: "long" })}`;

  return (
    <div className="h-full flex flex-col overflow-hidden enter-view">
      <header className="shrink-0 flex items-center justify-between px-5 pt-1 pb-2">
        <h1 className="text-[20px] font-extrabold text-[var(--text-1)] tracking-tight leading-tight capitalize truncate">{label}</h1>
        <div className="flex items-center gap-2">
          {!isCurrentWeek && (
            <button onClick={() => onWeekChange(getWeekStart(now))} className="touch-target text-[13px] font-semibold px-3 py-2 rounded-full" style={{ color: "var(--flare-hi)", background: "var(--flare-dim)" }}>Oggi</button>
          )}
          <button onClick={onAddNew} aria-label="Nuovo" className="touch-target w-11 h-11 rounded-full flex items-center justify-center glass-1 active:scale-90">
            <span className="text-[22px] leading-none font-medium" style={{ color: "var(--flare-hi)" }}>+</span>
          </button>
        </div>
      </header>

      <div
        className="flex-1 min-h-0 overflow-y-auto gpu-scroll touch-pan-y px-3 py-2 flex flex-col gap-1.5"
        {...handlers}
        style={{
          paddingBottom: "180px",
          transform: dragging ? `translateX(${dragX * 0.3}px)` : "translateX(0)",
          transition: dragging ? "none" : "transform var(--dur-base) var(--ease-orbit)",
        }}
      >
        {dates.map((date, idx) => {
          const dayEvents = dayEventLists[idx];
          const todayCheck = isToday(date) && isCurrentWeek;
          const isWeekend = idx >= 5;
          const isPast = date.toDateString() < todayStr && !isToday(date);

          const dayLabelEl = (
            <>
              <span className="text-[11px] font-bold tracking-wider w-6 shrink-0" style={{ color: isWeekend ? "var(--text-3)" : "var(--text-2)" }}>
                {WEEKDAY_LABELS[idx]}
              </span>
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-bold shrink-0 ${todayCheck ? "today-pulse" : ""}`}
                style={todayCheck ? { background: "var(--flare)", color: "#fff" } : { color: "var(--text-2)" }}
              >
                {date.getDate()}
              </span>
            </>
          );

          if (dayEvents.length === 0) {
            return (
              <button key={date.toISOString()} ref={todayCheck ? todayRef : undefined}
                onClick={() => onTapDay(date)}
                className={`flex items-center gap-2 py-1.5 rounded-[var(--r-sm)] text-left active:bg-[var(--surface-1)] ${isPast ? "opacity-40" : ""}`}>
                {dayLabelEl}
                <div className="flex-1 h-px" style={{ background: "var(--hairline)" }} />
              </button>
            );
          }

          const timelineH = TICK_H + dayEvents.length * LANE_H;

          return (
            <button key={date.toISOString()} ref={todayCheck ? todayRef : undefined}
              onClick={() => onTapDay(date)}
              className={`text-left rounded-[var(--r-md)] px-3 py-2.5 active:bg-[var(--surface-1)] ${isPast ? "opacity-60" : ""}`}
              style={{ background: todayCheck ? "var(--flare-dim)" : "var(--surface-1)" }}>
              <div className="flex items-center gap-2 mb-2">{dayLabelEl}</div>

              <div className="relative mb-2" style={{ height: timelineH }}>
                {HOUR_TICKS.map((hr) => (
                  <span key={`l${hr}`}
                    className="absolute top-0 text-[8px] tabular-nums leading-none font-medium"
                    style={{ left: `${(hr / 24) * 100}%`, transform: hr === 0 ? "none" : hr === 24 ? "translateX(-100%)" : "translateX(-50%)", color: "var(--text-3)", opacity: 0.6 }}>
                    {hr}
                  </span>
                ))}
                {HOUR_TICKS.map((hr) => hr !== 0 && hr !== 24 && (
                  <div key={`g${hr}`} className="absolute border-l" style={{ left: `${(hr / 24) * 100}%`, top: TICK_H, bottom: 0, borderColor: "var(--hairline)" }} />
                ))}
                {dayEvents.map((ev, ei) => {
                  const { startMin: sm, endMin: em } = getEventMinutes(ev);
                  const c = getEventColor(ev);
                  return (
                    <div key={ev.id || ei} className="absolute rounded-full"
                      style={{
                        left: `${(sm / 1440) * 100}%`,
                        width: `max(6px, ${((em - sm) / 1440) * 100}%)`,
                        top: TICK_H + ei * LANE_H + 2, height: LANE_H - 4,
                        background: c,
                      }} />
                  );
                })}
                {todayCheck && (
                  <div className="absolute w-0.5 rounded-full" style={{ left: `${(nowMinutes / 1440) * 100}%`, top: TICK_H, bottom: 0, background: "var(--flare-hi)" }} />
                )}
              </div>

              <div className="flex flex-col gap-0.5">
                {dayEvents.map((ev, ei) => {
                  const c = getEventColor(ev);
                  return (
                    <div key={ev.id || ei}
                      onClick={(e) => { e.stopPropagation(); onTapEvent(ev); }}
                      className="flex items-center gap-2 py-1 px-1 rounded-[10px] active:scale-[0.98] active:bg-[var(--surface-3)]">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c }} />
                      <span className="text-[11px] font-bold tabular-nums shrink-0" style={{ color: c }}>
                        {formatTime(ev.start_time)}
                      </span>
                      <span className="text-[13px] font-medium text-[var(--text-1)] truncate">{ev.title}</span>
                    </div>
                  );
                })}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
