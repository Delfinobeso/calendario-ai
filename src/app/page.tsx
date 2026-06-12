"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  useCalendar,
  getWeekStart,
  formatTime,
  type CalendarEvent,
} from "@/store/calendar";
import { useUI } from "@/store/ui";
import { useSettings } from "@/store/settings";
import { usePinchZoom } from "@/hooks/usePinchZoom";

import YearView from "@/components/YearView";
import MonthView from "@/components/MonthView";
import WeekView from "@/components/WeekView";
import Settings from "@/components/Settings";
import DayView from "@/components/DayView";

type ZoomLevel = "year" | "month" | "week" | "day";

const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

const ZOOM_LABELS: Record<ZoomLevel, string> = {
  year: "Anno", month: "Mese", week: "Settimana", day: "Giorno",
};

function formatEventDate(ev: CalendarEvent): string {
  return new Date(ev.start_time).toLocaleDateString("it", { weekday: "long", day: "numeric", month: "long" });
}

function formatEventTimeRange(ev: CalendarEvent): string {
  const start = formatTime(ev.start_time);
  const end = formatTime(ev.end_time);
  if (ev.start_time === ev.end_time || start === end) return start;
  return `${start} – ${end}`;
}

// Round time up to nearest 30min, returns "HH:MM"
function roundUp30(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  if (now.getMinutes() < 30) now.setMinutes(30);
  else { now.setMinutes(0); now.setHours(now.getHours() + 1); }
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function addHour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(2026, 0, 1, h, m);
  d.setHours(d.getHours() + 1);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── Shared form initial values ──
function blankForm() {
  return {
    title: "", loc: "", desc: "",
    date: new Date().toISOString().slice(0, 10),
    startTime: roundUp30(),
    endTime: addHour(roundUp30()),
  };
}

function formFromEvent(ev: CalendarEvent) {
  const s = new Date(ev.start_time);
  return {
    title: ev.title,
    loc: ev.location || "",
    desc: ev.description || "",
    date: s.toISOString().slice(0, 10),
    startTime: s.toTimeString().slice(0, 5),
    endTime: formatTime(ev.end_time || ev.start_time),
  };
}

export default function Home() {
  const { events, addEvent, removeEvent, loadEvents, updateEvent } = useCalendar();
  const {
    aiInput, aiLoading, aiResult,
    setAiInput, setAiLoading, setAiResult,
    sheetOpen, openSheet, closeSheet,
    editEvent, openEdit, closeEdit,
    detailEvent, openDetail, closeDetail,
    setError,
  } = useUI();

  const today = new Date();
  const currentWeekStart = getWeekStart(today);

  const [zoom, setZoom] = useState<ZoomLevel>("week");
  const [focusDate, setFocusDate] = useState(today);
  const [swipeDir, setSwipeDir] = useState(0);

  const focusYear = focusDate.getFullYear();
  const focusMonth = focusDate.getMonth();
  const focusWeekStart = useMemo(() => getWeekStart(focusDate), [focusDate]);

  const zoomOut = useCallback(() => {
    setSwipeDir(0);
    setZoom((z) => {
      switch (z) {
        case "day": return "week";
        case "week": return "month";
        case "month": return "year";
        default: return "year";
      }
    });
  }, []);

  const zoomToDay = useCallback((d: Date) => { setSwipeDir(0); setFocusDate(d); setZoom("day"); }, []);
  const zoomToMonth = useCallback((m: number) => { setSwipeDir(0); setFocusDate(new Date(focusYear, m, 1)); setZoom("month"); }, [focusYear]);

  const goNext = useCallback(() => {
    setSwipeDir(-1);
    const d = new Date(focusDate);
    switch (zoom) {
      case "day": d.setDate(d.getDate() + 1); break;
      case "week": d.setDate(d.getDate() + 7); break;
      case "month": d.setMonth(d.getMonth() + 1); break;
      case "year": d.setFullYear(d.getFullYear() + 1); break;
    }
    setFocusDate(d);
  }, [zoom, focusDate]);

  const goPrev = useCallback(() => {
    setSwipeDir(1);
    const d = new Date(focusDate);
    switch (zoom) {
      case "day": d.setDate(d.getDate() - 1); break;
      case "week": d.setDate(d.getDate() - 7); break;
      case "month": d.setMonth(d.getMonth() - 1); break;
      case "year": d.setFullYear(d.getFullYear() - 1); break;
    }
    setFocusDate(d);
  }, [zoom, focusDate]);

  const jumpToToday = useCallback(() => { setSwipeDir(0); setFocusDate(new Date()); setZoom("week"); }, []);

  const pinch = usePinchZoom(zoomOut, 0.6);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const syncProfile = useSettings((s) => s.syncProfileFromBackend);
  useEffect(() => { syncProfile(); }, [syncProfile]);

  const headerLabel = useMemo(() => {
    switch (zoom) {
      case "year": return String(focusYear);
      case "month": return `${MONTHS_IT[focusMonth]} ${focusYear}`;
      case "week": {
        const end = new Date(focusWeekStart);
        end.setDate(end.getDate() + 6);
        if (focusWeekStart.getMonth() === end.getMonth())
          return `${MONTHS_IT[focusWeekStart.getMonth()]} ${focusWeekStart.getFullYear()}`;
        return `${focusWeekStart.getDate()} ${MONTHS_IT[focusWeekStart.getMonth()]} – ${end.getDate()} ${MONTHS_IT[end.getMonth()]}`;
      }
      case "day":
        return focusDate.toLocaleDateString("it", { weekday: "long", day: "numeric", month: "long" });
    }
  }, [zoom, focusYear, focusMonth, focusWeekStart, focusDate]);

  const isCurrentWeek = zoom === "week" && focusWeekStart.toDateString() === currentWeekStart.toDateString();
  const isCurrentMonth = zoom === "month" && focusMonth === today.getMonth() && focusYear === today.getFullYear();
  const isCurrentYear = zoom === "year" && focusYear === today.getFullYear();
  const showToday = (zoom === "week" && !isCurrentWeek) || (zoom === "month" && !isCurrentMonth) || (zoom === "year" && !isCurrentYear);

  // ── Form state (single source, shared across sheets) ──
  const [form, setForm] = useState(blankForm);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Reset form helpers
  const resetForm = useCallback(() => setForm(blankForm()), []);
  const closeAndResetSheet = useCallback(() => { resetForm(); closeSheet(); }, [resetForm, closeSheet]);
  const closeAndResetEdit = useCallback(() => { setConfirmDelete(false); resetForm(); closeEdit(); }, [resetForm, closeEdit]);

  const handleOpenNewEvent = () => {
    resetForm();
    openSheet();
  };

  // ── AI submit → backend /ai/parse ──
  const handleAISubmit = async () => {
    const text = aiInput.trim();
    if (!text) return;
    setAiLoading(true); setAiResult(null);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL;
      let parsed: { title: string; location?: string; description?: string; start_time: string; end_time: string } | null = null;

      if (API) {
        try {
          const res = await fetch(`${API}/ai/parse`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
            signal: AbortSignal.timeout(8000),
          });
          if (res.ok) parsed = await res.json();
        } catch { /* fallthrough to local */ }
      }
      if (!parsed) {
        // Local fallback
        const { parseLocally } = await import("@/lib/parser");
        parsed = parseLocally(text);
      }

      await addEvent({
        title: parsed.title,
        location: parsed.location || "",
        description: parsed.description || "",
        start_time: parsed.start_time,
        end_time: parsed.end_time,
        source: "ai",
      });
      setAiResult(`✅ "${parsed.title}" aggiunto`);
      setAiInput("");
    } catch {
      setAiResult("❌ Non riesco a capire la data. Prova: 'domani alle 15 riunione'");
    }
    setAiLoading(false);
    setTimeout(() => setAiResult(null), 3000);
  };

  // ── New event submit ──
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.date || !form.startTime) return;
    try {
      await addEvent({
        title: form.title, location: form.loc, description: form.desc,
        start_time: `${form.date}T${form.startTime}:00`,
        end_time: `${form.date}T${form.endTime}:00`,
        source: "manual",
      });
      closeAndResetSheet();
    } catch {
      setError("Errore nel salvare l'evento. Riprova.");
    }
  };

  // ── Edit submit ──
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEvent?.id || !form.title || !form.date || !form.startTime) return;
    try {
      await updateEvent(editEvent.id, {
        title: form.title,
        location: form.loc,
        description: form.desc,
        start_time: `${form.date}T${form.startTime}:00`,
        end_time: `${form.date}T${form.endTime}:00`,
      });
      closeAndResetEdit();
    } catch {
      setError("Errore nell'aggiornare l'evento.");
    }
  };

  const handleDelete = async () => {
    if (!editEvent?.id) return;
    try {
      await removeEvent(editEvent.id);
      setConfirmDelete(false);
      closeAndResetEdit();
    } catch {
      setError("Errore nell'eliminare l'evento.");
    }
  };

  const handleOpenEdit = useCallback((ev: CalendarEvent) => {
    setForm(formFromEvent(ev));
    setConfirmDelete(false);
    openEdit(ev);
  }, [openEdit]);

  const handleOpenEditFromDetail = useCallback(() => {
    if (!detailEvent) return;
    closeDetail();
    handleOpenEdit(detailEvent);
  }, [detailEvent, closeDetail, handleOpenEdit]);

  // ── Error toast ──
  const errorToast = useUI((s) => s.error);
  const clearError = useCallback(() => setError(null), [setError]);

  // Sheet animation (always tween, no spring)
  const sheetTransition = { type: "tween" as const, duration: 0.25, ease: [0.22, 0.61, 0.36, 1] as const };

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden bg-[var(--color-surface)]"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      {...pinch}
    >
      {/* ── Header ── */}
      <header className="shrink-0 px-5 pt-1 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-extrabold text-[var(--color-text-primary)] tracking-tight leading-tight">Calendario</h1>
            <p className="text-[12px] text-[var(--color-text-secondary)] mt-0.5 capitalize">{headerLabel}</p>
          </div>
          <div className="flex items-center gap-1">
            {showToday && (
              <button onClick={jumpToToday} className="touch-target text-[13px] font-semibold text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-4 py-2 rounded-full active:scale-95 transition-transform">
                Oggi
              </button>
            )}
            <Settings />
          </div>
        </div>
      </header>

      {/* ── AI Input (Fantastical-style natural language) ── */}
      <div className="shrink-0 px-5 pb-2">
        <div className="flex gap-2 bg-[var(--color-surface-secondary)] rounded-2xl p-1 items-center border border-transparent focus-within:border-[var(--color-accent)]/40 transition-all duration-200">
          <span className="pl-3 text-base">✨</span>
          <input
            className="flex-1 bg-transparent py-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none text-[16px]"
            placeholder="es. domani alle 15 riunione con Marco"
            value={aiInput} onChange={(e) => setAiInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAISubmit()} enterKeyHint="go"
          />
          <button onClick={handleAISubmit} disabled={aiLoading || !aiInput.trim()}
            className="touch-target px-5 py-2.5 bg-[var(--color-accent)] text-black font-semibold rounded-xl text-[15px] disabled:opacity-30 transition-opacity shrink-0 active:scale-95">
            {aiLoading ? "···" : "Aggiungi"}
          </button>
        </div>
        <AnimatePresence>
          {aiResult && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`text-xs mt-1.5 text-center font-medium ${aiResult.startsWith("✅") ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
              {aiResult}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ── Zoom view ── */}
      <div className="flex-1 min-h-0 overflow-hidden gpu-layer" style={{ paddingBottom: 72 }}>
        <AnimatePresence mode="wait" custom={swipeDir}>
          {zoom === "year" && (
            <YearView
              key={`year-${focusYear}`} year={focusYear} events={events} direction={swipeDir}
              onTapMonth={zoomToMonth} onSwipeDown={goPrev} onSwipeUp={goNext}
            />
          )}
          {zoom === "month" && (
            <MonthView key={`month-${focusYear}-${focusMonth}`} year={focusYear} month={focusMonth} events={events} direction={swipeDir}
              onTapDay={zoomToDay} onTapEvent={openDetail} onSwipeDown={goPrev} onSwipeUp={goNext} />
          )}
          {zoom === "week" && (
            <WeekView key={`w-${focusWeekStart.getTime()}`} weekStart={focusWeekStart} events={events} direction={swipeDir}
              onTapDay={zoomToDay} onTapEvent={openDetail} onSwipeLeft={goNext} onSwipeRight={goPrev} />
          )}
          {zoom === "day" && (
            <DayView key={`d-${focusDate.getTime()}`} date={focusDate} events={events} direction={swipeDir}
              onTapEvent={openDetail} onSwipeLeft={goNext} onSwipeRight={goPrev} />
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom bar (fixed over content) ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 px-4 pt-2 bg-[var(--color-surface)] border-t border-[var(--color-surface-tertiary)]/20"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex gap-3 items-stretch">
          {zoom !== "year" && (
            <button onClick={zoomOut} className="touch-target py-2.5 px-4 bg-[var(--color-surface-secondary)] rounded-2xl text-[var(--color-text-secondary)] text-[15px] font-semibold active:scale-[0.97] transition-transform flex items-center justify-center gap-1.5">
              <span className="text-base">🤏</span>
              {ZOOM_LABELS[zoom === "day" ? "week" : zoom === "week" ? "month" : "year"]}
            </button>
          )}
          <button onClick={handleOpenNewEvent}
            className="flex-1 touch-target py-2.5 bg-[var(--color-accent)] text-black rounded-2xl font-bold text-[16px] active:scale-[0.97] transition-transform flex items-center justify-center gap-2">
            <span className="text-lg leading-none">+</span> Nuovo evento
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════
          SHEETS (all tween, no spring)
          ═══════════════════════════════════════ */}

      {/* ── New Event Sheet ── */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 sheet-blur z-40" onClick={closeAndResetSheet} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={sheetTransition}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface)] rounded-t-[22px] px-6 pt-6 pb-safe max-h-[90vh] overflow-y-auto border-t border-[var(--color-surface-tertiary)]/30">
              <div className="w-10 h-1 bg-[var(--color-text-tertiary)]/25 rounded-full mx-auto mb-6" />
              <h2 className="text-[20px] font-bold mb-5">Nuovo evento</h2>
              <form onSubmit={handleFormSubmit} className="space-y-3.5">
                <input className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none focus:ring-2 ring-[var(--color-accent)]/50 transition-shadow text-[16px]"
                  placeholder="Titolo evento" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} autoFocus />
                <input className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none text-[16px]"
                  placeholder="Luogo (opzionale)" value={form.loc} onChange={(e) => setForm((f) => ({ ...f, loc: e.target.value }))} />
                <div className="flex gap-3">
                  <label className="flex-1 block">
                    <span className="block text-[12px] text-[var(--color-text-secondary)] mb-1.5 ml-1">Data</span>
                    <input type="date" className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] outline-none text-[16px]"
                      value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                  </label>
                </div>
                <div className="flex gap-3">
                  <label className="flex-1 block">
                    <span className="block text-[12px] text-[var(--color-text-secondary)] mb-1.5 ml-1">Inizio</span>
                    <input type="time" className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] outline-none text-[16px]"
                      value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
                  </label>
                  <label className="flex-1 block">
                    <span className="block text-[12px] text-[var(--color-text-secondary)] mb-1.5 ml-1">Fine</span>
                    <input type="time" className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] outline-none text-[16px]"
                      value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
                  </label>
                </div>
                <textarea className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none focus:ring-2 ring-[var(--color-accent)]/50 transition-shadow text-[16px] resize-none"
                  placeholder="Descrizione (opzionale)" rows={3} value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))} />
                <button type="submit" className="w-full touch-target bg-[var(--color-accent)] text-black font-bold rounded-xl py-4 active:scale-[0.98] transition-transform text-[16px]">
                  Aggiungi evento
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Edit Event Sheet ── */}
      <AnimatePresence>
        {editEvent && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 sheet-blur z-40" onClick={closeAndResetEdit} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={sheetTransition}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface)] rounded-t-[22px] px-6 pt-6 pb-safe max-h-[90vh] overflow-y-auto border-t border-[var(--color-surface-tertiary)]/30">
              <div className="w-10 h-1 bg-[var(--color-text-tertiary)]/25 rounded-full mx-auto mb-6" />
              <h2 className="text-[20px] font-bold mb-5">Modifica evento</h2>
              <form onSubmit={handleUpdate} className="space-y-3.5">
                <input className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none focus:ring-2 ring-[var(--color-accent)]/50 transition-shadow text-[16px]"
                  placeholder="Titolo evento" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} autoFocus />
                <input className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none text-[16px]"
                  placeholder="Luogo (opzionale)" value={form.loc} onChange={(e) => setForm((f) => ({ ...f, loc: e.target.value }))} />
                <div className="flex gap-3">
                  <label className="flex-1 block">
                    <span className="block text-[12px] text-[var(--color-text-secondary)] mb-1.5 ml-1">Data</span>
                    <input type="date" className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] outline-none text-[16px]"
                      value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                  </label>
                </div>
                <div className="flex gap-3">
                  <label className="flex-1 block">
                    <span className="block text-[12px] text-[var(--color-text-secondary)] mb-1.5 ml-1">Inizio</span>
                    <input type="time" className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] outline-none text-[16px]"
                      value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
                  </label>
                  <label className="flex-1 block">
                    <span className="block text-[12px] text-[var(--color-text-secondary)] mb-1.5 ml-1">Fine</span>
                    <input type="time" className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] outline-none text-[16px]"
                      value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
                  </label>
                </div>
                <textarea className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none focus:ring-2 ring-[var(--color-accent)]/50 transition-shadow text-[16px] resize-none"
                  placeholder="Descrizione (opzionale)" rows={3} value={form.desc} onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))} />
                {!confirmDelete ? (
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setConfirmDelete(true)}
                      className="flex-1 touch-target py-4 bg-[var(--color-danger)] text-white rounded-xl font-bold text-[16px] active:scale-[0.98] transition-transform">
                      Elimina
                    </button>
                    <button type="submit"
                      className="flex-[2] touch-target py-4 bg-[var(--color-accent)] text-black rounded-xl font-bold text-[16px] active:scale-[0.98] transition-transform">
                      Salva
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-[13px] text-[var(--color-text-secondary)] text-center">Eliminare definitivamente questo evento?</p>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setConfirmDelete(false)}
                        className="flex-1 touch-target py-4 bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] rounded-xl font-bold text-[16px] active:scale-[0.98] transition-transform">
                        Annulla
                      </button>
                      <button type="button" onClick={handleDelete}
                        className="flex-1 touch-target py-4 bg-[var(--color-danger)] text-white rounded-xl font-bold text-[16px] active:scale-[0.98] transition-transform">
                        Conferma
                      </button>
                    </div>
                  </div>
                )}
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Detail Sheet ── */}
      <AnimatePresence>
        {detailEvent && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 sheet-blur z-40" onClick={closeDetail} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={sheetTransition}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface)] rounded-t-[22px] px-6 pt-6 pb-safe max-h-[85vh] overflow-y-auto border-t border-[var(--color-surface-tertiary)]/30">
              <div className="w-10 h-1 bg-[var(--color-text-tertiary)]/25 rounded-full mx-auto mb-6" />
              <h2 className="text-[20px] font-bold mb-1 break-words">{detailEvent.title}</h2>
              <p className="text-[14px] text-[var(--color-accent)] font-semibold capitalize mb-0.5">{formatEventDate(detailEvent)}</p>
              <p className="text-[14px] text-[var(--color-text-secondary)] mb-5">{formatEventTimeRange(detailEvent)}</p>

              {detailEvent.location && (
                <div className="mb-5">
                  <div className="flex items-start gap-2 text-[var(--color-text-primary)] text-[15px] mb-2.5">
                    <span className="text-base leading-tight">📍</span>
                    <span className="flex-1 break-words leading-tight">{detailEvent.location}</span>
                  </div>
                  <div className="flex gap-3">
                    <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailEvent.location)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex-1 touch-target flex items-center justify-center gap-1.5 bg-[var(--color-surface-secondary)] rounded-xl py-3 text-[14px] font-semibold text-[var(--color-text-primary)] active:scale-[0.98] transition-transform">
                      🗺️ Maps
                    </a>
                    <a href={`https://waze.com/ul?q=${encodeURIComponent(detailEvent.location)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex-1 touch-target flex items-center justify-center gap-1.5 bg-[var(--color-surface-secondary)] rounded-xl py-3 text-[14px] font-semibold text-[var(--color-text-primary)] active:scale-[0.98] transition-transform">
                      🧭 Waze
                    </a>
                  </div>
                </div>
              )}

              {detailEvent.description && (
                <div className="mb-6">
                  <span className="block text-[12px] text-[var(--color-text-secondary)] mb-1.5 ml-1">Descrizione</span>
                  <p className="text-[15px] text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">{detailEvent.description}</p>
                </div>
              )}

              <button onClick={handleOpenEditFromDetail}
                className="w-full touch-target bg-[var(--color-accent)] text-black font-bold rounded-xl py-4 active:scale-[0.98] transition-transform text-[16px] mb-2">
                Modifica
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Error toast ── */}
      <AnimatePresence>
        {errorToast && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed top-4 left-4 right-4 z-60 bg-[var(--color-danger)] text-white rounded-2xl px-5 py-3.5 text-[15px] font-semibold shadow-lg flex items-center justify-between"
            style={{ top: "max(16px, env(safe-area-inset-top, 0px) + 8px)" }}>
            <span>{errorToast}</span>
            <button onClick={clearError} className="touch-target w-8 h-8 flex items-center justify-center text-white/80 active:scale-90 transition-transform">✕</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
