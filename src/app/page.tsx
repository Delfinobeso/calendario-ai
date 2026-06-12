"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  useCalendar,
  getWeekStart,
  type CalendarEvent,
} from "@/store/calendar";
import { useUI } from "@/store/ui";
import { parseLocally } from "@/lib/parser";
import { usePinchZoom } from "@/hooks/usePinchZoom";

import YearView from "@/components/YearView";
import MonthView from "@/components/MonthView";
import WeekView from "@/components/WeekView";
import DayView from "@/components/DayView";

type ZoomLevel = "year" | "month" | "week" | "day";

const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

const ZOOM_LABELS: Record<ZoomLevel, string> = {
  year: "Anno",
  month: "Mese",
  week: "Settimana",
  day: "Giorno",
};

export default function Home() {
  const { events, addEvent, removeEvent, loadEvents, updateEvent } = useCalendar();
  const {
    aiInput, aiLoading, aiResult,
    setAiInput, setAiLoading, setAiResult,
    sheetOpen, openSheet, closeSheet,
    editEvent, openEdit, closeEdit,
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
        case "day":   return "week";
        case "week":  return "month";
        case "month": return "year";
        default:      return "year";
      }
    });
  }, []);

  const zoomToDay = useCallback((d: Date) => { setSwipeDir(0); setFocusDate(d); setZoom("day"); }, []);
  const zoomToMonth = useCallback((m: number) => { setSwipeDir(0); setFocusDate(new Date(focusYear, m, 1)); setZoom("month"); }, [focusYear]);

  const goNext = useCallback(() => {
    setSwipeDir(-1);
    const d = new Date(focusDate);
    switch (zoom) {
      case "day":   d.setDate(d.getDate() + 1); break;
      case "week":  d.setDate(d.getDate() + 7); break;
      case "month": d.setMonth(d.getMonth() + 1); break;
      case "year":  d.setFullYear(d.getFullYear() + 1); break;
    }
    setFocusDate(d);
  }, [zoom, focusDate]);

  const goPrev = useCallback(() => {
    setSwipeDir(1);
    const d = new Date(focusDate);
    switch (zoom) {
      case "day":   d.setDate(d.getDate() - 1); break;
      case "week":  d.setDate(d.getDate() - 7); break;
      case "month": d.setMonth(d.getMonth() - 1); break;
      case "year":  d.setFullYear(d.getFullYear() - 1); break;
    }
    setFocusDate(d);
  }, [zoom, focusDate]);

  const jumpToToday = useCallback(() => { setSwipeDir(0); setFocusDate(new Date()); setZoom("week"); }, []);

  const pinch = usePinchZoom(zoomOut, 0.6);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  const headerLabel = useMemo(() => {
    switch (zoom) {
      case "year":  return String(focusYear);
      case "month": return `${MONTHS_IT[focusMonth]} ${focusYear}`;
      case "week": {
        const end = new Date(focusWeekStart);
        end.setDate(end.getDate() + 6);
        if (focusWeekStart.getMonth() === end.getMonth()) {
          return `${MONTHS_IT[focusWeekStart.getMonth()]} ${focusWeekStart.getFullYear()}`;
        }
        return `${focusWeekStart.getDate()} ${MONTHS_IT[focusWeekStart.getMonth()]} – ${end.getDate()} ${MONTHS_IT[end.getMonth()]}`;
      }
      case "day":
        return focusDate.toLocaleDateString("it", { weekday: "long", day: "numeric", month: "long" });
    }
  }, [zoom, focusYear, focusMonth, focusWeekStart, focusDate]);

  const isCurrentWeek = zoom === "week" && focusWeekStart.toDateString() === currentWeekStart.toDateString();
  const isCurrentMonth = zoom === "month" && focusMonth === today.getMonth() && focusYear === today.getFullYear();
  const isCurrentYear = zoom === "year" && focusYear === today.getFullYear();

  const showToday =
    (zoom === "week" && !isCurrentWeek) ||
    (zoom === "month" && !isCurrentMonth) ||
    (zoom === "year" && !isCurrentYear);

  const handleAISubmit = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true); setAiResult(null);
    try {
      const event = parseLocally(aiInput);
      await addEvent(event);
      setAiResult(`✅ "${event.title}" aggiunto`);
      setAiInput("");
    } catch { setAiResult("❌ Errore nel parsing"); }
    setAiLoading(false);
    setTimeout(() => setAiResult(null), 2500);
  };

  const [formTitle, setFormTitle] = useState("");
  const [formLoc, setFormLoc] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");

  const handleOpenNewEvent = () => {
    const now = new Date();
    const rounded = new Date(now);
    rounded.setSeconds(0, 0);
    rounded.setMinutes(now.getMinutes() < 30 ? 30 : 0, 0, 0);
    if (now.getMinutes() >= 30) rounded.setHours(rounded.getHours() + 1);
    setFormDate(now.toISOString().slice(0, 10));
    setFormTime(rounded.toTimeString().slice(0, 5));
    openSheet();
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDate || !formTime) return;
    await addEvent({
      title: formTitle, location: formLoc, description: "",
      start_time: `${formDate}T${formTime}:00`, end_time: `${formDate}T${formTime}:00`,
      source: "manual",
    });
    setFormTitle(""); setFormLoc(""); setFormDate(""); setFormTime("");
    closeSheet();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEvent?.id || !formTitle || !formDate || !formTime) return;
    await updateEvent(editEvent.id, {
      title: formTitle,
      location: formLoc,
      start_time: `${formDate}T${formTime}:00`,
      end_time: `${formDate}T${formTime}:00`,
    });
    setFormTitle(""); setFormLoc(""); setFormDate(""); setFormTime("");
    closeEdit();
  };

  const handleDelete = async () => {
    if (!editEvent?.id) return;
    await removeEvent(editEvent.id);
    closeEdit();
  };

  const handleOpenEdit = useCallback((ev: CalendarEvent) => {
    setFormTitle(ev.title);
    setFormLoc(ev.location || "");
    const start = new Date(ev.start_time);
    setFormDate(start.toISOString().slice(0, 10));
    setFormTime(start.toTimeString().slice(0, 5));
    openEdit(ev);
  }, [openEdit]);

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
          {showToday && (
            <button onClick={jumpToToday} className="touch-target text-[13px] font-semibold text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-4 py-2 rounded-full active:scale-95 transition-transform flex items-center">
              Oggi
            </button>
          )}
        </div>
      </header>

      {/* ── AI Input ── */}
      <div className="shrink-0 px-5 pb-2">
        <div className="flex gap-2 bg-[var(--color-surface-secondary)] rounded-2xl p-1 items-center border border-transparent focus-within:border-[var(--color-accent)]/40 transition-all duration-200">
          <span className="pl-3 text-base">✨</span>
          <input
            className="flex-1 bg-transparent py-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none text-[16px]"
            placeholder="es. martedì alle 21 saggio di danza"
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
              className="text-[var(--color-success)] text-xs mt-1.5 text-center font-medium">{aiResult}</motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ── Zoom view ── */}
      <div className="flex-1 min-h-0 overflow-hidden gpu-layer">
        <AnimatePresence mode="wait" custom={swipeDir}>
          {zoom === "year" && (
            <YearView
              key={`year-${focusYear}`} year={focusYear} events={events} direction={swipeDir}
              onTapMonth={zoomToMonth} onSwipeDown={goPrev} onSwipeUp={goNext}
            />
          )}
          {zoom === "month" && (
            <MonthView
              key={`month-${focusYear}-${focusMonth}`} year={focusYear} month={focusMonth} events={events} direction={swipeDir}
              onTapDay={zoomToDay} onSwipeDown={goPrev} onSwipeUp={goNext}
            />
          )}
          {zoom === "week" && (
            <WeekView
              key={`week-${focusWeekStart.toISOString()}`} weekStart={focusWeekStart} events={events} direction={swipeDir}
              onTapDay={zoomToDay} onDeleteEvent={handleOpenEdit}
              onSwipeLeft={goNext} onSwipeRight={goPrev}
            />
          )}
          {zoom === "day" && (
            <DayView
              key={`day-${focusDate.toISOString()}`} date={focusDate} events={events} direction={swipeDir}
              onTapEvent={handleOpenEdit} onSwipeLeft={goNext} onSwipeRight={goPrev}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom bar ── */}
      <div
        className="shrink-0 px-4 pt-2 bg-[var(--color-surface)] border-t border-[var(--color-surface-tertiary)]/20"
        style={{ paddingBottom: "calc(8px + var(--sab))" }}
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

      {/* ── Add Event Sheet ── */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 sheet-blur z-40" onClick={closeSheet} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface)] rounded-t-[22px] px-6 pt-6 pb-safe max-h-[85vh] overflow-y-auto border-t border-[var(--color-surface-tertiary)]/30">
              <div className="w-10 h-1 bg-[var(--color-text-tertiary)]/25 rounded-full mx-auto mb-6" />
              <h2 className="text-[20px] font-bold mb-5">Nuovo evento</h2>
              <form onSubmit={handleFormSubmit} className="space-y-3.5">
                <input className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none focus:ring-2 ring-[var(--color-accent)]/50 transition-shadow text-[16px]"
                  placeholder="Titolo evento" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} autoFocus enterKeyHint="next" />
                <input className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none text-[16px]"
                  placeholder="Luogo (opzionale)" value={formLoc} onChange={(e) => setFormLoc(e.target.value)} enterKeyHint="next" />
                <div className="flex gap-3">
                  <label className="flex-1 block">
                    <span className="block text-[12px] text-[var(--color-text-secondary)] mb-1.5 ml-1">Data</span>
                    <input type="date" className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] outline-none text-[16px]"
                      value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                  </label>
                  <label className="flex-1 block">
                    <span className="block text-[12px] text-[var(--color-text-secondary)] mb-1.5 ml-1">Ora</span>
                    <input type="time" className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] outline-none text-[16px]"
                      value={formTime} onChange={(e) => setFormTime(e.target.value)} />
                  </label>
                </div>
                <button type="submit" className="w-full bg-[var(--color-accent)] text-black font-bold rounded-xl py-4 active:scale-[0.98] transition-transform text-[16px]">
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
              className="fixed inset-0 bg-black/50 sheet-blur z-40" onClick={closeEdit} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface)] rounded-t-[22px] px-6 pt-6 pb-safe max-h-[85vh] overflow-y-auto border-t border-[var(--color-surface-tertiary)]/30">
              <div className="w-10 h-1 bg-[var(--color-text-tertiary)]/25 rounded-full mx-auto mb-6" />
              <h2 className="text-[20px] font-bold mb-5">Modifica evento</h2>
              <form onSubmit={handleUpdate} className="space-y-3.5">
                <input className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none focus:ring-2 ring-[var(--color-accent)]/50 transition-shadow text-[16px]"
                  placeholder="Titolo evento" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} autoFocus enterKeyHint="next" />
                <input className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none text-[16px]"
                  placeholder="Luogo (opzionale)" value={formLoc} onChange={(e) => setFormLoc(e.target.value)} enterKeyHint="next" />
                <div className="flex gap-3">
                  <label className="flex-1 block">
                    <span className="block text-[12px] text-[var(--color-text-secondary)] mb-1.5 ml-1">Data</span>
                    <input type="date" className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] outline-none text-[16px]"
                      value={formDate} onChange={(e) => setFormDate(e.target.value)} />
                  </label>
                  <label className="flex-1 block">
                    <span className="block text-[12px] text-[var(--color-text-secondary)] mb-1.5 ml-1">Ora</span>
                    <input type="time" className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-4 text-[var(--color-text-primary)] outline-none text-[16px]"
                      value={formTime} onChange={(e) => setFormTime(e.target.value)} />
                  </label>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={handleDelete}
                    className="flex-1 touch-target py-4 bg-[var(--color-danger)] text-white rounded-xl font-bold text-[16px] active:scale-[0.98] transition-transform">
                    Elimina
                  </button>
                  <button type="submit"
                    className="flex-[2] touch-target py-4 bg-[var(--color-accent)] text-black rounded-xl font-bold text-[16px] active:scale-[0.98] transition-transform">
                    Salva modifiche
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
