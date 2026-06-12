import { CalendarEvent } from "@/store/calendar";

export const HOUR_HEIGHT = 60;
export const GAP_HEIGHT = 32;

export const COLORS = ["#c9a820", "#e04080", "#20c0a0", "#6c5ce7", "#e17055"];
export function getColor(idx: number) {
  return COLORS[idx % COLORS.length];
}

export type Segment =
  | { type: "hour"; hour: number; height: number }
  | { type: "gap"; hours: number[]; height: number };

// Builds a per-hour timeline where hours with no nearby events (and not the
// current hour) collapse into a single small divider, so empty hours don't
// waste vertical space while the timeline still spans 00–23.
export function buildSegments(dayEvents: CalendarEvent[], includeHour: number | null): Segment[] {
  const anchors = new Set<number>();
  for (const ev of dayEvents) {
    const s = new Date(ev.start_time);
    const e = new Date(ev.end_time);
    const sh = s.getHours();
    const eh = Math.max(sh, e.getHours());
    for (let h = Math.max(0, sh - 1); h <= Math.min(23, eh + 1); h++) anchors.add(h);
  }
  if (includeHour !== null) anchors.add(includeHour);

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
