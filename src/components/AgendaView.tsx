"use client";

import { useMemo } from "react";
import {
  getRolloverTodos, getDayItemsExcludingRollover, isToday, isSameDay, formatTime,
  type CalendarEvent,
} from "@/store/calendar";
import { getEventColor } from "@/lib/timeline";
import { useHorizontalSwipe } from "@/lib/swipe";
import { CalendarEmptyIcon } from "@/components/icons";

const DAYS_AHEAD = 14;

function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

function dayLabel(d: Date, today: Date): string {
  if (isSameDay(d, today)) return "Oggi";
  if (isSameDay(d, addDays(today, 1))) return "Domani";
  return d.toLocaleDateString("it", { weekday: "long", day: "numeric", month: "long" });
}

function TodoRow({ ev, onTap, onToggle }: { ev: CalendarEvent; onTap: () => void; onToggle: () => void }) {
  return (
    <div onClick={onTap} className="flex items-center gap-3 min-h-[52px] px-1 rounded-[var(--r-sm)] active:bg-[var(--surface-1)] cursor-pointer">
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        aria-label={ev.completed ? "Segna da fare" : "Segna completata"}
        className="touch-target w-6 h-6 -m-2.5 shrink-0 flex items-center justify-center rounded-full border-2"
        style={{
          borderColor: ev.completed ? "var(--signal)" : "var(--text-3)",
          background: ev.completed ? "var(--signal)" : "transparent",
          transitionProperty: "background-color,border-color",
          transitionDuration: "220ms",
        }}
      >
        {ev.completed && (
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5l3 3 6-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        )}
      </button>
      <span className="text-[14px] font-medium text-[var(--text-1)] truncate" style={ev.completed ? { textDecoration: "line-through", opacity: 0.45 } : undefined}>
        {ev.title}
      </span>
    </div>
  );
}

function EventRow({ ev, onTap }: { ev: CalendarEvent; onTap: () => void }) {
  const c = getEventColor(ev);
  return (
    <div onClick={onTap} className="flex items-center gap-3 min-h-[52px] px-1 rounded-[var(--r-sm)] active:bg-[var(--surface-1)] cursor-pointer">
      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: c }} />
      <span className="font-mono tabular-nums text-[13px] font-semibold shrink-0 w-11" style={{ color: c }}>{formatTime(ev.start_time)}</span>
      <span className="text-[14px] font-medium text-[var(--text-1)] truncate">{ev.title}</span>
    </div>
  );
}

export default function AgendaView({
  events, anchorDate, onAnchorChange, onAddNew, onTapEvent, onToggleTodo,
}: {
  events: CalendarEvent[];
  anchorDate: Date;
  onAnchorChange: (d: Date) => void;
  onAddNew: () => void;
  onTapEvent: (ev: CalendarEvent) => void;
  onToggleTodo: (id: number) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const isRealToday = isSameDay(anchorDate, today);

  const rollover = useMemo(() => getRolloverTodos(events, today), [events, today]);

  const days = useMemo(() => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(anchorDate, i)), [anchorDate]);

  const goPrev = () => onAnchorChange(addDays(anchorDate, -1));
  const goNext = () => onAnchorChange(addDays(anchorDate, 1));
  const { dragX, dragging, handlers } = useHorizontalSwipe(goNext, goPrev);

  return (
    <div className="h-full flex flex-col overflow-hidden enter-view">
      {/* Header — data grande, swipe/frecce giorno prec/succ */}
      <header
        className="shrink-0 flex items-center justify-between px-5 pt-1 pb-2"
        {...handlers}
        style={{
          transform: dragging ? `translateX(${dragX * 0.3}px)` : "translateX(0)",
          transition: dragging ? "none" : "transform var(--dur-base) var(--ease-orbit)",
        }}
      >
        <div className="flex items-center gap-1 min-w-0">
          <button onClick={goPrev} aria-label="Giorno precedente" className="touch-target -ml-2 flex items-center justify-center text-[var(--text-3)] active:scale-90">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div className="min-w-0">
            <h1 className="text-[20px] font-extrabold text-[var(--text-1)] tracking-tight leading-tight capitalize truncate">
              {dayLabel(anchorDate, today)}
            </h1>
            {!isSameDay(anchorDate, today) && (
              <p className="text-[12px] font-medium text-[var(--text-2)] leading-tight">
                {anchorDate.toLocaleDateString("it", { day: "numeric", month: "long" })}
              </p>
            )}
          </div>
          <button onClick={goNext} aria-label="Giorno successivo" className="touch-target flex items-center justify-center text-[var(--text-3)] active:scale-90">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isRealToday && (
            <button onClick={() => onAnchorChange(today)} className="touch-target text-[13px] font-semibold px-3 py-2 rounded-full" style={{ color: "var(--flare-hi)", background: "var(--flare-dim)" }}>Oggi</button>
          )}
          <button
            onClick={onAddNew}
            aria-label="Nuovo"
            className="touch-target w-11 h-11 rounded-full flex items-center justify-center glass-1 active:scale-90"
          >
            <span className="text-[22px] leading-none font-medium" style={{ color: "var(--flare-hi)" }}>+</span>
          </button>
        </div>
      </header>

      {/* Body — Da fare in cima, poi giorni a scorrere */}
      <div className="flex-1 min-h-0 overflow-y-auto gpu-scroll touch-pan-y px-4" style={{ paddingBottom: "180px" }}>
        {rollover.length > 0 && (
          <section className="mb-5">
            <h2 className="text-[12px] font-bold uppercase tracking-wide text-[var(--text-2)] mb-2 ml-1">Da fare</h2>
            <div className="glass-1 rounded-[var(--r-md)] px-3 py-1 [&>*+*]:border-t [&>*+*]:border-[var(--hairline)]">
              {rollover.map((ev) => (
                <TodoRow key={ev.id} ev={ev} onTap={() => onTapEvent(ev)} onToggle={() => ev.id != null && onToggleTodo(ev.id)} />
              ))}
            </div>
          </section>
        )}

        {days.map((d) => {
          const items = getDayItemsExcludingRollover(events, d, today).slice().sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
          return (
            <section key={d.toISOString()} className="mb-4">
              <h2 className="text-[12px] font-bold uppercase tracking-wide mb-2 ml-1 capitalize" style={{ color: isToday(d) ? "var(--flare-hi)" : "var(--text-2)" }}>
                {dayLabel(d, today)}
              </h2>
              {items.length === 0 ? (
                <div className="flex items-center gap-2 py-2 px-1">
                  <div className="flex-1 h-px" style={{ background: "var(--hairline)" }} />
                  <span className="text-[11px] text-[var(--text-3)]">Nessun evento</span>
                  <div className="flex-1 h-px" style={{ background: "var(--hairline)" }} />
                </div>
              ) : (
                <div className="glass-1 rounded-[var(--r-md)] px-3 py-1 [&>*+*]:border-t [&>*+*]:border-[var(--hairline)]">
                  {items.map((ev) => ev.kind === "todo"
                    ? <TodoRow key={ev.id ?? `${ev.master_id}-${ev.start_time}`} ev={ev} onTap={() => onTapEvent(ev)} onToggle={() => ev.id != null && onToggleTodo(ev.id)} />
                    : <EventRow key={ev.id ?? `${ev.master_id}-${ev.start_time}`} ev={ev} onTap={() => onTapEvent(ev)} />
                  )}
                </div>
              )}
            </section>
          );
        })}

        {rollover.length === 0 && days.every((d) => getDayItemsExcludingRollover(events, d, today).length === 0) && (
          <div className="flex flex-col items-center justify-center text-center px-8 py-16">
            <CalendarEmptyIcon className="mb-2 opacity-40 text-[var(--text-2)]" />
            <p className="text-[14px] text-[var(--text-2)] font-medium">Nessun evento nei prossimi {DAYS_AHEAD} giorni</p>
          </div>
        )}
      </div>
    </div>
  );
}
