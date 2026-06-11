"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useCalendar,
  getWeekStart,
  getWeekDates,
  isToday,
  getEventsForDay,
  formatTime,
  CalendarEvent,
} from "@/store/calendar";
import { useUI } from "@/store/ui";
import { parseLocally } from "@/lib/parser";

const WEEKDAY_LABELS = ["LUN", "MAR", "MER", "GIO", "VEN", "SAB", "DOM"];
const MONTHS_IT = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];
const MONTHS_SHORT = [
  "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
  "Lug", "Ago", "Set", "Ott", "Nov", "Dic",
];

function getColor(index: number): string {
  const colors = ["#c9a820", "#e04080", "#20c0a0", "#6c5ce7", "#e17055"];
  return colors[index % colors.length];
}

// ─── Week Panel ───────────────────────────────────────────────
function WeekPanel({
  dates,
  events,
  isCurrent,
}: {
  dates: Date[];
  events: CalendarEvent[];
  isCurrent: boolean;
}) {
  const { setDeleteConfirm } = useUI();
  const todayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isCurrent && todayRef.current) {
      todayRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [isCurrent]);

  return (
    <div className="min-w-full h-full flex flex-col snap-center">
      <div className="flex flex-1 px-3 gap-1.5 min-h-0">
        {dates.map((date, idx) => {
          const dayEvents = getEventsForDay(events, date);
          const todayCheck = isToday(date);
          const isWeekend = idx >= 5;
          const dayNum = date.getDate();

          return (
            <div
              key={date.toISOString()}
              ref={todayCheck && isCurrent ? todayRef : undefined}
              className={`flex-1 flex flex-col rounded-2xl p-1.5 gap-1 transition-colors duration-300 ${
                todayCheck && isCurrent
                  ? "bg-[var(--color-today)] ring-1 ring-[var(--color-accent)]/30"
                  : isWeekend
                  ? "bg-[var(--color-weekend)]"
                  : ""
              }`}
            >
              <div className="flex justify-center pt-1 pb-0.5">
                <span
                  className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-bold transition-all ${
                    todayCheck && isCurrent
                      ? "bg-[var(--color-accent)] text-black today-pulse shadow-[0_0_12px_var(--color-accent)]"
                      : "text-[var(--color-text-secondary)]"
                  }`}
                >
                  {dayNum}
                </span>
              </div>
              <div className="flex-1 flex flex-col gap-1 min-h-0 overflow-hidden">
                {dayEvents.slice(0, 4).map((ev, ei) => (
                  <motion.div
                    key={ev.id || ei}
                    layout
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    whileTap={{ scale: 0.95 }}
                    className="rounded-xl px-2 py-1.5 cursor-pointer text-[10px] leading-tight font-medium truncate active:opacity-70 transition-opacity"
                    style={{
                      background: getColor(ei) + "18",
                      color: getColor(ei),
                      borderLeft: `2.5px solid ${getColor(ei)}`,
                    }}
                    onClick={() => ev.id != null && setDeleteConfirm(ev.id)}
                  >
                    <div className="truncate font-semibold mb-0.5">{ev.title}</div>
                    <div className="opacity-70">{formatTime(ev.start_time)}</div>
                  </motion.div>
                ))}
                {dayEvents.length > 4 && (
                  <div className="text-[10px] text-[var(--color-text-tertiary)] text-center font-medium">
                    +{dayEvents.length - 4}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Month Picker Sheet ───────────────────────────────────────
function MonthPicker({
  open,
  onClose,
  onSelect,
  currentMonth,
  currentYear,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (year: number, month: number) => void;
  currentMonth: number;
  currentYear: number;
}) {
  const [year, setYear] = useState(currentYear);
  const today = new Date();
  const nowMonth = today.getMonth();
  const nowYear = today.getFullYear();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 sheet-blur z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface)] rounded-t-3xl px-5 pt-6 pb-safe border-t border-[var(--color-surface-tertiary)]/50"
          >
            <div className="w-10 h-1 bg-[var(--color-text-tertiary)]/30 rounded-full mx-auto mb-6" />
            <h2 className="text-xl font-bold mb-4">Seleziona mese</h2>

            {/* Year row */}
            <div className="flex items-center justify-between mb-5">
              <button
                onClick={() => setYear((y) => y - 1)}
                className="w-10 h-10 rounded-xl bg-[var(--color-surface-secondary)] flex items-center justify-center text-[var(--color-text-secondary)] active:scale-90 transition-transform text-lg"
              >
                ‹
              </button>
              <span className="text-lg font-bold text-[var(--color-text-primary)]">
                {year}
              </span>
              <button
                onClick={() => setYear((y) => y + 1)}
                className="w-10 h-10 rounded-xl bg-[var(--color-surface-secondary)] flex items-center justify-center text-[var(--color-text-secondary)] active:scale-90 transition-transform text-lg"
              >
                ›
              </button>
            </div>

            {/* Month grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {MONTHS_SHORT.map((name, idx) => {
                const isNow = idx === nowMonth && year === nowYear;
                const isSelected = idx === currentMonth && year === currentYear;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      onSelect(year, idx);
                      onClose();
                    }}
                    className={`py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                      isSelected
                        ? "bg-[var(--color-accent)] text-black"
                        : isNow
                        ? "bg-[var(--color-surface-secondary)] text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/40"
                        : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]"
                    }`}
                  >
                    {name}
                  </button>
                );
              })}
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 bg-[var(--color-surface-secondary)] rounded-xl text-sm font-semibold text-[var(--color-text-secondary)] active:scale-[0.98] transition-transform"
            >
              Annulla
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

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

  // Navigation: absolute week reference
  const [navYear, setNavYear] = useState(today.getFullYear());
  const [navMonth, setNavMonth] = useState(today.getMonth());
  const [navWeekInMonth, setNavWeekInMonth] = useState(() => {
    // Which week of the current month is today in? (0-indexed)
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstMonday = getWeekStart(firstOfMonth);
    const diffMs = getWeekStart(today).getTime() - firstMonday.getTime();
    return Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
  });

  const [weekPage, setWeekPage] = useState(0); // 0 or 1 inside scroll
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Derived: first week start for the currently navigated month+week
  const firstOfMonth = new Date(navYear, navMonth, 1);
  const firstMondayOfMonth = getWeekStart(firstOfMonth);
  const anchorWeekStart = new Date(firstMondayOfMonth);
  anchorWeekStart.setDate(firstMondayOfMonth.getDate() + navWeekInMonth * 7);

  const weekStart = new Date(anchorWeekStart);
  weekStart.setDate(anchorWeekStart.getDate() + weekPage * 7);

  const nextWeekStartDate = new Date(weekStart);
  nextWeekStartDate.setDate(weekStart.getDate() + 7);

  const weekDates = getWeekDates(weekStart);
  const nextWeekDates = getWeekDates(nextWeekStartDate);

  // Today's week reference for "Oggi" button
  const todayWeekStart = getWeekStart(today);

  const isCurrentWeek =
    weekStart.toDateString() === todayWeekStart.toDateString();

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formLoc, setFormLoc] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("");

  // ─── Jump to today ───
  const jumpToToday = useCallback(() => {
    const t = new Date();
    const first = new Date(t.getFullYear(), t.getMonth(), 1);
    const firstMon = getWeekStart(first);
    const todayMon = getWeekStart(t);
    const weekIdx = Math.round(
      (todayMon.getTime() - firstMon.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    setNavYear(t.getFullYear());
    setNavMonth(t.getMonth());
    setNavWeekInMonth(Math.max(0, weekIdx));
    setWeekPage(0);
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ left: 0, behavior: "instant" as ScrollBehavior });
      }
    }, 50);
  }, []);

  // ─── Month picker selection ───
  const handleMonthSelect = useCallback((year: number, month: number) => {
    setNavYear(year);
    setNavMonth(month);
    setNavWeekInMonth(0);
    setWeekPage(0);
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTo({ left: 0, behavior: "instant" as ScrollBehavior });
      }
    }, 50);
  }, []);

  // ─── Week navigation ───
  const goToWeek = useCallback(
    (newWeekInMonth: number) => {
      setNavWeekInMonth(newWeekInMonth);
      setWeekPage(0);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ left: 0, behavior: "instant" as ScrollBehavior });
        }
      }, 50);
    },
    []
  );

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

  // ─── Form submit ───
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

  // ─── Scroll tracking ───
  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollLeft, clientWidth } = scrollRef.current;
    const page = Math.round(scrollLeft / clientWidth);
    setWeekPage(page);
  }, []);

  const snapTo = useCallback(
    (page: number) => {
      if (!scrollRef.current) return;
      scrollRef.current.scrollTo({
        left: page * scrollRef.current.clientWidth,
        behavior: "smooth",
      });
    },
    []
  );

  // ─── Labels ───
  const monthLabel = `${MONTHS_IT[weekStart.getMonth()]} ${weekStart.getFullYear()}`;
  const nextMonthLabel = `${MONTHS_IT[nextWeekStartDate.getMonth()]} ${nextWeekStartDate.getFullYear()}`;

  // Total weeks in current nav month
  const lastDayOfMonth = new Date(navYear, navMonth + 1, 0);
  const lastMondayOfMonth = getWeekStart(lastDayOfMonth);
  const totalWeeks =
    Math.round(
      (lastMondayOfMonth.getTime() - firstMondayOfMonth.getTime()) /
        (7 * 24 * 60 * 60 * 1000)
    ) + 1;

  const canGoPrev = navWeekInMonth > 0;
  const canGoNext = navWeekInMonth < totalWeeks - 1;

  return (
    <div className="h-dvh flex flex-col bg-[var(--color-surface)] overflow-hidden">
      {/* ── Header ── */}
      <header className="notch-top px-5 pb-2 shrink-0">
        <div className="flex items-baseline justify-between">
          <div>
            <h1 className="text-[22px] font-bold text-[var(--color-text-primary)] tracking-tight">
              Calendario
            </h1>
            <p className="text-sm text-[var(--color-text-tertiary)] mt-0.5 capitalize">
              {today.toLocaleDateString("it", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
          {!isCurrentWeek && (
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

      {/* ── Month label (tappable → picker) + week nav ── */}
      <div className="flex items-center justify-between px-5 pb-1 shrink-0">
        <button
          onClick={() => setMonthPickerOpen(true)}
          className="flex items-center gap-1.5 active:opacity-70 transition-opacity"
        >
          <h2 className="text-sm font-semibold text-[var(--color-text-secondary)] tracking-wide uppercase">
            {monthLabel}
          </h2>
          <span className="text-[10px] text-[var(--color-text-tertiary)]">▼</span>
        </button>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => goToWeek(navWeekInMonth - 1)}
            disabled={!canGoPrev}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-text-tertiary)] disabled:opacity-20 transition-opacity active:bg-[var(--color-surface-secondary)]"
          >
            ‹
          </button>
          <div className="flex gap-1.5">
            <button
              onClick={() => snapTo(0)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                weekPage === 0
                  ? "bg-[var(--color-accent)] w-5"
                  : "bg-[var(--color-surface-tertiary)]"
              }`}
            />
            <button
              onClick={() => snapTo(1)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                weekPage === 1
                  ? "bg-[var(--color-accent)] w-5"
                  : "bg-[var(--color-surface-tertiary)]"
              }`}
            />
          </div>
          <button
            onClick={() => goToWeek(navWeekInMonth + 1)}
            disabled={!canGoNext}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-text-tertiary)] disabled:opacity-20 transition-opacity active:bg-[var(--color-surface-secondary)]"
          >
            ›
          </button>
        </div>
      </div>

      {/* ── Weekday labels ── */}
      <div className="flex px-4 pb-1.5 shrink-0">
        {WEEKDAY_LABELS.map((l, i) => (
          <div
            key={l}
            className={`flex-1 text-center text-[11px] font-bold tracking-wider ${
              i >= 5
                ? "text-[var(--color-text-tertiary)]/50"
                : "text-[var(--color-text-tertiary)]"
            }`}
          >
            {l}
          </div>
        ))}
      </div>

      {/* ── Week panels ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden snap-x snap-mandatory"
        onScroll={handleScroll}
      >
        <div className="flex h-full">
          <WeekPanel dates={weekDates} events={events} isCurrent={isCurrentWeek && weekPage === 0} />
          <WeekPanel dates={nextWeekDates} events={events} isCurrent={isCurrentWeek && weekPage === 1} />
        </div>
      </div>

      {/* ── Week indicator ── */}
      <div className="text-center py-1.5 shrink-0">
        <p className="text-[11px] font-semibold text-[var(--color-text-tertiary)] tracking-wide uppercase">
          {weekPage === 0
            ? `Settimana ${navWeekInMonth + 1} · ${monthLabel}`
            : nextMonthLabel}
        </p>
      </div>

      {/* ── Bottom bar ── */}
      <div className="pb-safe px-5 pt-1 shrink-0">
        <button
          onClick={openSheet}
          className="w-full py-3.5 bg-[var(--color-accent)] text-black rounded-2xl font-semibold text-[15px] active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          <span className="text-lg leading-none">+</span>
          Nuovo evento
        </button>
      </div>

      {/* ── Month Picker Sheet ── */}
      <MonthPicker
        open={monthPickerOpen}
        onClose={() => setMonthPickerOpen(false)}
        onSelect={handleMonthSelect}
        currentMonth={navMonth}
        currentYear={navYear}
      />

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
