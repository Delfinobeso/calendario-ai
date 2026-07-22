"use client";

import { useMemo, useState } from "react";
import {
  getRolloverTodos, getDayItemsExcludingRollover, isToday, isSameDay, formatTime,
  type CalendarEvent,
} from "@/store/calendar";
import { getEventColor } from "@/lib/timeline";
import { useHorizontalSwipe } from "@/lib/swipe";
import { CalendarEmptyIcon } from "@/components/icons";

function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

function dayLabel(d: Date, today: Date): string {
  if (isSameDay(d, today)) return "Oggi";
  if (isSameDay(d, addDays(today, 1))) return "Domani";
  return d.toLocaleDateString("it", { weekday: "long", day: "numeric", month: "long" });
}

// Checkbox todo: cerchio VISIVO 22px, area di tocco 44px via padding invisibile
// (bug reale v1: la classe touch-target forzava min-w/h 44px sullo STESSO
// elemento del bordo/sfondo, ingrandendo il cerchio disegnato). Qui il bottone
// esterno è la sola area di tap (44px, invisibile), il cerchio disegnato vive
// in uno span interno centrato.
function TodoCheckbox({ completed, onToggle, ariaLabel }: { completed?: boolean; onToggle: (e: React.MouseEvent) => void; ariaLabel: string }) {
  return (
    <button
      onClick={onToggle}
      aria-label={ariaLabel}
      className="shrink-0 w-11 h-11 -m-[11px] flex items-center justify-center"
    >
      <span
        className="w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center"
        style={{
          borderColor: completed ? "var(--signal)" : "var(--text-3)",
          backgroundColor: completed ? "var(--signal)" : "transparent",
          transitionProperty: "background-color,border-color",
          transitionDuration: "220ms",
        }}
      >
        {completed && (
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5l3 3 6-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        )}
      </span>
    </button>
  );
}

function TodoRow({ ev, onTap, onToggle }: { ev: CalendarEvent; onTap: () => void; onToggle: () => void }) {
  return (
    <div onClick={onTap} className="flex items-center gap-3 min-h-[52px] px-1 rounded-[var(--r-sm)] active:bg-[var(--surface-1)] cursor-pointer">
      <TodoCheckbox
        completed={ev.completed}
        ariaLabel={ev.completed ? "Segna da fare" : "Segna completata"}
        onToggle={(e) => { e.stopPropagation(); onToggle(); }}
      />
      <span className="text-[14px] font-medium text-[var(--text-1)] truncate" style={ev.completed ? { textDecoration: "line-through", opacity: 0.45 } : undefined}>
        {ev.title}
      </span>
    </div>
  );
}

// Riga quick-add inline (stile Promemoria, feedback Aziz): ultima riga sempre
// presente in "Da fare" — cerchio ghost (non interattivo) + input. INVIO con
// testo crea l'attività (kind:"todo", data = giorno visualizzato) e l'input si
// svuota pronto per la prossima; INVIO su input vuoto non fa nulla. Niente AI
// qui: creazione diretta via API (onAdd → addEvent nel parent).
function QuickAddRow({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <div className="flex items-center gap-3 min-h-[52px] px-1">
      <span className="shrink-0 w-11 h-11 -m-[11px] flex items-center justify-center">
        <span className="w-[22px] h-[22px] rounded-full border-2" style={{ borderColor: "var(--text-3)", opacity: 0.4 }} />
      </span>
      <input
        className="flex-1 min-w-0 bg-transparent py-2 text-[14px] font-medium text-[var(--text-1)] placeholder-[var(--text-3)] outline-none"
        placeholder="Aggiungi attività…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          const t = value.trim();
          if (!t) return;
          onAdd(t);
          setValue("");
        }}
        enterKeyHint="done"
      />
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
  events, anchorDate, onAnchorChange, onTapEvent, onToggleTodo, onQuickAddTodo,
}: {
  events: CalendarEvent[];
  anchorDate: Date;
  onAnchorChange: (d: Date) => void;
  onTapEvent: (ev: CalendarEvent) => void;
  onToggleTodo: (id: number) => void;
  onQuickAddTodo: (title: string) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const isRealToday = isSameDay(anchorDate, today);

  // Vista a GIORNO SINGOLO (feedback Aziz): il giorno selezionato e basta —
  // "Da fare" del giorno + impegni del giorno; swipe ←/→ ovunque per cambiare giorno.
  const rollover = useMemo(() => (isRealToday ? getRolloverTodos(events, today) : []), [events, today, isRealToday]);
  const dayItems = useMemo(
    () => getDayItemsExcludingRollover(events, anchorDate, today).slice().sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
    [events, anchorDate, today]
  );
  const dayTodos = useMemo(() => dayItems.filter((e) => e.kind === "todo"), [dayItems]);
  const dayEvents = useMemo(() => dayItems.filter((e) => e.kind !== "todo"), [dayItems]);
  // Le completate scendono in fondo alla lista del giorno (feedback Aziz);
  // sort stabile: preserva l'ordine relativo tra elementi con lo stesso stato.
  const todos = useMemo(() => {
    const merged = [...rollover, ...dayTodos.filter((t) => !rollover.some((r) => r.id === t.id))];
    return merged.slice().sort((a, b) => Number(!!a.completed) - Number(!!b.completed));
  }, [rollover, dayTodos]);

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
          {/* Il "+" in alto a destra sparisce (feedback Aziz, §2): l'unico
              punto d'ingresso per un nuovo appuntamento è ora l'azione
              centrale del dock (TabBar). Le attività si creano inline sotto. */}
        </div>
      </header>

      {/* Body — SOLO il giorno selezionato: Da fare + impegni. Swipe ovunque cambia giorno. */}
      <div
        key={anchorDate.toDateString() /* rientro dolce a ogni cambio giorno */}
        className="flex-1 min-h-0 overflow-y-auto gpu-scroll touch-pan-y px-4 enter-view"
        style={{ paddingBottom: "180px", transform: dragging ? `translateX(${dragX * 0.35}px)` : undefined, transition: dragging ? "none" : "transform var(--dur-base) var(--ease-orbit)" }}
        {...handlers}
      >
        {/* Ordine invertito (feedback Aziz, §1): prima Impegni, poi Da fare sotto. */}
        {dayEvents.length > 0 && (
          <section className="mb-5">
            <h2 className="text-[12px] font-bold uppercase tracking-wide mb-2 ml-1 capitalize" style={{ color: isToday(anchorDate) ? "var(--flare-hi)" : "var(--text-2)" }}>
              Impegni
            </h2>
            <div className="glass-1 rounded-[var(--r-md)] px-3 py-1 [&>*+*]:border-t [&>*+*]:border-[var(--hairline)]">
              {dayEvents.map((ev) => (
                <EventRow key={ev.id ?? `${ev.master_id}-${ev.start_time}`} ev={ev} onTap={() => onTapEvent(ev)} />
              ))}
            </div>
          </section>
        )}

        {/* Sezione SEMPRE presente (stile Promemoria): la riga quick-add
            inline è l'ultima riga della lista, pronta anche a lista vuota. */}
        <section className="mb-4">
          <h2 className="text-[12px] font-bold uppercase tracking-wide text-[var(--text-2)] mb-2 ml-1">Da fare</h2>
          <div className="glass-1 rounded-[var(--r-md)] px-3 py-1 [&>*+*]:border-t [&>*+*]:border-[var(--hairline)]">
            {todos.map((ev) => (
              <TodoRow key={ev.id ?? `${ev.master_id}-${ev.start_time}`} ev={ev} onTap={() => onTapEvent(ev)} onToggle={() => ev.id != null && onToggleTodo(ev.id)} />
            ))}
            <QuickAddRow onAdd={onQuickAddTodo} />
          </div>
        </section>

        {todos.length === 0 && dayEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center px-8 py-16">
            <CalendarEmptyIcon className="mb-2 opacity-40 text-[var(--text-2)]" />
            <p className="text-[14px] text-[var(--text-2)] font-medium">
              {isRealToday ? "Niente in programma oggi" : "Niente in programma"}
            </p>
            <p className="text-[12px] text-[var(--text-3)] mt-1">Scrivi o detta qui sotto per aggiungere</p>
          </div>
        )}
      </div>
    </div>
  );
}
