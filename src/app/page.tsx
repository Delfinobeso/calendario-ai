"use client";

import { useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  useCalendar,
  getWeekStart,
  CalendarEvent,
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

// ─── Page ─────────────────────────────────────────────────────
export default function Home() {
  const { events, addEvent, removeEvent } = useCalendar();
  const {
    aiInput,
    aiLoading,
    aiResult,
    setAiInput,
    setAiLoading,
    setAiResult,
    sheetOpen,
    openSheet,
    closeSheet,
    deleteConfirm,
    setDeleteConfirm,
  } = useUI();

  const today = new Date();
  const currentWeekStart = getWeekStart(today);

  // ─── Zoom state ───
  const [zoom, setZoom] = useState<ZoomLevel>("week");
  const [focusDate, setFocusDate] = useState(today);

  // Derived values for each zoom level
  const focusYear = focusDate.getFullYear();
  const focusMonth = focusDate.getMonth();
  const focusWeekStart = useMemo(() => getWeekStart(focusDate), [focusDate]);

  // ─── Zoom navigation ───
  const zoomOut = useCallback(() => {
    setZoom((z) => {
      switch (z) {
        case "day":   return "week";
        case "week":  return "month";
        case "month": return "year";
        default:      return "year";
      }
    });
  }, []);

  const zoomToDay = useCallback((d: Date) => {
    setFocusDate(d);
    setZoom("day");
  }, []);

  const zoomToWeek = useCallback((d: Date) => {
    setFocusDate(d);
    setZoom("week");
  }, []);

  const zoomToMonth = useCallback((m: number) => {
    setFocusDate(new Date(focusYear, m, 1));
    setZoom("month");
  }, [focusYear]);

  const jumpToToday = useCallback(() => {
    setFocusDate(new Date());
    setZoom("week");
  }, []);

  // Pinch
  const pinch = usePinchZoom(zoomOut, 0.6);

  // ─── Header label ───
  const headerLabel = useMemo(() => {
    switch (zoom) {
      case "year":  return String(focusYear);
      case "month": return `${MONTHS_IT[focusMonth]} ${focusYear}`;
      case "week": {
        const end = new Date(focusWeekStart);
        end.setDate(end.getDate() + 6);
        const sameMonth = focusWeekStart.getMonth() === end.getMonth();
        if (sameMonth) {
          return `${MONTHS_IT[focusWeekStart.getMonth()]} ${focusWeekStart.getFullYear()}`;
        }
        return `${focusWeekStart.getDate()} ${MONTHS_IT[focusWeekStart.getMonth()]} – ${end.getDate()} ${MONTHS_IT[end.getMonth()]}`;
      }
      case "day":
        return focusDate.toLocaleDateString("it", {
          weekday: "long",
          day: "numeric",
          month: "long",
        });
    }
  }, [zoom, focusYear, focusMonth, focusWeekStart, focusDate]);

  const isCurrentWeek =
    zoom === "week" &&
    focusWeekStart.toDateString() === currentWeekStart.toDateString();

  const isTodayFocused =
    zoom === "day" && focusDate.toDateString() === today.toDateString();

  // ─── AI input ───
  const handleAISubmit = async () => {
    if (!aiInput.trim()) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const event = parseLocally(aiInput);
      await addEvent(event);
      setAiResult(`✅ "${event.title}" aggiunto`);
      setAiInput("");
    } catch {
      setAiResult("❌ Errore nel parsing");
    }
    setAiLoading(false);
    setTimeout(() => setAiResult(null), 2500);
  };

  // ─── Form state ───
  const [formTitle, setFormTitle] = useState("");
  const [formLoc, setFormLoc] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDate || !formTime) return;
    await addEvent({
      title: formTitle,
      location: formLoc,
      description: "",
      start_time: `${formDate}T${formTime}:00`,
      end_time: `${formDate}T${formTime}:00`,
      source: "manual",
    });
    setFormTitle("");
    setFormLoc("");
    setFormDate("");
    setFormTime("");
    closeSheet();
  };

  return (
    <div
      className="h-dvh flex flex-col bg-[var(--color-surface)] overflow-hidden"
      {...pinch}
    >
      {/* ── Header ── */}
      <header className="notch-top px-5 pb-2 shrink-0">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[22px] font-bold text-[var(--color-text-primary)] tracking-tight">
                Calendario
              </h1>
              <span className="text-[10px] font-semibold text-[var(--color-text-tertiary)] bg-[var(--color-surface-secondary)] px-2 py-0.5 rounded-full uppercase">
                {ZOOM_LABELS[zoom]}
              </span>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] mt-0.5 capitalize">
              {headerLabel}
            </p>
          </div>
          {zoom !== "day" && !isCurrentWeek && zoom === "week" && (
            <button
              onClick={jumpToToday}
              className="text-xs font-semibold text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-3 py-1.5 rounded-full active:scale-95 transition-transform"
            >
              Oggi
            </button>
          )}
          {(zoom === "year" || zoom === "month") && (
            <button
              onClick={jumpToToday}
              className="text-xs font-semibold text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-3 py-1.5 rounded-full active:scale-95 transition-transform"
            >
              Oggi
            </button>
          )}
        </div>
      </header>

      {/* ── AI Input ── */}
      <div className="px-4 pb-3 shrink-0">
        <div className="flex gap-2 bg-[var(--color-surface-secondary)] rounded-2xl p-1.5 items-center border border-transparent focus-within:border-[var(--color-accent)]/40 transition-all duration-200">
          <span className="pl-3 text-base">✨</span>
          <input
            className="flex-1 bg-transparent py-2.5 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none text-[15px]"
            placeholder="es. martedì alle 21 saggio di danza"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAISubmit()}
            enterKeyHint="go"
          />
          <button
            onClick={handleAISubmit}
            disabled={aiLoading || !aiInput.trim()}
            className="px-4 py-2 bg-[var(--color-accent)] text-black font-semibold rounded-xl text-sm disabled:opacity-30 transition-opacity shrink-0 active:scale-95"
          >
            {aiLoading ? "···" : "Aggiungi"}
          </button>
        </div>
        <AnimatePresence>
          {aiResult && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-[var(--color-success)] text-xs mt-1.5 text-center font-medium"
            >
              {aiResult}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* ── Zoom view ── */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {zoom === "year" && (
            <YearView
              key={`year-${focusYear}`}
              year={focusYear}
              events={events}
              onTapMonth={zoomToMonth}
            />
          )}
          {zoom === "month" && (
            <MonthView
              key={`month-${focusYear}-${focusMonth}`}
              year={focusYear}
              month={focusMonth}
              events={events}
              onTapDay={zoomToDay}
            />
          )}
          {zoom === "week" && (
            <WeekView
              key={`week-${focusWeekStart.toISOString()}`}
              weekStart={focusWeekStart}
              events={events}
              onTapDay={zoomToDay}
              onDeleteEvent={(id) => setDeleteConfirm(id)}
            />
          )}
          {zoom === "day" && (
            <DayView
              key={`day-${focusDate.toISOString()}`}
              date={focusDate}
              events={events}
              onTapEvent={(id) => setDeleteConfirm(id)}
              onPinchOut={zoomOut}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom bar ── */}
      <div className="pb-safe px-5 pt-1 shrink-0 flex gap-3">
        {zoom !== "year" && (
          <button
            onClick={zoomOut}
            className="flex-1 py-3 bg-[var(--color-surface-secondary)] rounded-2xl text-[var(--color-text-secondary)] text-sm font-medium active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5"
          >
            <span className="text-base">🤏</span>
            {ZOOM_LABELS[zoom === "day" ? "week" : zoom === "week" ? "month" : "year"]}
          </button>
        )}
        <button
          onClick={openSheet}
          className={`${
            zoom !== "year" ? "flex-[2]" : "flex-1"
          } py-3 bg-[var(--color-accent)] text-black rounded-2xl font-semibold text-[15px] active:scale-[0.98] transition-transform flex items-center justify-center gap-2`}
        >
          <span className="text-lg leading-none">+</span>
          Nuovo evento
        </button>
      </div>

      {/* ── Add Event Sheet ── */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 sheet-blur z-40"
              onClick={closeSheet}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface)] rounded-t-3xl px-5 pt-6 pb-safe max-h-[85vh] overflow-y-auto border-t border-[var(--color-surface-tertiary)]/50"
            >
              <div className="w-10 h-1 bg-[var(--color-text-tertiary)]/30 rounded-full mx-auto mb-6" />
              <h2 className="text-xl font-bold mb-5">Nuovo evento</h2>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <input
                  className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-3.5 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none focus:ring-2 ring-[var(--color-accent)]/50 transition-shadow text-[15px]"
                  placeholder="Titolo evento"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  autoFocus
                  enterKeyHint="next"
                />
                <input
                  className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-3.5 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none text-[15px]"
                  placeholder="Luogo (opzionale)"
                  value={formLoc}
                  onChange={(e) => setFormLoc(e.target.value)}
                  enterKeyHint="next"
                />
                <div className="flex gap-3">
                  <input
                    type="date"
                    className="flex-1 bg-[var(--color-surface-secondary)] rounded-xl px-4 py-3.5 text-[var(--color-text-primary)] outline-none text-[15px] color-scheme-dark"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                  <input
                    type="time"
                    className="flex-1 bg-[var(--color-surface-secondary)] rounded-xl px-4 py-3.5 text-[var(--color-text-primary)] outline-none text-[15px] color-scheme-dark"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[var(--color-accent)] text-black font-semibold rounded-xl py-4 active:scale-[0.98] transition-transform text-[15px]"
                >
                  Aggiungi evento
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Delete confirmation ── */}
      <AnimatePresence>
        {deleteConfirm !== null && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 sheet-blur z-50 flex items-center justify-center px-8"
              onClick={() => setDeleteConfirm(null)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--color-surface-secondary)] rounded-2xl p-6 w-full max-w-sm shadow-2xl"
              >
                <h3 className="text-lg font-bold mb-2">Eliminare evento?</h3>
                <p className="text-[var(--color-text-secondary)] text-sm mb-5">
                  L&apos;operazione non può essere annullata.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-3 bg-[var(--color-surface-tertiary)] rounded-xl text-sm font-semibold active:scale-95 transition-transform"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => {
                      removeEvent(deleteConfirm);
                      setDeleteConfirm(null);
                    }}
                    className="flex-1 py-3 bg-[var(--color-danger)] text-white rounded-xl text-sm font-semibold active:scale-95 transition-transform"
                  >
                    Elimina
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
