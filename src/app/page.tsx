"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  useCalendar, getWeekStart, formatTime,
  type CalendarEvent,
} from "@/store/calendar";
import { useUI } from "@/store/ui";
import { useKeyboardInset } from "@/hooks/useKeyboardInset";
import { CloseIcon } from "@/components/icons";

import TabBar, { type MainView } from "@/components/TabBar";
import AIBar from "@/components/AIBar";
import AIAssembleSheet, { type ParsedEvent } from "@/components/AIAssembleSheet";
import EventSheet, { blankForm, type EventFormValues } from "@/components/EventSheet";
import DetailSheet from "@/components/DetailSheet";
import AgendaView from "@/components/AgendaView";
import WeekView from "@/components/WeekView";
import MonthView from "@/components/MonthView";
import SettingsView from "@/components/SettingsView";

function formFromEvent(ev: CalendarEvent): EventFormValues {
  const s = new Date(ev.start_time);
  return {
    kind: ev.kind || "event",
    title: ev.title,
    loc: ev.location || "",
    desc: ev.description || "",
    category: ev.category || "",
    recurrence: ev.recurrence || "",
    recurrenceUntil: ev.recurrence_until ? new Date(ev.recurrence_until).toISOString().slice(0, 10) : "",
    reminder: ev.reminder_minutes || 0,
    date: s.toISOString().slice(0, 10),
    startTime: s.toTimeString().slice(0, 5),
    endTime: formatTime(ev.end_time || ev.start_time),
  };
}

function formFromParsed(p: ParsedEvent): EventFormValues {
  const s = new Date(p.start_time);
  return {
    kind: p.kind || "event",
    title: p.title,
    loc: p.location || "",
    desc: p.description || "",
    category: p.category || "",
    recurrence: p.recurrence || "",
    recurrenceUntil: "",
    reminder: p.reminder_minutes || 0,
    date: s.toISOString().slice(0, 10),
    startTime: s.toTimeString().slice(0, 5),
    endTime: new Date(p.end_time).toTimeString().slice(0, 5),
  };
}

export default function Home() {
  const { events, addEvent, removeEvent, updateEvent, loadEvents, toggleTodoComplete } = useCalendar();
  const {
    aiInput, aiLoading, aiResult, setAiInput, setAiLoading, setAiResult,
    detailEvent, openDetail, closeDetail, error: errorToast, setError,
  } = useUI();

  const today = useMemo(() => new Date(), []);
  const [view, setView] = useState<MainView>("agenda");
  const [agendaAnchor, setAgendaAnchor] = useState(today);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const [monthYear, setMonthYear] = useState(today.getFullYear());
  const [monthMonth, setMonthMonth] = useState(today.getMonth());

  useEffect(() => {
    loadEvents();
    import("@/lib/push").then(({ registerServiceWorker }) => registerServiceWorker());
  }, [loadEvents]);

  // ── AI bar (§11.7 assemble-in) ──
  const [aiPreview, setAiPreview] = useState<{ parsed: ParsedEvent; conflicts: { title: string }[] } | null>(null);
  const [aiCreating, setAiCreating] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);

  const handleAISubmit = async () => {
    const text = aiInput.trim(); if (!text) return;
    setAiLoading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL;
      let parsed: ParsedEvent | null = null;
      let conflicts: { title: string }[] = [];
      if (API) {
        try {
          const res = await fetch(`${API}/ai/parse`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(8000) });
          if (res.ok) { const data = await res.json(); parsed = data.event; conflicts = data.conflicts || []; }
        } catch { /* fall through to local parser */ }
      }
      if (!parsed) { const { parseLocally } = await import("@/lib/parser"); parsed = parseLocally(text) as unknown as ParsedEvent; }
      setAiPreview({ parsed, conflicts });
      setAiInput("");
    } catch {
      setAiResult({ kind: "error", text: "Non riesco a capire la frase." });
      setTimeout(() => setAiResult(null), 3000);
    }
    setAiLoading(false);
  };

  const handleVoiceToggle = useCallback(() => {
    if (voiceActive) setVoiceActive(false);
    else { setVoiceActive(true); setVoiceBusy(true); }
  }, [voiceActive]);
  const handleVoiceDone = useCallback(() => { setVoiceActive(false); setVoiceBusy(false); }, []);
  const handleVoiceParsed = useCallback((parsed: ParsedEvent, conflicts: { title: string }[]) => {
    setAiPreview({ parsed, conflicts });
  }, []);

  const handleAssembleCreate = async () => {
    if (!aiPreview) return;
    setAiCreating(true);
    try {
      const p = aiPreview.parsed;
      await addEvent({
        title: p.title, location: p.location || "", description: p.description || "",
        category: p.category || "", kind: p.kind || "event", completed: false,
        recurrence: (p.recurrence || "") as CalendarEvent["recurrence"], recurrence_until: null,
        reminder_minutes: p.reminder_minutes ?? 0, start_time: p.start_time, end_time: p.end_time, source: "ai",
      });
      setAiResult({ kind: "success", text: `"${p.title}" aggiunto` });
    } catch {
      setAiResult({ kind: "error", text: "Errore nel salvare." });
    }
    setAiCreating(false);
    setAiPreview(null);
    setTimeout(() => setAiResult(null), 3000);
  };
  const handleAssembleEdit = () => {
    if (!aiPreview) return;
    setForm(formFromParsed(aiPreview.parsed));
    setSheetMode("create"); setEditingId(undefined); setTitleError(false);
    setAiPreview(null);
    setSheetOpen(true);
  };
  const handleAssembleCancel = () => setAiPreview(null);

  // ── Event sheet (creazione manuale + modifica) ──
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState<EventFormValues>(() => blankForm());
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [titleError, setTitleError] = useState(false);

  const openCreateSheet = useCallback((date?: Date) => {
    setForm(blankForm(date)); setSheetMode("create"); setEditingId(undefined); setTitleError(false); setSheetOpen(true);
  }, []);
  const openEditSheet = useCallback((ev: CalendarEvent) => {
    const master = ev._occurrence ? (useCalendar.getState().masters.find(m => m.id === (ev.master_id ?? ev.id)) ?? ev) : ev;
    setForm(formFromEvent(master)); setSheetMode("edit"); setEditingId(master.id); setTitleError(false);
    closeDetail();
    setSheetOpen(true);
  }, [closeDetail]);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const handleEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setTitleError(true); return; }
    const isTodo = form.kind === "todo";
    const start_time = isTodo ? `${form.date}T09:00:00` : `${form.date}T${form.startTime}:00`;
    const end_time = isTodo ? `${form.date}T09:00:00` : `${form.date}T${form.endTime}:00`;
    try {
      if (sheetMode === "create") {
        await addEvent({
          title: form.title, location: form.loc, description: form.desc, category: form.category,
          kind: form.kind, completed: false,
          recurrence: (isTodo ? "" : form.recurrence) as CalendarEvent["recurrence"],
          recurrence_until: !isTodo && form.recurrence && form.recurrenceUntil ? `${form.recurrenceUntil}T23:59:00` : null,
          reminder_minutes: isTodo ? 0 : form.reminder, start_time, end_time, source: "manual",
        });
      } else if (editingId != null) {
        await updateEvent(editingId, {
          title: form.title, location: form.loc, description: form.desc, category: form.category,
          kind: form.kind,
          recurrence: (isTodo ? "" : form.recurrence) as CalendarEvent["recurrence"],
          recurrence_until: !isTodo && form.recurrence && form.recurrenceUntil ? `${form.recurrenceUntil}T23:59:00` : null,
          reminder_minutes: isTodo ? 0 : form.reminder, start_time, end_time,
        });
      }
      closeSheet();
    } catch {
      setError(sheetMode === "create" ? "Errore nel salvare." : "Errore nell'aggiornare.");
    }
  };
  const handleDeleteFromSheet = async () => {
    if (editingId == null) return;
    try { await removeEvent(editingId); closeSheet(); } catch { setError("Errore nell'eliminare."); }
  };

  // ── Detail sheet ──
  const handleDetailDelete = async () => {
    if (detailEvent?.id == null) return;
    try { await removeEvent(detailEvent.id); closeDetail(); } catch { setError("Errore nell'eliminare."); }
  };
  const handleDetailToggle = () => { if (detailEvent?.id != null) toggleTodoComplete(detailEvent.id); };

  const handleTapDayElsewhere = useCallback((d: Date) => { setAgendaAnchor(d); setView("agenda"); }, []);

  // ── Dock / AI bar visibility ──
  const anySheetOpen = sheetOpen || !!detailEvent || !!aiPreview;
  const keyboardInset = useKeyboardInset();
  const dockHidden = anySheetOpen || keyboardInset > 0;
  const aiBarBottom = keyboardInset > 0 ? keyboardInset + 12 : 104;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[var(--void)]" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="flex-1 min-h-0">
        {view === "agenda" && (
          <AgendaView
            events={events} anchorDate={agendaAnchor} onAnchorChange={setAgendaAnchor}
            onAddNew={() => openCreateSheet(agendaAnchor)} onTapEvent={openDetail} onToggleTodo={toggleTodoComplete}
          />
        )}
        {view === "week" && (
          <WeekView
            weekStart={weekStart} events={events} onWeekChange={setWeekStart}
            onAddNew={() => openCreateSheet(today)} onTapDay={handleTapDayElsewhere} onTapEvent={openDetail}
          />
        )}
        {view === "month" && (
          <MonthView
            year={monthYear} month={monthMonth} events={events}
            onMonthChange={(y, m) => { setMonthYear(y); setMonthMonth(m); }}
            onAddNew={() => openCreateSheet(today)} onTapDay={handleTapDayElsewhere} onTapEvent={openDetail}
          />
        )}
        {view === "settings" && <SettingsView />}
      </div>

      <AIBar
        value={aiInput} onChange={setAiInput} onSubmit={handleAISubmit} loading={aiLoading} aiResult={aiResult}
        voiceActive={voiceActive} voiceBusy={voiceBusy} onVoiceToggle={handleVoiceToggle} onVoiceDone={handleVoiceDone}
        onVoiceParsed={handleVoiceParsed} hidden={anySheetOpen} bottom={aiBarBottom}
      />
      <TabBar active={view} onSelect={setView} hidden={dockHidden} />

      <EventSheet
        open={sheetOpen} onClose={closeSheet} mode={sheetMode} form={form} setForm={setForm}
        onSubmit={handleEventSubmit} onDelete={sheetMode === "edit" ? handleDeleteFromSheet : undefined}
        titleError={titleError} setTitleError={setTitleError}
      />
      <DetailSheet
        event={detailEvent} onClose={closeDetail} onEdit={() => detailEvent && openEditSheet(detailEvent)}
        onDelete={handleDetailDelete} onToggleComplete={handleDetailToggle}
      />
      <AIAssembleSheet
        open={!!aiPreview} parsed={aiPreview?.parsed ?? null} conflicts={aiPreview?.conflicts ?? []}
        onCreate={handleAssembleCreate} onEdit={handleAssembleEdit} onCancel={handleAssembleCancel} creating={aiCreating}
      />

      {errorToast && (
        <div
          className="fixed left-4 right-4 z-[60] rounded-2xl px-5 py-3.5 text-[15px] font-semibold shadow-lg flex items-center justify-between enter-view text-white"
          style={{ top: "max(16px, env(safe-area-inset-top, 0px) + 8px)", background: "var(--alert)" }}
        >
          <span>{errorToast}</span>
          <button onClick={() => setError(null)} className="touch-target w-8 h-8 flex items-center justify-center text-white/80 active:scale-90"><CloseIcon /></button>
        </div>
      )}
    </div>
  );
}
