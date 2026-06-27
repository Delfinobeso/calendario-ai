import { create } from "zustand";

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
  _unsynced?: boolean; // client-only: created/updated while offline, awaiting push
}

interface CalendarStore {
  events: CalendarEvent[];
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
  loadToday: () => Promise<void>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
const CACHE_KEY = "calendario-events-cache";

// ── Local cache (offline-first: the calendar is never blank, even if the NAS is down) ──
function readCache(): { events: CalendarEvent[]; pendingDeletes: number[] } {
  if (typeof window === "undefined") return { events: [], pendingDeletes: [] };
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { events: [], pendingDeletes: [] };
    const p = JSON.parse(raw);
    return { events: p.events ?? [], pendingDeletes: p.pendingDeletes ?? [] };
  } catch {
    return { events: [], pendingDeletes: [] };
  }
}
function writeCache(events: CalendarEvent[], pendingDeletes: number[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ events, pendingDeletes }));
  } catch { /* quota / private mode — ignore */ }
}

// Strip client-only fields before sending to the backend.
function toPayload(e: Partial<CalendarEvent>) {
  const { id, color, _unsynced, ...rest } = e;
  return rest;
}

async function fetchAPI(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) throw new Error("API error");
  return res.json();
}

export const useCalendar = create<CalendarStore>((set, get) => {
  const persist = () => {
    const { events, pendingDeletes } = get();
    writeCache(events, pendingDeletes);
  };

  // Push any locally-queued creates/updates/deletes to the backend (best effort).
  const flushQueue = async () => {
    if (!API_BASE) return;
    // creates/updates
    for (const ev of get().events.filter((e) => e._unsynced)) {
      try {
        if ((ev.id ?? 0) < 0) {
          const created: CalendarEvent = await fetchAPI("/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(toPayload(ev)),
          });
          set((s) => ({ events: s.events.map((e) => (e.id === ev.id ? created : e)) }));
        } else {
          const updated: CalendarEvent = await fetchAPI(`/events/${ev.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(toPayload(ev)),
          });
          set((s) => ({ events: s.events.map((e) => (e.id === ev.id ? updated : e)) }));
        }
      } catch { /* still offline — leave queued */ }
    }
    // deletes
    for (const id of [...get().pendingDeletes]) {
      try {
        const res = await fetch(`${API_BASE}/events/${id}`, { method: "DELETE" });
        if (res.ok || res.status === 404) {
          set((s) => ({ pendingDeletes: s.pendingDeletes.filter((d) => d !== id) }));
        }
      } catch { /* leave queued */ }
    }
    persist();
  };

  return {
    events: [],
    pendingDeletes: [],
    todayEvents: [],
    loading: false,
    selectedDate: new Date(),
    currentWeekStart: getWeekStart(new Date()),

    setSelectedDate: (d) => set({ selectedDate: d }),
    setCurrentWeekStart: (d) => set({ currentWeekStart: d }),

    loadEvents: async () => {
      // 1. Instant paint from cache (runs client-side, after hydration).
      const cached = readCache();
      if (cached.events.length || cached.pendingDeletes.length) {
        set({ events: cached.events, pendingDeletes: cached.pendingDeletes });
      }
      if (!API_BASE) return;

      // 2. Reconcile with the server.
      set({ loading: true });
      try {
        const server: CalendarEvent[] = await fetchAPI(`/events`);
        const deletes = get().pendingDeletes;
        const unsynced = get().events.filter((e) => e._unsynced);
        const merged = [
          ...server.filter((e) => !deletes.includes(e.id as number)),
          ...unsynced,
        ];
        set({ events: merged, loading: false });
        persist();
        await flushQueue();
      } catch {
        // Offline — keep whatever the cache gave us.
        set({ loading: false });
      }
    },

    addEvent: async (event) => {
      const tempId = -Date.now();
      const optimistic: CalendarEvent = { ...event, id: tempId, _unsynced: !!API_BASE };
      set((s) => ({
        events: [...s.events, optimistic],
        todayEvents: [...s.todayEvents, optimistic],
      }));
      persist();

      if (!API_BASE) return optimistic;
      try {
        const created: CalendarEvent = await fetchAPI("/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toPayload(event)),
        });
        set((s) => ({
          events: s.events.map((e) => (e.id === tempId ? created : e)),
          todayEvents: s.todayEvents.map((e) => (e.id === tempId ? created : e)),
        }));
        persist();
        return created;
      } catch {
        // Stay usable offline: keep the optimistic event queued, don't throw.
        return optimistic;
      }
    },

    removeEvent: async (id) => {
      const wasUnsyncedCreate = id < 0;
      set((s) => ({
        events: s.events.filter((e) => e.id !== id),
        todayEvents: s.todayEvents.filter((e) => e.id !== id),
        // Only server-backed events need a queued delete.
        pendingDeletes: wasUnsyncedCreate ? s.pendingDeletes : [...s.pendingDeletes, id],
      }));
      persist();
      if (!API_BASE || wasUnsyncedCreate) return;
      try {
        const res = await fetch(`${API_BASE}/events/${id}`, { method: "DELETE" });
        if (res.ok || res.status === 404) {
          set((s) => ({ pendingDeletes: s.pendingDeletes.filter((d) => d !== id) }));
          persist();
        }
      } catch { /* leave queued, retried on next load */ }
    },

    updateEvent: async (id, updates) => {
      set((s) => ({
        events: s.events.map((e) => (e.id === id ? { ...e, ...updates, _unsynced: !!API_BASE } : e)),
        todayEvents: s.todayEvents.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      }));
      persist();
      // Unsynced creates (temp id) get pushed whole by flushQueue — skip the PUT.
      if (!API_BASE || id < 0) return;
      try {
        const merged = get().events.find((e) => e.id === id);
        const updated: CalendarEvent = await fetchAPI(`/events/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(toPayload(merged ?? updates)),
        });
        set((s) => ({
          events: s.events.map((e) => (e.id === id ? updated : e)),
          todayEvents: s.todayEvents.map((e) => (e.id === id ? updated : e)),
        }));
        persist();
      } catch { /* keep optimistic + queued */ }
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
