"use client";

import { useEffect, useRef, useState } from "react";
import {
  CalendarEvent, getWeekDates, isToday, getEventsForDay, formatTime,
} from "@/store/calendar";
import { getEventColor, getEventMinutes } from "@/lib/timeline";

const WEEKDAY_LABELS = ["LU", "MA", "ME", "GI", "VE", "SA", "DO"];
const HOUR_TICKS = [0, 6, 12, 18, 24];
const LANE_H = 10; // px per riga evento nella mini-timeline
const TICK_H = 12; // px per le etichette ore

// L'app non viene mai smontata: una volta superata l'hydration sul client,
// resta vera anche quando SwipeCarousel rimonta WeekView ad ogni swipe.
let clientHydrated = false;

export default function WeekView({
  weekStart, events,
  onTapDay, onTapEvent,
}: {
  weekStart: Date; events: CalendarEvent[];
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

  const [mounted, setMounted] = useState(clientHydrated);
  useEffect(() => { clientHydrated = true; setMounted(true); }, []);

  const mon = (d => { d.setDate(d.getDate() + (d.getDay() === 0 ? -6 : 1 - d.getDay())); return d; })(new Date(now));
  const isCurrentWeek = mounted && weekStart.toDateString() === mon.toDateString();

  const todayRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (isCurrentWeek) todayRef.current?.scrollIntoView({ block: "nearest" });
  }, [isCurrentWeek]);

  return (
    <div className="h-full overflow-y-auto gpu-scroll touch-pan-y px-3 py-2 flex flex-col gap-1.5">
      {dates.map((date, idx) => {
        const dayEvents = dayEventLists[idx];
        const todayCheck = isToday(date) && isCurrentWeek;
        const isWeekend = idx >= 5;
        const isPast = date.toDateString() < todayStr && !isToday(date);

        const dayLabel = (
          <>
            <span className={`text-[10px] font-bold tracking-wider w-6 shrink-0 ${isWeekend ? "text-[var(--color-text-tertiary)]/40" : "text-[var(--color-text-tertiary)]"}`}>
              {WEEKDAY_LABELS[idx]}
            </span>
            <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-bold shrink-0 transition-all ${
              todayCheck ? "bg-[var(--color-accent)] text-black today-pulse shadow-[0_0_8px_var(--color-accent)]" : "text-[var(--color-text-secondary)]"}`}>
              {date.getDate()}
            </span>
          </>
        );

        if (dayEvents.length === 0) {
          return (
            <button key={date.toISOString()} ref={todayCheck ? todayRef : undefined}
              onClick={() => onTapDay(date)}
              className={`flex items-center gap-2 py-1.5 rounded-xl text-left transition-colors active:bg-[var(--color-surface-secondary)] ${isPast ? "opacity-40" : ""}`}>
              {dayLabel}
              <div className="flex-1 h-px bg-[var(--color-surface-tertiary)]" />
            </button>
          );
        }

        const timelineH = TICK_H + dayEvents.length * LANE_H;

        return (
          <button key={date.toISOString()} ref={todayCheck ? todayRef : undefined}
            onClick={() => onTapDay(date)}
            className={`text-left rounded-2xl px-3 py-2.5 transition-colors active:bg-[var(--color-surface-secondary)] ${
              todayCheck ? "bg-[var(--color-today)] ring-1 ring-[var(--color-accent)]/20" : "bg-[var(--color-surface-secondary)]/60"} ${isPast ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-2 mb-2">{dayLabel}</div>

            {/* Mini timeline orizzontale */}
            <div className="relative mb-2" style={{ height: timelineH }}>
              {HOUR_TICKS.map((hr) => (
                <span key={`l${hr}`}
                  className="absolute top-0 text-[8px] text-[var(--color-text-tertiary)]/50 tabular-nums leading-none font-medium"
                  style={{ left: `${(hr / 24) * 100}%`, transform: hr === 0 ? "none" : hr === 24 ? "translateX(-100%)" : "translateX(-50%)" }}>
                  {hr}
                </span>
              ))}
              {HOUR_TICKS.map((hr) => hr !== 0 && hr !== 24 && (
                <div key={`g${hr}`} className="absolute border-l border-[var(--color-surface-tertiary)]/40"
                  style={{ left: `${(hr / 24) * 100}%`, top: TICK_H, bottom: 0 }} />
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
                <div className="absolute w-0.5 rounded-full bg-[var(--color-danger)] shadow-[0_0_4px_var(--color-danger)]"
                  style={{ left: `${(nowMinutes / 1440) * 100}%`, top: TICK_H, bottom: 0 }} />
              )}
            </div>

            {/* Lista eventi */}
            <div className="flex flex-col gap-0.5">
              {dayEvents.map((ev, ei) => {
                const c = getEventColor(ev);
                return (
                  <div key={ev.id || ei}
                    onClick={(e) => { e.stopPropagation(); onTapEvent(ev); }}
                    className="flex items-center gap-2 py-1 px-1 rounded-lg transition-transform active:scale-[0.98] active:bg-[var(--color-surface-tertiary)]/40">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c }} />
                    <span className="text-[11px] font-bold tabular-nums shrink-0" style={{ color: c }}>
                      {formatTime(ev.start_time)}
                    </span>
                    <span className="text-[12px] text-[var(--color-text-primary)] truncate">{ev.title}</span>
                  </div>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}
