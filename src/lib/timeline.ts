import { CalendarEvent } from "@/store/calendar";

// ── Single source of truth for event colors ──
// Apple Calendar-style: vibrant but distinguishable, WCAG AA on dark bg
export const COLORS = ["#51b1e7", "#f5a623", "#7ed321", "#e04080", "#6c5ce7"] as const;

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** Stable color per event (by id, falling back to title+start for unsaved events) — never positional, so it doesn't shift when other events are added/removed */
export function getEventColor(ev: { id?: number; color?: string; title: string; start_time: string }): string {
  if (ev.color) return ev.color;
  const key = ev.id != null ? String(ev.id) : `${ev.title}|${ev.start_time}`;
  return COLORS[hashString(key) % COLORS.length];
}

export const HOUR_HEIGHT = 60;
export const GAP_HEIGHT = 32;

/**
 * Start/end minute (0–1440) of an event within its start day's timeline.
 * Duration comes from the real timestamp difference, so an overnight event
 * (end_time on the next day) keeps its full length instead of collapsing to
 * 30min — it's simply capped at midnight (1440) since this slice belongs to
 * the start day. Zero/negative durations fall back to a 30min minimum block.
 */
export function getEventMinutes(ev: { start_time: string; end_time: string }): { startMin: number; endMin: number } {
  const s = new Date(ev.start_time), e = new Date(ev.end_time);
  const startMin = s.getHours() * 60 + s.getMinutes();
  const durationMin = Math.max(30, (e.getTime() - s.getTime()) / 60000);
  const endMin = Math.min(1440, startMin + durationMin);
  return { startMin, endMin };
}

export type Segment =
  | { type: "hour"; hour: number; height: number }
  | { type: "gap"; hours: number[]; height: number };

/** Build compressed timeline: hours near events stay tall, empty hours collapse */
export function buildSegments(dayEvents: CalendarEvent[], currentHour: number | null): Segment[] {
  const anchors = new Set<number>();
  for (const ev of dayEvents) {
    const { startMin, endMin } = getEventMinutes(ev);
    const sh = Math.floor(startMin / 60);
    const eh = Math.min(23, Math.floor((endMin - 1) / 60));
    for (let h = Math.max(0, sh - 1); h <= Math.min(23, eh + 1); h++) anchors.add(h);
  }
  if (currentHour !== null) anchors.add(currentHour);

  const segments: Segment[] = [];
  let h = 0;
  while (h < 24) {
    if (anchors.has(h)) {
      segments.push({ type: "hour", hour: h, height: HOUR_HEIGHT });
      h++;
    } else {
      const start = h;
      while (h < 24 && !anchors.has(h)) h++;
      segments.push({ type: "gap", hours: Array.from({ length: h - start }, (_, i) => start + i), height: GAP_HEIGHT });
    }
  }
  return segments;
}

export function computeTops(segments: Segment[]): { tops: number[]; totalHeight: number } {
  const tops: number[] = [];
  let acc = 0;
  for (const s of segments) {
    tops.push(acc);
    acc += s.height;
  }
  return { tops, totalHeight: acc };
}

/** Convert absolute minutes (0–1439) to Y position in compressed timeline */
export function timeToY(segments: Segment[], tops: number[], totalMinutes: number): number {
  const hour = Math.min(23, Math.floor(totalMinutes / 60));
  const minuteFrac = (totalMinutes - hour * 60) / 60;
  const idx = segments.findIndex((s) => (s.type === "hour" ? s.hour === hour : s.hours.includes(hour)));
  if (idx === -1) return 0;
  const seg = segments[idx];
  if (seg.type === "hour") return tops[idx] + minuteFrac * seg.height;
  const pos = seg.hours.indexOf(hour);
  return tops[idx] + ((pos + minuteFrac) / seg.hours.length) * seg.height;
}
