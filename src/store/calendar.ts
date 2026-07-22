import { create } from "zustand";

export type Recurrence = "" | "daily" | "weekly" | "monthly" | "yearly";
export type EventKind = "event" | "todo";

export interface CalendarEvent {
  id?: number;
  title: string;
  location: string;
  description: string;
  start_time: string;
  end_time: string;
  source: string;
  color?: string;
  category?: string;
  recurrence?: Recurrence;
  recurrence_until?: string | null;
  reminder_minutes?: number;
  kind?: EventKind;       // "event" (default) | "todo" — attività senza orario, spuntabile
  completed?: boolean;    // solo rilevante per kind: "todo"
  _unsynced?: boolean;   // client-only: created/updated offline, awaiting push
  master_id?: number;    // client-only: set on generated recurrence occurrences
  _occurrence?: boolean; // client-only: this is a generated occurrence, not a stored row
}

interface CalendarStore {
  masters: CalendarEvent[];        // canonical rows (persisted + synced)
  events: CalendarEvent[];         // expanded for the views (recurrence occurrences materialised)
  pendingDeletes: number[];
  todayEvents: CalendarEvent[];
  loading: boolean;
  selectedDate: Date;
  currentWeekStart: Date;
  setSelectedDate: (d: Date) => void;
  setCurrentWeekStart: (d: Date) => void;
  loadEvents: (start?: string, end?: string) => Promise<void>;
  addEvent: (event: Omit<CalendarEvent, "id">) => Promise<CalendarEvent>;
  removeEvent: (id: number) => Promise<void>;
  updateEvent: (id: number, event: Partial<CalendarEvent>) => Promise<void>;
  toggleTodoComplete: (id: number) => Promise<void>;
  loadToday: () => Promise<void>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const CACHE_KEY = "calendario-events-cache";

// ── Recurrence expansion ──────────────────────────────────────────────────
function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  const day = r.getDate();
  r.setDate(1);
  r.setMonth(r.getMonth() + n);
  r.setDate(Math.min(day, new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate()));
  return r;
}

/** Materialise recurrence occurrences within [horizonStart, horizonEnd]. */
function expand(masters: CalendarEvent[], horizonStart: Date, horizonEnd: Date): CalendarEvent[] {
  const out: CalendarEvent[] = [];
  for (const m of masters) {
    if (!m.recurrence) { out.push(m); continue; }
    const baseStart = new Date(m.start_time);
    const baseEnd = new Date(m.end_time);
    const durationMs = baseEnd.getTime() - baseStart.getTime();
    const until = m.recurrence_until ? new Date(m.recurrence_until) : null;
    let cur = new Date(baseStart);
    let guard = 0;
    while (cur <= horizonEnd && guard < 4000) {
      guard++;
      if (until && cur > until) break;
      if (cur >= horizonStart) {
        const occEnd = new Date(cur.getTime() + durationMs);
        out.push({
          ...m,
          start_time: localISO(cur),
          end_time: localISO(occEnd),
          master_id: m.id,
          _occurrence: true,
        });
      }
      if (m.recurrence === "daily") cur = new Date(cur.getTime() + 86400000);
      else if (m.recurrence === "weekly") cur = new Date(cur.getTime() + 7 * 86400000);
      else if (m.recurrence === "monthly") cur = addMonths(cur, 1);
      else if (m.recurrence === "yearly") cur = addMonths(cur, 12);
      else break;
    }
  }
  return out;
}

function localISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

function expandHorizon(masters: CalendarEvent[]): CalendarEvent[] {
  const now = new Date();
  const start = new Date(now.getFullYear() - 1, 0, 1);
  const end = new Date(now.getFullYear() + 2, 11, 31);
  return expand(masters, start, end);
}

// ── Local cache (offline-first: the calendar is never blank) ──────────────
function readCache(): { masters: CalendarEvent[]; pendingDeletes: number[] } {
  if (typeof window === "undefined") return { masters: [], pendingDeletes: [] };
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { masters: [], pendingDeletes: [] };
    const p = JSON.parse(raw);
    return { masters: p.masters ?? p.events ?? [], pendingDeletes: p.pendingDeletes ?? [] };
  } catch {
    return { masters: [], pendingDeletes: [] };
  }
}
function writeCache(masters: CalendarEvent[], pendingDeletes: number[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ masters, pendingDeletes }));
  } catch { /* quota / private mode — ignore */ }
}

function toPayload(e: Partial<CalendarEvent>) {
  const { id, color, _unsynced, master_id, _occurrence, ...rest } = e;
  return rest;
}

async function fetchAPI(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) throw new Error("API error");
  return res.json();
}

export const useCalendar = create<CalendarStore>((set, get) => {
  // Re-derive the expanded view list + persist the canonical masters.
  const commit = (masters: CalendarEvent[], pendingDeletes = get().pendingDeletes) => {
    set({ masters, pendingDeletes, events: expandHorizon(masters) });
    writeCache(masters, pendingDeletes);
  };

  const flushQueue = async () => {
    if (!API_BASE) return;
    for (const ev of get().masters.filter((e) => e._unsynced)) {
      try {
        if ((ev.id ?? 0) < 0) {
          const created: CalendarEvent = await fetchAPI("/events", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(toPayload(ev)),
          });
          commit(get().masters.map((e) => (e.id === ev.id ? created : e)));
        } else {
          const updated: CalendarEvent = await fetchAPI(`/events/${ev.id}`, {
            method: "PUT", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(toPayload(ev)),
          });
          commit(get().masters.map((e) => (e.id === ev.id ? updated : e)));
        }
      } catch { /* still offline — leave queued */ }
    }
    for (const id of [...get().pendingDeletes]) {
      try {
        const res = await fetch(`${API_BASE}/events/${id}`, { method: "DELETE" });
        if (res.ok || res.status === 404) {
          commit(get().masters, get().pendingDeletes.filter((d) => d !== id));
        }
      } catch { /* leave queued */ }
    }
  };

  return {
    masters: [],
    events: [],
    pendingDeletes: [],
    todayEvents: [],
    loading: false,
    selectedDate: new Date(),
    currentWeekStart: getWeekStart(new Date()),

    setSelectedDate: (d) => set({ selectedDate: d }),
    setCurrentWeekStart: (d) => set({ currentWeekStart: d }),

    loadEvents: async () => {
      // 1. Instant paint from cache (client-side, after hydration).
      const cached = readCache();
      if (cached.masters.length || cached.pendingDeletes.length) {
        commit(cached.masters, cached.pendingDeletes);
      }
      if (!API_BASE) return;

      // 2. Reconcile with the server.
      set({ loading: true });
      try {
        const server: CalendarEvent[] = await fetchAPI(`/events`);
        const deletes = get().pendingDeletes;
        const unsynced = get().masters.filter((e) => e._unsynced);
        const merged = [
          ...server.filter((e) => !deletes.includes(e.id as number)),
          ...unsynced,
        ];
        commit(merged);
        set({ loading: false });
        await flushQueue();
      } catch {
        set({ loading: false });
      }
    },

    addEvent: async (event) => {
      const tempId = -Date.now();
      const optimistic: CalendarEvent = { ...event, id: tempId, _unsynced: !!API_BASE };
      commit([...get().masters, optimistic]);

      if (!API_BASE) return optimistic;
      try {
        const created: CalendarEvent = await fetchAPI("/events", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toPayload(event)),
        });
        commit(get().masters.map((e) => (e.id === tempId ? created : e)));
        return created;
      } catch {
        return optimistic; // stay usable offline, queued
      }
    },

    removeEvent: async (id) => {
      const wasUnsyncedCreate = id < 0;
      const masters = get().masters.filter((e) => e.id !== id);
      const pendingDeletes = wasUnsyncedCreate ? get().pendingDeletes : [...get().pendingDeletes, id];
      commit(masters, pendingDeletes);
      if (!API_BASE || wasUnsyncedCreate) return;
      try {
        const res = await fetch(`${API_BASE}/events/${id}`, { method: "DELETE" });
        if (res.ok || res.status === 404) {
          commit(get().masters, get().pendingDeletes.filter((d) => d !== id));
        }
      } catch { /* leave queued */ }
    },

    updateEvent: async (id, updates) => {
      commit(get().masters.map((e) => (e.id === id ? { ...e, ...updates, _unsynced: !!API_BASE } : e)));
      if (!API_BASE || id < 0) return;
      try {
        const merged = get().masters.find((e) => e.id === id);
        const updated: CalendarEvent = await fetchAPI(`/events/${id}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toPayload(merged ?? updates)),
        });
        commit(get().masters.map((e) => (e.id === id ? updated : e)));
      } catch { /* keep optimistic + queued */ }
    },

    toggleTodoComplete: async (id) => {
      const cur = get().masters.find((e) => e.id === id);
      if (!cur) return;
      const willComplete = !cur.completed;
      // Archivio nel giorno di completamento (feedback Aziz, §1): un'attività
      // in rollover da un giorno passato, quando viene spuntata, si "sposta"
      // a oggi (start_time/end_time) così resta salvata con la ✓ nel giorno
      // in cui è stata fatta davvero. Se si de-spunta, resta dov'è — nessun
      // ripristino della data originale.
      if (willComplete) {
        const today = new Date();
        if (dateOnly(new Date(cur.start_time)) < dateOnly(today)) {
          const todayStr = localISO(today).slice(0, 10);
          await get().updateEvent(id, {
            completed: true,
            start_time: `${todayStr}T09:00:00`,
            end_time: `${todayStr}T09:00:00`,
          });
          return;
        }
      }
      await get().updateEvent(id, { completed: willComplete });
    },

    loadToday: async () => {
      if (!API_BASE) return;
      try {
        const events = await fetchAPI("/today");
        set({ todayEvents: events });
      } catch { /* keep cache */ }
    },
  };
});

export function getWeekStart(d: Date): Date {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
}

export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });
}

export function isToday(d: Date): boolean {
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("it", { hour: "2-digit", minute: "2-digit" });
}

export function getEventsForDay(events: CalendarEvent[], date: Date): CalendarEvent[] {
  return events.filter((e) => isSameDay(new Date(e.start_time), date));
}

function dateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Rollover CLIENT-SIDE (mai riscritto sul server): attività (kind:"todo") non
 * completate la cui data è oggi o precedente. Confluiscono nella sezione
 * "Da fare" della vista Agenda indipendentemente dal giorno che l'utente sta
 * guardando — la data reale del server non cambia mai.
 */
export function getRolloverTodos(events: CalendarEvent[], today: Date): CalendarEvent[] {
  const todayOnly = dateOnly(today);
  return events
    .filter((e) => e.kind === "todo" && !e.completed && dateOnly(new Date(e.start_time)) <= todayOnly)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
}

/** Eventi/attività di un giorno FUTURO rispetto a oggi, escludendo le attività
 * già coperte dal rollover (che vivono solo nella sezione "Da fare"). */
export function getDayItemsExcludingRollover(events: CalendarEvent[], date: Date, today: Date): CalendarEvent[] {
  const dayEvents = getEventsForDay(events, date);
  if (dateOnly(date) <= dateOnly(today)) {
    return dayEvents.filter((e) => e.kind !== "todo");
  }
  return dayEvents;
}
