"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
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

import { SwipeCarousel } from "@/components/SwipeCarousel";
import YearView from "@/components/YearView";
import MonthView from "@/components/MonthView";
import WeekView from "@/components/WeekView";
import Settings from "@/components/Settings";
import DayView from "@/components/DayView";
import VoiceInput from "@/components/VoiceInput";

type ZoomLevel = "year" | "month" | "week" | "day";

const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

function formatEventDate(ev: CalendarEvent): string {
  return new Date(ev.start_time).toLocaleDateString("it", { weekday: "long", day: "numeric", month: "long" });
}

function formatEventTimeRange(ev: CalendarEvent): string {
  const s = formatTime(ev.start_time);
  const e = formatTime(ev.end_time);
  return s === e ? s : `${s} – ${e}`;
}

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

function blankForm() {
  return { title: "", loc: "", desc: "", date: new Date().toISOString().slice(0, 10), startTime: roundUp30(), endTime: addHour(roundUp30()) };
}
function formFromEvent(ev: CalendarEvent) {
  const s = new Date(ev.start_time);
  return { title: ev.title, loc: ev.location || "", desc: ev.description || "", date: s.toISOString().slice(0, 10), startTime: s.toTimeString().slice(0, 5), endTime: formatTime(ev.end_time || ev.start_time) };
}

// ── Helpers for date math ──
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function addWeeks(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n * 7); return r; }
function addMonths(d: Date, n: number): Date { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; }

// ── AI bar icons ──
function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="6" y="1.5" width="4" height="7.5" rx="2" fill="currentColor" />
      <path d="M3.5 7.5a4.5 4.5 0 0 0 9 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M8 12v2.5M5.5 14.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 13V3M8 3l-4 4M8 3l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SparkleIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={className} aria-hidden="true">
      <path d="M6.5 1c.35 2.3 1.4 3.35 3.7 3.7-2.3.35-3.35 1.4-3.7 3.7-.35-2.3-1.4-3.35-3.7-3.7C5.1 4.35 6.15 3.3 6.5 1z" fill="currentColor" />
      <path d="M12 7.5c.2 1.3.85 1.95 2.15 2.15-1.3.2-1.95.85-2.15 2.15-.2-1.3-.85-1.95-2.15-2.15 1.3-.2 1.95-.85 2.15-2.15z" fill="currentColor" opacity="0.55" />
    </svg>
  );
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

  const [zoom, setZoom] = useState<ZoomLevel>("week");
  const [focusDate, setFocusDate] = useState(today);
  const [swipeKey, setSwipeKey] = useState(0); // force re-mount carousel on window shift

  // Voice input via waveform toggle
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceBusy, setVoiceBusy] = useState(false);

  const handleVoiceToggle = useCallback(() => {
    if (voiceActive) {
      // Stop recording — VoiceInput's active effect will handle it
      setVoiceActive(false);
      // voiceBusy stays true until onDone
    } else {
      setVoiceActive(true);
      setVoiceBusy(true);
    }
  }, [voiceActive]);

  const handleVoiceDone = useCallback(() => {
    setVoiceActive(false);
    setVoiceBusy(false);
  }, []);

  const focusYear = focusDate.getFullYear();
  const focusMonth = focusDate.getMonth();
  const focusWeekStart = useMemo(() => getWeekStart(focusDate), [focusDate]);

  // ── Pre-compute adjacent views ──
  const prevWeekStart = useMemo(() => getWeekStart(addWeeks(focusWeekStart, -1)), [focusWeekStart]);
  const nextWeekStart = useMemo(() => getWeekStart(addWeeks(focusWeekStart, 1)), [focusWeekStart]);
  const prevDay = useMemo(() => addDays(focusDate, -1), [focusDate]);
  const nextDay = useMemo(() => addDays(focusDate, 1), [focusDate]);
  const prevMonth = useMemo(() => (focusMonth === 0 ? 11 : focusMonth - 1), [focusMonth]);
  const nextMonth = useMemo(() => (focusMonth === 11 ? 0 : focusMonth + 1), [focusMonth]);
  const prevMonthYear = focusMonth === 0 ? focusYear - 1 : focusYear;
  const nextMonthYear = focusMonth === 11 ? focusYear + 1 : focusYear;

  // ── Swipe handlers (shift window after snap) ──
  const goNextWeek = useCallback(() => {
    setFocusDate(d => addWeeks(d, 1));
    setSwipeKey(k => k + 1);
  }, []);
  const goPrevWeek = useCallback(() => {
    setFocusDate(d => addWeeks(d, -1));
    setSwipeKey(k => k + 1);
  }, []);
  const goNextDay = useCallback(() => {
    setFocusDate(d => addDays(d, 1));
    setSwipeKey(k => k + 1);
  }, []);
  const goPrevDay = useCallback(() => {
    setFocusDate(d => addDays(d, -1));
    setSwipeKey(k => k + 1);
  }, []);
  const goNextMonth = useCallback(() => {
    setFocusDate(d => addMonths(d, 1));
    setSwipeKey(k => k + 1);
  }, []);
  const goPrevMonth = useCallback(() => {
    setFocusDate(d => addMonths(d, -1));
    setSwipeKey(k => k + 1);
  }, []);
  const goNextYear = useCallback(() => {
    setFocusDate(d => { d.setFullYear(d.getFullYear() + 1); return new Date(d); });
    setSwipeKey(k => k + 1);
  }, []);
  const goPrevYear = useCallback(() => {
    setFocusDate(d => { d.setFullYear(d.getFullYear() - 1); return new Date(d); });
    setSwipeKey(k => k + 1);
  }, []);

  const zoomOut = useCallback(() => {
    setZoom(z => z === "day" ? "week" : z === "week" ? "month" : z === "month" ? "year" : "year");
  }, []);
  const zoomToDay = useCallback((d: Date) => { setFocusDate(d); setZoom("day"); }, []);
  const zoomToMonth = useCallback((m: number) => { setFocusDate(new Date(focusYear, m, 1)); setZoom("month"); }, [focusYear]);
  const jumpToToday = useCallback(() => { setFocusDate(new Date()); setZoom("week"); setSwipeKey(k => k + 1); }, []);

  const pinch = usePinchZoom(zoomOut, 0.6);
  useEffect(() => { loadEvents(); }, [loadEvents]);
  // Profile persists via localStorage (Zustand persist) — no auto-sync from backend
  // Backend sync happens only on explicit save (Settings sheet)

  const headerLabel = useMemo(() => {
    switch (zoom) {
      case "year": return String(focusYear);
      case "month": return `${MONTHS_IT[focusMonth]} ${focusYear}`;
      case "week": {
        const end = new Date(focusWeekStart); end.setDate(end.getDate() + 6);
        if (focusWeekStart.getMonth() === end.getMonth()) return `${MONTHS_IT[focusWeekStart.getMonth()]} ${focusWeekStart.getFullYear()}`;
        return `${focusWeekStart.getDate()} ${MONTHS_IT[focusWeekStart.getMonth()]} – ${end.getDate()} ${MONTHS_IT[end.getMonth()]}`;
      }
      case "day": return focusDate.toLocaleDateString("it", { weekday: "long", day: "numeric", month: "long" });
    }
  }, [zoom, focusYear, focusMonth, focusWeekStart, focusDate]);

  const isCurrentWeek = zoom === "week" && focusWeekStart.toDateString() === getWeekStart(today).toDateString();
  const isCurrentMonth = zoom === "month" && focusMonth === today.getMonth() && focusYear === today.getFullYear();
  const isCurrentYear = zoom === "year" && focusYear === today.getFullYear();
  const showToday = (zoom === "week" && !isCurrentWeek) || (zoom === "month" && !isCurrentMonth) || (zoom === "year" && !isCurrentYear);

  // ── Form state ──
  const [form, setForm] = useState(blankForm);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const resetForm = useCallback(() => setForm(blankForm()), []);
  const closeAndResetSheet = useCallback(() => { resetForm(); closeSheet(); }, [resetForm, closeSheet]);
  const closeAndResetEdit = useCallback(() => { setConfirmDelete(false); resetForm(); closeEdit(); }, [resetForm, closeEdit]);
  const handleOpenNewEvent = () => { resetForm(); openSheet(); };

  // ── AI submit ──
  const handleAISubmit = async () => {
    const text = aiInput.trim(); if (!text) return;
    setAiLoading(true); setAiResult(null);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL;
      let parsed: any = null;
      if (API) {
        try {
          const res = await fetch(`${API}/ai/parse`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(8000) });
          if (res.ok) { const data = await res.json(); parsed = data.event;
            if (data.conflicts?.length) setAiResult(`⚠️ Conflitto con: ${data.conflicts.map((c: any) => c.title).join(", ")}. Aggiunto comunque.`);
          }
        } catch {}
      }
      if (!parsed) { const { parseLocally } = await import("@/lib/parser"); parsed = parseLocally(text); }
      await addEvent({ title: parsed.title, location: parsed.location || "", description: parsed.description || "", start_time: parsed.start_time, end_time: parsed.end_time, source: "ai" });
      if (!aiResult) setAiResult(`✅ "${parsed.title}" aggiunto`);
      setAiInput("");
    } catch { setAiResult("❌ Non riesco a capire la data."); }
    setAiLoading(false); setTimeout(() => setAiResult(null), 3000);
  };

  const handleFormSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!form.title || !form.date || !form.startTime) return;
    try { await addEvent({ title: form.title, location: form.loc, description: form.desc, start_time: `${form.date}T${form.startTime}:00`, end_time: `${form.date}T${form.endTime}:00`, source: "manual" }); closeAndResetSheet(); }
    catch { setError("Errore nel salvare l'evento."); } };
  const handleUpdate = async (e: React.FormEvent) => { e.preventDefault(); if (!editEvent?.id || !form.title || !form.date || !form.startTime) return;
    try { await updateEvent(editEvent.id, { title: form.title, location: form.loc, description: form.desc, start_time: `${form.date}T${form.startTime}:00`, end_time: `${form.date}T${form.endTime}:00` }); closeAndResetEdit(); }
    catch { setError("Errore nell'aggiornare."); } };
  const handleDelete = async () => { if (!editEvent?.id) return;
    try { await removeEvent(editEvent.id); setConfirmDelete(false); closeAndResetEdit(); } catch { setError("Errore nell'eliminare."); } };
  const handleOpenEdit = useCallback((ev: CalendarEvent) => { setForm(formFromEvent(ev)); setConfirmDelete(false); openEdit(ev); }, [openEdit]);
  const handleOpenEditFromDetail = useCallback(() => { if (!detailEvent) return; closeDetail(); handleOpenEdit(detailEvent); }, [detailEvent, closeDetail, handleOpenEdit]);

  const errorToast = useUI((s) => s.error);
  const clearError = useCallback(() => setError(null), [setError]);
  const sheetTransition = { type: "tween" as const, duration: 0.25, ease: [0.22, 0.61, 0.36, 1] as const };

  const hasText = aiInput.trim().length > 0;
  const showTrailingButton = !(voiceBusy && !voiceActive);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-[var(--color-surface)]"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }} {...pinch}>
      {/* Header */}
      <header className="shrink-0 px-5 pt-1 pb-1.5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-extrabold text-[var(--color-text-primary)] tracking-tight leading-tight">Calendario</h1>
            <p className="text-[11px] text-[var(--color-text-secondary)] mt-0.5 capitalize">{headerLabel}</p>
          </div>
          <div className="flex items-center gap-1">
            {showToday && <button onClick={jumpToToday} className="touch-target text-[13px] font-semibold text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-4 py-2 rounded-full active:scale-95">Oggi</button>}
            <Settings />
          </div>
        </div>
      </header>

      {/* AI Input */}
      <div className="shrink-0 px-4 pb-2">
        <div className={`flex items-center gap-1.5 bg-[var(--color-surface-secondary)] rounded-full px-1.5 py-1.5 border transition-colors duration-200 min-w-0 ${
          voiceActive ? "border-[var(--color-danger)]/40" : "border-transparent focus-within:border-[var(--color-accent)]/40"
        }`}>
          {voiceBusy ? (
            <VoiceInput active={voiceActive} onDone={handleVoiceDone} />
          ) : (
            <>
              <span className="touch-target w-9 h-9 flex items-center justify-center shrink-0 text-[var(--color-text-secondary)]">
                <SparkleIcon />
              </span>
              <input
                className="flex-1 bg-transparent py-2.5 px-1.5 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none text-[15px] min-w-0"
                placeholder="Scrivi un evento..."
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAISubmit()}
                enterKeyHint="go"
              />
            </>
          )}
          {showTrailingButton && (
            <button
              onClick={voiceActive || !hasText ? handleVoiceToggle : handleAISubmit}
              disabled={aiLoading}
              className={`touch-target w-9 h-9 flex items-center justify-center rounded-full shrink-0 active:scale-90 transition-colors duration-200 ${
                voiceActive
                  ? "bg-[var(--color-danger)] text-white"
                  : hasText
                  ? "bg-[var(--color-accent)] text-black"
                  : "text-[var(--color-text-secondary)]"
              }`}
              aria-label={voiceActive ? "Ferma registrazione" : hasText ? "Aggiungi evento" : "Registra audio"}
            >
              {aiLoading ? (
                <span className="w-3.5 h-3.5 rounded-full border-2 border-black/30 border-t-transparent animate-spin" />
              ) : voiceActive ? (
                <span className="block w-3 h-3 rounded-[2px] bg-white" />
              ) : hasText ? (
                <SendIcon />
              ) : (
                <MicIcon />
              )}
            </button>
          )}
        </div>
        <AnimatePresence>
          {aiResult && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`text-[11px] mt-1 text-center font-medium ${
                aiResult.startsWith("✅") || aiResult.startsWith("🎙️")
                  ? "text-[var(--color-success)]"
                  : aiResult.startsWith("⚠")
                  ? "text-yellow-400"
                  : "text-[var(--color-danger)]"
              }`}
            >
              {aiResult}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ── Main view area ── */}
      <div className="flex-1 min-h-0" style={{ paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}>
        {zoom === "year" && (
          <SwipeCarousel key={`y-${focusYear}-${swipeKey}`} onSwipeLeft={goNextYear} onSwipeRight={goPrevYear} keyId={`y-${focusYear}`}>
            <YearView year={focusYear - 1} events={events} direction={0} onTapMonth={(m) => zoomToMonth(m)} onSwipeDown={() => {}} onSwipeUp={() => {}} />
            <YearView year={focusYear} events={events} direction={0} onTapMonth={zoomToMonth} onSwipeDown={() => {}} onSwipeUp={() => {}} />
            <YearView year={focusYear + 1} events={events} direction={0} onTapMonth={(m) => zoomToMonth(m)} onSwipeDown={() => {}} onSwipeUp={() => {}} />
          </SwipeCarousel>
        )}
        {zoom === "month" && (
          <SwipeCarousel key={`m-${focusYear}-${focusMonth}-${swipeKey}`} onSwipeLeft={goNextMonth} onSwipeRight={goPrevMonth} keyId={`m-${focusYear}-${focusMonth}`}>
            <MonthView year={prevMonthYear} month={prevMonth} events={events} direction={0} onTapDay={zoomToDay} onTapEvent={openDetail} onSwipeDown={() => {}} onSwipeUp={() => {}} />
            <MonthView year={focusYear} month={focusMonth} events={events} direction={0} onTapDay={zoomToDay} onTapEvent={openDetail} onSwipeDown={() => {}} onSwipeUp={() => {}} />
            <MonthView year={nextMonthYear} month={nextMonth} events={events} direction={0} onTapDay={zoomToDay} onTapEvent={openDetail} onSwipeDown={() => {}} onSwipeUp={() => {}} />
          </SwipeCarousel>
        )}
        {zoom === "week" && (
          <SwipeCarousel key={`w-${swipeKey}`} onSwipeLeft={goNextWeek} onSwipeRight={goPrevWeek} keyId={`w-${focusWeekStart.getTime()}`}>
            <WeekView weekStart={prevWeekStart} events={events} onTapDay={zoomToDay} onTapEvent={openDetail} />
            <WeekView weekStart={focusWeekStart} events={events} onTapDay={zoomToDay} onTapEvent={openDetail} />
            <WeekView weekStart={nextWeekStart} events={events} onTapDay={zoomToDay} onTapEvent={openDetail} />
          </SwipeCarousel>
        )}
        {zoom === "day" && (
          <SwipeCarousel key={`d-${swipeKey}`} onSwipeLeft={goNextDay} onSwipeRight={goPrevDay} keyId={`d-${focusDate.getTime()}`}>
            <DayView date={prevDay} events={events} onTapEvent={openDetail} />
            <DayView date={focusDate} events={events} onTapEvent={openDetail} />
            <DayView date={nextDay} events={events} onTapEvent={openDetail} />
          </SwipeCarousel>
        )}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 px-4 pt-2 bg-[var(--color-surface)] border-t border-[var(--color-surface-tertiary)]/20"
        style={{ paddingBottom: "max(8px, env(safe-area-inset-bottom, 0px))" }}>
        <button onClick={handleOpenNewEvent} className="w-full touch-target py-2.5 bg-[var(--color-accent)] text-black rounded-2xl font-bold text-[16px] active:scale-[0.97] transition-transform flex items-center justify-center gap-2">
          <span className="text-lg leading-none">+</span> Nuovo evento
        </button>
      </div>

      {/* ═══ SHEETS ═══ */}
      <AnimatePresence>
        {sheetOpen && (<>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 sheet-blur z-40" onClick={closeAndResetSheet} />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={sheetTransition}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface)] rounded-t-[22px] px-6 pt-6 pb-safe max-h-[90vh] overflow-y-auto border-t border-[var(--color-surface-tertiary)]/30">
            <div className="w-10 h-1 bg-[var(--color-text-tertiary)]/25 rounded-full mx-auto mb-6" />
            <h2 className="text-[20px] font-bold mb-5">Nuovo evento</h2>
            <form onSubmit={handleFormSubmit} className="space-y-3.5">
              <input className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none focus:ring-2 ring-[var(--color-accent)]/50 text-[16px]"
                placeholder="Titolo evento" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
              <input className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none text-[16px]"
                placeholder="Luogo" value={form.loc} onChange={e => setForm(f => ({ ...f, loc: e.target.value }))} />
              <label className="block"><span className="block text-[12px] text-[var(--color-text-secondary)] mb-1.5 ml-1">Data</span>
                <input type="date" className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] outline-none text-[16px]" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></label>
              <div className="flex gap-3">
                <label className="flex-1 block"><span className="block text-[12px] text-[var(--color-text-secondary)] mb-1.5 ml-1">Inizio</span>
                  <input type="time" className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] outline-none text-[16px]" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} /></label>
                <label className="flex-1 block"><span className="block text-[12px] text-[var(--color-text-secondary)] mb-1.5 ml-1">Fine</span>
                  <input type="time" className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] outline-none text-[16px]" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} /></label>
              </div>
              <textarea className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none focus:ring-2 ring-[var(--color-accent)]/50 text-[16px] resize-none"
                placeholder="Descrizione" rows={3} value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
              <button type="submit" className="w-full touch-target bg-[var(--color-accent)] text-black font-bold rounded-xl py-4 active:scale-[0.98] text-[16px]">Aggiungi evento</button>
            </form>
          </motion.div>
        </>)}
      </AnimatePresence>

      <AnimatePresence>
        {editEvent && (<>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 sheet-blur z-40" onClick={closeAndResetEdit} />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={sheetTransition}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface)] rounded-t-[22px] px-6 pt-6 pb-safe max-h-[90vh] overflow-y-auto border-t border-[var(--color-surface-tertiary)]/30">
            <div className="w-10 h-1 bg-[var(--color-text-tertiary)]/25 rounded-full mx-auto mb-6" />
            <h2 className="text-[20px] font-bold mb-5">Modifica evento</h2>
            <form onSubmit={handleUpdate} className="space-y-3.5">
              <input className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none focus:ring-2 ring-[var(--color-accent)]/50 text-[16px]"
                placeholder="Titolo" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
              <input className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none text-[16px]"
                placeholder="Luogo" value={form.loc} onChange={e => setForm(f => ({ ...f, loc: e.target.value }))} />
              <label className="block"><span className="block text-[12px] text-[var(--color-text-secondary)] mb-1.5 ml-1">Data</span>
                <input type="date" className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] outline-none text-[16px]" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></label>
              <div className="flex gap-3">
                <label className="flex-1 block"><span className="block text-[12px] text-[var(--color-text-secondary)] mb-1.5 ml-1">Inizio</span>
                  <input type="time" className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] outline-none text-[16px]" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} /></label>
                <label className="flex-1 block"><span className="block text-[12px] text-[var(--color-text-secondary)] mb-1.5 ml-1">Fine</span>
                  <input type="time" className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] outline-none text-[16px]" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} /></label>
              </div>
              <textarea className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none focus:ring-2 ring-[var(--color-accent)]/50 text-[16px] resize-none"
                placeholder="Descrizione" rows={3} value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} />
              {!confirmDelete ? (
                <div className="flex gap-3">
                  <button type="button" onClick={() => setConfirmDelete(true)} className="flex-1 touch-target py-4 bg-[var(--color-danger)] text-white rounded-xl font-bold text-[16px] active:scale-[0.98]">Elimina</button>
                  <button type="submit" className="flex-[2] touch-target py-4 bg-[var(--color-accent)] text-black rounded-xl font-bold text-[16px] active:scale-[0.98]">Salva</button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-[13px] text-[var(--color-text-secondary)] text-center">Eliminare definitivamente?</p>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setConfirmDelete(false)} className="flex-1 touch-target py-4 bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] rounded-xl font-bold text-[16px] active:scale-[0.98]">Annulla</button>
                    <button type="button" onClick={handleDelete} className="flex-1 touch-target py-4 bg-[var(--color-danger)] text-white rounded-xl font-bold text-[16px] active:scale-[0.98]">Conferma</button>
                  </div>
                </div>
              )}
            </form>
          </motion.div>
        </>)}
      </AnimatePresence>

      <AnimatePresence>
        {detailEvent && (<>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 sheet-blur z-40" onClick={closeDetail} />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={sheetTransition}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface)] rounded-t-[22px] px-6 pt-6 pb-safe max-h-[85vh] overflow-y-auto border-t border-[var(--color-surface-tertiary)]/30">
            <div className="w-10 h-1 bg-[var(--color-text-tertiary)]/25 rounded-full mx-auto mb-6" />
            <h2 className="text-[20px] font-bold mb-1 break-words">{detailEvent.title}</h2>
            <p className="text-[14px] text-[var(--color-accent)] font-semibold capitalize mb-0.5">{formatEventDate(detailEvent)}</p>
            <p className="text-[14px] text-[var(--color-text-secondary)] mb-5">{formatEventTimeRange(detailEvent)}</p>
            {detailEvent.location && (<div className="mb-5">
              <div className="flex items-start gap-2 text-[var(--color-text-primary)] text-[15px] mb-2.5"><span>📍</span><span className="flex-1 break-words">{detailEvent.location}</span></div>
              <div className="flex gap-3">
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(detailEvent.location)}`} target="_blank" rel="noopener" className="flex-1 touch-target flex items-center justify-center gap-1.5 bg-[var(--color-surface-secondary)] rounded-xl py-3 text-[14px] font-semibold text-[var(--color-text-primary)] active:scale-[0.98]">🗺️ Maps</a>
                <a href={`https://waze.com/ul?q=${encodeURIComponent(detailEvent.location)}`} target="_blank" rel="noopener" className="flex-1 touch-target flex items-center justify-center gap-1.5 bg-[var(--color-surface-secondary)] rounded-xl py-3 text-[14px] font-semibold text-[var(--color-text-primary)] active:scale-[0.98]">🧭 Waze</a>
              </div>
            </div>)}
            {detailEvent.description && (<div className="mb-6"><span className="block text-[12px] text-[var(--color-text-secondary)] mb-1.5 ml-1">Descrizione</span><p className="text-[15px] text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">{detailEvent.description}</p></div>)}
            <button onClick={handleOpenEditFromDetail} className="w-full touch-target bg-[var(--color-accent)] text-black font-bold rounded-xl py-4 active:scale-[0.98] text-[16px] mb-2">Modifica</button>
          </motion.div>
        </>)}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {errorToast && <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          className="fixed top-4 left-4 right-4 z-60 bg-[var(--color-danger)] text-white rounded-2xl px-5 py-3.5 text-[15px] font-semibold shadow-lg flex items-center justify-between"
          style={{ top: "max(16px, env(safe-area-inset-top, 0px) + 8px)" }}>
          <span>{errorToast}</span><button onClick={clearError} className="touch-target w-8 h-8 flex items-center justify-center text-white/80 active:scale-90">✕</button>
        </motion.div>}
      </AnimatePresence>
    </div>
  );
}
