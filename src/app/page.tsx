"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { useCalendar, getWeekStart, getWeekDates, isToday, isSameDay, getEventsForDay, formatTime, CalendarEvent } from "@/store/calendar";
import { useUI } from "@/store/ui";
import { parseLocally } from "@/lib/parser";

const WEEKDAY_LABELS = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"];
const MONTHS_IT = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const EVENT_COLORS = ["#c9a820", "#e04080", "#20c0a0"];

function getColor(index: number) {
  return EVENT_COLORS[index % EVENT_COLORS.length];
}

export default function Home() {
  const { events, addEvent, removeEvent } = useCalendar();
  const { aiInput, aiLoading, aiResult, setAiInput, setAiLoading, setAiResult, sheetOpen, openSheet, closeSheet, deleteConfirm, setDeleteConfirm } = useUI();

  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()));
  const [nextWeekStart, _] = useState(() => {
    const n = new Date(getWeekStart(new Date()));
    n.setDate(n.getDate() + 7);
    return n;
  });
  const [animating, setAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Sheet form state
  const [formTitle, setFormTitle] = useState("");
  const [formLoc, setFormLoc] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");

  const weekDates = getWeekDates(currentWeekStart);
  const nextWeekDates = getWeekDates(nextWeekStart);
  const today = new Date();

  // Handle horizontal swipe between weeks
  const handlePan = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (animating) return;
    if (Math.abs(info.offset.x) > 60 && Math.abs(info.offset.x) > Math.abs(info.offset.y) * 2) {
      if (info.offset.x < -30) {
        // Swipe left → next week
        goNextWeek();
      } else if (info.offset.x > 30) {
        // Swipe right → prev week
        goPrevWeek();
      }
    }
  };

  const goNextWeek = useCallback(() => {
    setAnimating(true);
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setTimeout(() => {
      setCurrentWeekStart(newStart);
      setAnimating(false);
    }, 250);
  }, [currentWeekStart]);

  const goPrevWeek = useCallback(() => {
    setAnimating(true);
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setTimeout(() => {
      setCurrentWeekStart(newStart);
      setAnimating(false);
    }, 250);
  }, [currentWeekStart]);

  // AI Input handler
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
      setAiResult("❌ Errore");
    }
    setAiLoading(false);
    setTimeout(() => setAiResult(null), 2500);
  };

  // Form submit
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
    setFormTitle(""); setFormLoc(""); setFormDate(""); setFormTime("");
    closeSheet();
  };

  // Scroll handler
  const handleScroll = () => {
    if (containerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
      setScrollProgress(scrollLeft / (scrollWidth - clientWidth));
    }
  };

  const monthLabel = `${MONTHS_IT[currentWeekStart.getMonth()]} ${currentWeekStart.getFullYear()}`;

  return (
    <div className="h-dvh flex flex-col bg-[var(--color-surface)] overflow-hidden">
      {/* Header — Dynamic Island aware */}
      <header className="notch-top px-5 pb-3 shrink-0">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
          {monthLabel}
        </h1>
        <p className="text-sm text-[var(--color-text-tertiary)] mt-0.5">
          {today.toLocaleDateString("it", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </header>

      {/* AI Input Bar */}
      <div className="px-4 pb-2 shrink-0">
        <div className="flex gap-2 bg-[var(--color-surface-secondary)] rounded-2xl p-1.5 items-center border border-transparent focus-within:border-[var(--color-accent)] transition-colors">
          <span className="pl-3 text-lg">✨</span>
          <input
            className="flex-1 bg-transparent py-2.5 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none text-[15px]"
            placeholder="es. martedì alle 21 saggio di danza"
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAISubmit()}
          />
          <button
            onClick={handleAISubmit}
            disabled={aiLoading || !aiInput.trim()}
            className="px-4 py-2 bg-[var(--color-accent)] text-black font-semibold rounded-xl text-sm disabled:opacity-30 transition-opacity shrink-0"
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
              className="text-[var(--color-success)] text-xs mt-1.5 text-center"
            >
              {aiResult}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Weekday Labels */}
      <div className="flex px-4 pb-1 shrink-0">
        {WEEKDAY_LABELS.map((l, i) => (
          <div key={l} className="flex-1 text-center text-[11px] font-semibold tracking-wide text-[var(--color-text-tertiary)]">
            {l}
          </div>
        ))}
      </div>

      {/* Week View — scrollable horizontally */}
      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-auto snap-x snap-mandatory"
        onScroll={handleScroll}
      >
        <div className="flex min-w-full">
          {/* Current week */}
          <div className="min-w-full flex flex-col snap-center">
            <motion.div
              className="flex flex-1 px-4 gap-1"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.1}
              onPanEnd={handlePan}
            >
              {weekDates.map((date, idx) => {
                const dayEvents = getEventsForDay(events, date);
                const todayCheck = isToday(date);
                const isWeekend = idx >= 5;

                return (
                  <div
                    key={date.toISOString()}
                    className={`flex-1 min-h-full rounded-xl p-1.5 flex flex-col gap-1 transition-colors ${
                      todayCheck ? "bg-[var(--color-today)]" : isWeekend ? "bg-[var(--color-weekend)]" : ""
                    }`}
                  >
                    {/* Day number */}
                    <div className="text-center pt-1 pb-0.5">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          todayCheck
                            ? "bg-[var(--color-accent)] text-black today-pulse"
                            : "text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {date.getDate()}
                      </span>
                    </div>

                    {/* Events */}
                    <div className="flex-1 flex flex-col gap-1 min-h-0">
                      {dayEvents.slice(0, 4).map((ev, ei) => (
                        <motion.div
                          key={ev.id || ei}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileTap={{ scale: 0.95 }}
                          className="rounded-lg px-1.5 py-1 cursor-pointer text-[10px] leading-tight font-medium truncate"
                          style={{ background: getColor(ei) + "22", color: getColor(ei), borderLeft: `2px solid ${getColor(ei)}` }}
                          onClick={() => ev.id && setDeleteConfirm(ev.id)}
                        >
                          <div className="truncate font-semibold">{ev.title}</div>
                          <div className="opacity-70">{formatTime(ev.start_time)}</div>
                        </motion.div>
                      ))}
                      {dayEvents.length > 4 && (
                        <div className="text-[10px] text-[var(--color-text-tertiary)] text-center mt-0.5">
                          +{dayEvents.length - 4}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          </div>

          {/* Next week */}
          <div className="min-w-full flex flex-col snap-center">
            <div className="flex flex-1 px-4 gap-1 opacity-60">
              {nextWeekDates.map((date, idx) => {
                const dayEvents = getEventsForDay(events, date);
                const todayCheck = isToday(date);
                const isWeekend = idx >= 5;

                return (
                  <div
                    key={date.toISOString()}
                    className={`flex-1 min-h-full rounded-xl p-1.5 flex flex-col gap-1 ${
                      todayCheck ? "bg-[var(--color-today)]" : isWeekend ? "bg-[var(--color-weekend)]" : ""
                    }`}
                  >
                    <div className="text-center pt-1 pb-0.5">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                          todayCheck ? "bg-[var(--color-accent)] text-black today-pulse" : "text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {date.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col gap-1 min-h-0">
                      {dayEvents.slice(0, 3).map((ev, ei) => (
                        <div
                          key={ev.id || ei}
                          className="rounded-lg px-1.5 py-1 text-[10px] leading-tight font-medium truncate"
                          style={{ background: getColor(ei) + "22", color: getColor(ei), borderLeft: `2px solid ${getColor(ei)}` }}
                        >
                          <div className="truncate font-semibold">{ev.title}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="flex justify-center py-2 shrink-0 gap-1.5">
        <div className={`w-5 h-1 rounded-full transition-colors ${scrollProgress < 0.5 ? "bg-[var(--color-accent)]" : "bg-[var(--color-surface-tertiary)]"}`} />
        <div className={`w-5 h-1 rounded-full transition-colors ${scrollProgress >= 0.5 ? "bg-[var(--color-accent)]" : "bg-[var(--color-surface-tertiary)]"}`} />
      </div>

      {/* Bottom bar */}
      <div className="pb-safe px-5 pt-1 flex gap-3 shrink-0">
        <button
          onClick={goPrevWeek}
          className="flex-1 py-2.5 bg-[var(--color-surface-secondary)] rounded-xl text-[var(--color-text-secondary)] text-sm font-medium active:scale-95 transition-transform"
        >
          ← Sett. prec.
        </button>
        <button
          onClick={openSheet}
          className="flex-[2] py-2.5 bg-[var(--color-accent)] text-black rounded-xl font-semibold text-sm active:scale-95 transition-transform"
        >
          + Nuovo evento
        </button>
        <button
          onClick={goNextWeek}
          className="flex-1 py-2.5 bg-[var(--color-surface-secondary)] rounded-xl text-[var(--color-text-secondary)] text-sm font-medium active:scale-95 transition-transform"
        >
          Sett. succ. →
        </button>
      </div>

      {/* Add Event Sheet */}
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
              className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface)] rounded-t-3xl px-5 pt-6 pb-safe max-h-[80vh] overflow-y-auto border-t border-[var(--color-surface-tertiary)]"
            >
              <div className="w-10 h-1 bg-[var(--color-text-tertiary)]/30 rounded-full mx-auto mb-6" />
              <h2 className="text-xl font-bold mb-5">Nuovo evento</h2>
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <input
                  className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none focus:ring-2 ring-[var(--color-accent)] transition-shadow text-[15px]"
                  placeholder="Titolo evento"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  autoFocus
                />
                <input
                  className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-3 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none text-[15px]"
                  placeholder="Luogo (opzionale)"
                  value={formLoc}
                  onChange={(e) => setFormLoc(e.target.value)}
                />
                <div className="flex gap-3">
                  <input
                    type="date"
                    className="flex-1 bg-[var(--color-surface-secondary)] rounded-xl px-4 py-3 text-[var(--color-text-primary)] outline-none text-[15px]"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                  />
                  <input
                    type="time"
                    className="flex-1 bg-[var(--color-surface-secondary)] rounded-xl px-4 py-3 text-[var(--color-text-primary)] outline-none text-[15px]"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-[var(--color-accent)] text-black font-semibold rounded-xl py-3.5 active:scale-[0.98] transition-transform text-[15px]"
                >
                  Aggiungi evento
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete confirmation */}
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
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--color-surface-secondary)] rounded-2xl p-6 w-full max-w-sm"
              >
                <h3 className="text-lg font-bold mb-2">Eliminare evento?</h3>
                <p className="text-[var(--color-text-secondary)] text-sm mb-5">L&apos;operazione non può essere annullata.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 py-2.5 bg-[var(--color-surface-tertiary)] rounded-xl text-sm font-medium"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={() => { removeEvent(deleteConfirm); setDeleteConfirm(null); }}
                    className="flex-1 py-2.5 bg-[var(--color-danger)] text-white rounded-xl text-sm font-semibold"
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
