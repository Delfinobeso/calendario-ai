"use client";

import Sheet from "@/components/Sheet";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/lib/timeline";
import { formatTime, type CalendarEvent } from "@/store/calendar";

const RECURRENCE_LABELS: Record<string, string> = {
  daily: "Ogni giorno", weekly: "Ogni settimana", monthly: "Ogni mese", yearly: "Ogni anno",
};
const REMINDER_LABELS: Record<number, string> = { 10: "10 min prima", 30: "30 min prima", 60: "1 ora prima", 1440: "1 giorno prima" };

export interface ParsedEvent {
  title: string;
  location?: string;
  description?: string;
  category?: string;
  recurrence?: string;
  reminder_minutes?: number;
  kind?: "event" | "todo";
  start_time: string;
  end_time: string;
}

function Row({ i, children }: { i: number; children: React.ReactNode }) {
  return (
    <div className="reveal-num" style={{ animationDelay: `${i * 60}ms` }}>
      {children}
    </div>
  );
}

// AI assemble-in (§11.7) — la card si assembla campo per campo con stagger
// 60ms (reveal-num). QUESTA è l'app per cui il pattern è stato progettato.
export default function AIAssembleSheet({
  open, parsed, conflicts, onCreate, onEdit, onCancel, creating,
}: {
  open: boolean;
  parsed: ParsedEvent | null;
  conflicts: { title: string }[];
  onCreate: () => void;
  onEdit: () => void;
  onCancel: () => void;
  creating: boolean;
}) {
  const isTodo = parsed?.kind === "todo";

  return (
    <Sheet open={open && !!parsed} onClose={onCancel} labelledBy="ai-assemble-title">
      {parsed && (
        <>
          <p className="text-[12px] font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--flare-hi)" }}>
            {isTodo ? "Nuova attività" : "Nuovo evento"} · dall&apos;AI
          </p>
          <Row i={0}>
            <h2 id="ai-assemble-title" className="text-[20px] font-bold mb-4 text-[var(--text-1)] break-words">{parsed.title}</h2>
          </Row>

          <div className="space-y-3 mb-5">
            <Row i={1}>
              <div className="flex items-center gap-2 text-[15px] text-[var(--text-1)]">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: parsed.category ? CATEGORY_COLORS[parsed.category] : "var(--text-3)" }} />
                {isTodo ? (
                  <span>Attività senza orario · {new Date(parsed.start_time).toLocaleDateString("it", { weekday: "long", day: "numeric", month: "long" })}</span>
                ) : (
                  <span className="font-mono tabular-nums">
                    {new Date(parsed.start_time).toLocaleDateString("it", { weekday: "long", day: "numeric", month: "long" })} · {formatTime(parsed.start_time)}–{formatTime(parsed.end_time)}
                  </span>
                )}
              </div>
            </Row>

            {parsed.category && CATEGORY_LABELS[parsed.category] && (
              <Row i={2}>
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1 rounded-full"
                  style={{ background: CATEGORY_COLORS[parsed.category] + "22", color: CATEGORY_COLORS[parsed.category] }}>
                  {CATEGORY_LABELS[parsed.category]}
                </span>
              </Row>
            )}

            {parsed.location && (
              <Row i={3}><p className="text-[14px] text-[var(--text-2)]">📍 {parsed.location}</p></Row>
            )}

            {parsed.description && (
              <Row i={4}><p className="text-[13px] text-[var(--text-2)] whitespace-pre-wrap leading-relaxed">{parsed.description}</p></Row>
            )}

            {(parsed.recurrence || (parsed.reminder_minutes ?? 0) > 0) && (
              <Row i={5}>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[var(--text-2)]">
                  {parsed.recurrence && <span>↻ {RECURRENCE_LABELS[parsed.recurrence]}</span>}
                  {(parsed.reminder_minutes ?? 0) > 0 && <span>🔔 {REMINDER_LABELS[parsed.reminder_minutes!] ?? `${parsed.reminder_minutes}m prima`}</span>}
                </div>
              </Row>
            )}

            {conflicts.length > 0 && (
              <Row i={6}>
                <p className="text-[13px] font-medium flex items-center gap-1.5" style={{ color: "var(--ember)" }}>
                  ⚠ Conflitto con: {conflicts.map((c) => c.title).join(", ")}
                </p>
              </Row>
            )}
          </div>

          <div className="flex gap-3 mb-2.5">
            <button onClick={onEdit} className="flex-1 touch-target py-4 rounded-[var(--r-md)] font-bold text-[15px] active:scale-[0.98] bg-[var(--surface-1)] text-[var(--text-1)]">Modifica campi</button>
            <button onClick={onCreate} disabled={creating} className="flex-[1.4] touch-target py-4 rounded-[var(--r-md)] font-bold text-[16px] active:scale-[0.98] text-white disabled:opacity-60" style={{ background: "var(--flare)" }}>
              {creating ? "…" : "Crea"}
            </button>
          </div>
          <button onClick={onCancel} className="w-full touch-target py-3 text-[14px] font-semibold text-[var(--text-2)]">Annulla</button>
        </>
      )}
    </Sheet>
  );
}
