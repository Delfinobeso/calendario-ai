"use client";

import { useState, useRef, useEffect } from "react";
import Sheet from "@/components/Sheet";
import HoldToConfirm from "@/components/HoldToConfirm";
import { ChevronUpIcon } from "@/components/icons";
import { CATEGORY_ORDER, CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/timeline";
import type { EventKind, Recurrence } from "@/store/calendar";

export interface EventFormValues {
  kind: EventKind;
  title: string;
  loc: string;
  desc: string;
  category: string;
  recurrence: string;
  recurrenceUntil: string;
  reminder: number;
  date: string;
  startTime: string;
  endTime: string;
}

const RECURRENCE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Mai" },
  { value: "daily", label: "Ogni giorno" },
  { value: "weekly", label: "Ogni settimana" },
  { value: "monthly", label: "Ogni mese" },
  { value: "yearly", label: "Ogni anno" },
];
const REMINDER_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: "Nessuno" },
  { value: 10, label: "10 min" },
  { value: 30, label: "30 min" },
  { value: 60, label: "1 ora" },
  { value: 1440, label: "1 giorno" },
];

function roundUp30(): string {
  const now = new Date(); now.setSeconds(0, 0);
  if (now.getMinutes() < 30) now.setMinutes(30);
  else { now.setMinutes(0); now.setHours(now.getHours() + 1); }
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}
function addHour(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const d = new Date(2026, 0, 1, h, m); d.setHours(d.getHours() + 1);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function blankForm(date?: Date): EventFormValues {
  return {
    kind: "event",
    title: "", loc: "", desc: "", category: "", recurrence: "", recurrenceUntil: "", reminder: 0,
    date: (date ?? new Date()).toISOString().slice(0, 10),
    startTime: roundUp30(), endTime: addHour(roundUp30()),
  };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] text-[var(--text-2)] mb-1.5 ml-1">{label}</span>
      {children}
    </label>
  );
}

const inputCls = "w-full rounded-[var(--r-md)] px-4 py-4 text-[var(--text-1)] placeholder-[var(--text-3)] outline-none text-[16px] transition-shadow bg-[var(--surface-1)] border border-[var(--hairline)] focus:border-[var(--hairline-hi)]";

function CategoryPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <span className="block text-[12px] text-[var(--text-2)] mb-1.5 ml-1">Categoria</span>
      <div className="flex flex-wrap gap-2">
        {CATEGORY_ORDER.map((cat) => {
          const active = value === cat;
          const color = cat ? CATEGORY_COLORS[cat] : "var(--text-3)";
          const label = cat ? CATEGORY_LABELS[cat] : "Nessuna";
          return (
            <button
              key={cat || "none"}
              type="button"
              onClick={() => onChange(cat)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-[13px] font-semibold active:scale-95"
              style={{
                background: active ? color : "var(--surface-1)",
                color: active ? "oklch(15% 0 0)" : "var(--text-2)",
                transitionProperty: "background-color,color",
                transitionDuration: "var(--dur-fast)",
                transitionTimingFunction: "var(--ease-snap)",
              }}
            >
              {cat && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: active ? "oklch(15% 0 0 / 0.55)" : color }} />}
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-2 rounded-full text-[13px] font-semibold active:scale-95"
      style={{
        background: active ? "var(--flare)" : "var(--surface-1)",
        color: active ? "#fff" : "var(--text-2)",
        transitionProperty: "background-color,color",
        transitionDuration: "var(--dur-fast)",
        transitionTimingFunction: "var(--ease-snap)",
      }}
    >
      {children}
    </button>
  );
}

function advancedSummary(form: EventFormValues): string {
  return [
    form.kind === "event" && form.recurrence ? `↻ ${RECURRENCE_OPTIONS.find(o => o.value === form.recurrence)?.label}` : "",
    form.kind === "event" && form.reminder ? `🔔 ${REMINDER_OPTIONS.find(o => o.value === form.reminder)?.label}` : "",
    form.desc.trim() ? "Descrizione" : "",
  ].filter(Boolean).join(" · ");
}
export function hasAdvancedData(form: EventFormValues): boolean {
  return Boolean(form.recurrence || form.reminder || form.desc.trim());
}

export default function EventSheet({
  open, onClose, mode, form, setForm, onSubmit, onDelete, titleError, setTitleError,
}: {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  form: EventFormValues;
  setForm: (updater: (f: EventFormValues) => EventFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  onDelete?: () => void;
  titleError: boolean;
  setTitleError: (v: boolean) => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  // Il toggle Evento/Attività sparisce (§3): le attività si creano SOLO
  // inline in Agenda ora. Questo sheet crea sempre un "appuntamento" (kind
  // "event"); la modifica di un'attività esistente (tap su una todo) resta
  // possibile ma con lo sheet RIDOTTO a titolo/data/elimina — via più semplice
  // scelta rispetto a duplicare un secondo componente sheet dedicato.
  const isTodoEdit = mode === "edit" && form.kind === "todo";

  useEffect(() => {
    if (open) setMoreOpen(hasAdvancedData(form));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (titleError) {
      const el = titleRef.current;
      el?.focus();
      if (el) { el.classList.remove("shake"); requestAnimationFrame(() => el.classList.add("shake")); }
    }
  }, [titleError]);

  return (
    <Sheet open={open} onClose={onClose} labelledBy="event-sheet-title">
      <h2 id="event-sheet-title" className="text-[20px] font-bold mb-5 text-[var(--text-1)]">
        {mode === "create" ? "Nuovo appuntamento" : isTodoEdit ? "Modifica attività" : "Modifica"}
      </h2>
      <form onSubmit={onSubmit} className="space-y-3.5">
        <input
          ref={titleRef}
          className={`${inputCls} ${titleError ? "!border-[var(--alert)]" : ""}`}
          placeholder={isTodoEdit ? "Cosa devi fare?" : "Cosa hai in programma?"}
          value={form.title}
          onChange={(e) => { setForm(f => ({ ...f, title: e.target.value })); setTitleError(false); }}
          autoFocus
        />

        <Field label="Data">
          <input type="date" className={inputCls} value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
        </Field>

        {/* Sheet ridotto per la modifica di un'attività (§3): niente orari,
            categoria, luogo o opzioni avanzate — restano solo dell'evento. */}
        {!isTodoEdit && (
          <>
            <div className="flex gap-3">
              <div className="flex-1"><Field label="Inizio">
                <input type="time" className={inputCls} value={form.startTime} onChange={(e) => setForm(f => ({ ...f, startTime: e.target.value }))} />
              </Field></div>
              <div className="flex-1"><Field label="Fine">
                <input type="time" className={inputCls} value={form.endTime} onChange={(e) => setForm(f => ({ ...f, endTime: e.target.value }))} />
              </Field></div>
            </div>

            <CategoryPicker value={form.category} onChange={(c) => setForm(f => ({ ...f, category: c }))} />

            <input className={inputCls} placeholder="Luogo" value={form.loc} onChange={(e) => setForm(f => ({ ...f, loc: e.target.value }))} />

            <div className="border-t border-[var(--hairline)] pt-1">
              <button type="button" onClick={() => setMoreOpen(o => !o)} className="w-full flex items-center justify-between px-1 py-2 text-left touch-target">
                <span className="text-[13px] font-semibold text-[var(--text-2)] truncate pr-2">
                  {moreOpen ? "Meno opzioni" : advancedSummary(form) ? `Altre opzioni · ${advancedSummary(form)}` : "Altre opzioni (ripeti, promemoria, note)"}
                </span>
                <ChevronUpIcon className={`shrink-0 opacity-50 transition-transform duration-200 ${moreOpen ? "" : "rotate-180"}`} />
              </button>
              {moreOpen && (
                <div className="space-y-3.5 pt-2.5">
                  <div>
                    <span className="block text-[12px] text-[var(--text-2)] mb-1.5 ml-1">Ripeti</span>
                    <div className="flex flex-wrap gap-2">
                      {RECURRENCE_OPTIONS.map((o) => (
                        <Pill key={o.value || "none"} active={form.recurrence === o.value} onClick={() => setForm(f => ({ ...f, recurrence: o.value }))}>{o.label}</Pill>
                      ))}
                    </div>
                    {form.recurrence && (
                      <label className="w-full block mt-2">
                        <span className="block text-[11px] text-[var(--text-3)] mb-1 ml-1">Fino al (opzionale)</span>
                        <input type="date" value={form.recurrenceUntil} onChange={(e) => setForm(f => ({ ...f, recurrenceUntil: e.target.value }))} className={inputCls} />
                      </label>
                    )}
                  </div>
                  <div>
                    <span className="block text-[12px] text-[var(--text-2)] mb-1.5 ml-1">Promemoria</span>
                    <div className="flex flex-wrap gap-2">
                      {REMINDER_OPTIONS.map((o) => (
                        <Pill key={o.value} active={form.reminder === o.value} onClick={() => setForm(f => ({ ...f, reminder: o.value }))}>{o.label}</Pill>
                      ))}
                    </div>
                  </div>
                  <textarea
                    className={`${inputCls} resize-none`}
                    placeholder="Descrizione" rows={3} value={form.desc}
                    onChange={(e) => setForm(f => ({ ...f, desc: e.target.value }))}
                  />
                </div>
              )}
            </div>
          </>
        )}

        {mode === "create" || !onDelete ? (
          <button type="submit" className="w-full touch-target font-bold rounded-[var(--r-md)] py-4 active:scale-[0.98] text-[16px] text-white" style={{ background: "var(--flare)" }}>
            Aggiungi appuntamento
          </button>
        ) : (
          <div className="flex gap-3">
            <div className="flex-1"><HoldToConfirm label="Tieni per eliminare" doneLabel="Eliminato" onConfirm={onDelete} /></div>
            <button type="submit" className="flex-[2] touch-target py-4 rounded-[var(--r-md)] font-bold text-[16px] active:scale-[0.98] text-white" style={{ background: "var(--flare)" }}>Salva</button>
          </div>
        )}
      </form>
    </Sheet>
  );
}
