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
}

interface CalendarStore {
  events: CalendarEvent[];
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

async function fetchAPI(path: string, options?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) throw new Error("API error");
  return res.json();
}

export const useCalendar = create<CalendarStore>((set) => ({
  events: [],
  todayEvents: [],
  loading: false,
  selectedDate: new Date(),
  currentWeekStart: getWeekStart(new Date()),

  setSelectedDate: (d) => set({ selectedDate: d }),
  setCurrentWeekStart: (d) => set({ currentWeekStart: d }),

  loadEvents: async (start?, end?) => {
    if (!API_BASE) return; // offline mode — keep local-only events
    set({ loading: true });
    try {
      const params = new URLSearchParams();
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      const events = await fetchAPI(`/events?${params}`);
      set({ events, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  addEvent: async (event) => {
    if (!API_BASE) {
      const local: CalendarEvent = { ...event, id: Date.now() };
      set((s) => ({ events: [...s.events, local], todayEvents: [...s.todayEvents, local] }));
      return local;
    }
    const created = await fetchAPI("/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    set((s) => ({
      events: [...s.events, created],
      todayEvents: [...s.todayEvents, created],
    }));
    return created;
  },

  removeEvent: async (id) => {
    if (API_BASE) {
      await fetch(`${API_BASE}/events/${id}`, { method: "DELETE" });
    }
    set((s) => ({
      events: s.events.filter((e) => e.id !== id),
      todayEvents: s.todayEvents.filter((e) => e.id !== id),
    }));
  },

  updateEvent: async (id, updates) => {
    if (!API_BASE) {
      set((s) => ({
        events: s.events.map((e) => (e.id === id ? { ...e, ...updates } : e)),
        todayEvents: s.todayEvents.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      }));
      return;
    }
    const updated = await fetchAPI(`/events/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    set((s) => ({
      events: s.events.map((e) => (e.id === id ? updated : e)),
      todayEvents: s.todayEvents.map((e) => (e.id === id ? updated : e)),
    }));
  },

  loadToday: async () => {
    if (!API_BASE) return;
    try {
      const events = await fetchAPI("/today");
      set({ todayEvents: events });
    } catch {}
  },
}));

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
