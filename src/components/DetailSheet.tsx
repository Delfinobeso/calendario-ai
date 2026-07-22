"use client";

import { useState, useEffect } from "react";
import Sheet from "@/components/Sheet";
import { PinIcon, MapIcon, CompassIcon } from "@/components/icons";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/timeline";
import { formatTime, type CalendarEvent } from "@/store/calendar";

const RECURRENCE_LABELS: Record<string, string> = {
  daily: "Ogni giorno", weekly: "Ogni settimana", monthly: "Ogni mese", yearly: "Ogni anno",
};
const REMINDER_LABELS: Record<number, string> = { 10: "10 min", 30: "30 min", 60: "1 ora", 1440: "1 giorno" };

function formatEventDate(ev: CalendarEvent): string {
  return new Date(ev.start_time).toLocaleDateString("it", { weekday: "long", day: "numeric", month: "long" });
}
function formatEventTimeRange(ev: CalendarEvent): string {
  const s = formatTime(ev.start_time);
  const e = formatTime(ev.end_time);
  return s === e ? s : `${s} – ${e}`;
}

export default function DetailSheet({
  event, onClose, onEdit, onDelete, onToggleComplete,
}: {
  event: CalendarEvent | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleComplete?: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => { setConfirmDelete(false); }, [event]);
  const isTodo = event?.kind === "todo";

  return (
    <Sheet open={!!event} onClose={onClose} maxHeightRatio={0.85} labelledBy="detail-sheet-title">
      {event && (
        <>
          <div className="flex items-start gap-3 mb-1">
            {isTodo && (
              <button
                onClick={onToggleComplete}
                aria-label={event.completed ? "Segna da fare" : "Segna completata"}
                className="mt-1 shrink-0 touch-target w-7 h-7 -m-1.5 flex items-center justify-center rounded-full border-2"
                style={{
                  borderColor: event.completed ? "var(--signal)" : "var(--text-3)",
                  background: event.completed ? "var(--signal)" : "transparent",
                  transitionProperty: "background-color,border-color",
                  transitionDuration: "220ms",
                }}
              >
                {event.completed && (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3.5 8.5l3 3 6-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                )}
              </button>
            )}
            <h2 id="detail-sheet-title" className="selectable-text text-[20px] font-bold break-words text-[var(--text-1)]" style={event.completed ? { textDecoration: "line-through", opacity: 0.5 } : undefined}>
              {event.title}
            </h2>
          </div>
          <p className="text-[14px] font-semibold capitalize mb-0.5" style={{ color: "var(--flare-hi)" }}>{formatEventDate(event)}</p>
          {!isTodo && <p className="text-[14px] text-[var(--text-2)] mb-3">{formatEventTimeRange(event)}</p>}
          {isTodo && <p className="text-[14px] text-[var(--text-2)] mb-3">Attività senza orario</p>}

          {event.category && CATEGORY_LABELS[event.category] && (
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1 rounded-full mb-5"
              style={{ background: CATEGORY_COLORS[event.category] + "22", color: CATEGORY_COLORS[event.category] }}>
              <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[event.category] }} />
              {CATEGORY_LABELS[event.category]}
            </span>
          )}

          {(event.recurrence || (event.reminder_minutes ?? 0) > 0) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mb-5 text-[13px] text-[var(--text-2)]">
              {event.recurrence && <span className="flex items-center gap-1.5">↻ {RECURRENCE_LABELS[event.recurrence]}</span>}
              {(event.reminder_minutes ?? 0) > 0 && <span className="flex items-center gap-1.5">🔔 {REMINDER_LABELS[event.reminder_minutes!] ?? `${event.reminder_minutes}m`} prima</span>}
            </div>
          )}

          {event.location && (
            <div className="mb-5">
              <div className="flex items-start gap-2 text-[var(--text-1)] text-[15px] mb-2.5"><PinIcon className="mt-0.5 shrink-0" /><span className="selectable-text flex-1 break-words">{event.location}</span></div>
              <div className="flex gap-3">
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`} target="_blank" rel="noopener" className="flex-1 touch-target flex items-center justify-center gap-1.5 rounded-[var(--r-md)] py-3 text-[14px] font-semibold text-[var(--text-1)] active:scale-[0.98] bg-[var(--surface-1)]"><MapIcon /> Maps</a>
                <a href={`https://waze.com/ul?q=${encodeURIComponent(event.location)}`} target="_blank" rel="noopener" className="flex-1 touch-target flex items-center justify-center gap-1.5 rounded-[var(--r-md)] py-3 text-[14px] font-semibold text-[var(--text-1)] active:scale-[0.98] bg-[var(--surface-1)]"><CompassIcon /> Waze</a>
              </div>
            </div>
          )}

          {event.description && (
            <div className="mb-6">
              <span className="block text-[12px] text-[var(--text-2)] mb-1.5 ml-1">Descrizione</span>
              <p className="selectable-text text-[15px] text-[var(--text-1)] leading-relaxed whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          {!confirmDelete ? (
            <div className="flex gap-3 mb-2">
              <button onClick={() => setConfirmDelete(true)} className="flex-1 touch-target py-4 rounded-[var(--r-md)] font-bold text-[16px] active:scale-[0.98] bg-transparent border" style={{ color: "var(--alert)", borderColor: "var(--alert)" }}>Elimina</button>
              <button onClick={onEdit} className="flex-[2] touch-target font-bold rounded-[var(--r-md)] py-4 active:scale-[0.98] text-[16px] text-white" style={{ background: "var(--flare)" }}>Modifica</button>
            </div>
          ) : (
            <div className="space-y-2.5 mb-2">
              <p className="text-[13px] text-[var(--text-2)] text-center">Eliminare definitivamente?</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmDelete(false)} className="flex-1 touch-target py-4 rounded-[var(--r-md)] font-bold text-[16px] active:scale-[0.98] bg-[var(--surface-1)] text-[var(--text-1)]">Annulla</button>
                <button onClick={onDelete} className="flex-1 touch-target py-4 rounded-[var(--r-md)] font-bold text-[16px] active:scale-[0.98] bg-transparent border" style={{ color: "var(--alert)", borderColor: "var(--alert)" }}>Conferma</button>
              </div>
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}
