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

export function parseLocally(text: string): Omit<CalendarEvent, "id"> {
  const now = new Date();
  const lower = text.toLowerCase();

  // Estrai orario
  const timeMatch = text.match(/alle\s+(\d{1,2})(?:[.:](\d{2}))?/i);
  let hour = 9, minute = 0;
  if (timeMatch) {
    hour = parseInt(timeMatch[1]);
    minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
  }

  // Estrai giorno della settimana
  const dayMap = new Map<string, number>([
    ["lunedì", 1], ["lunedi", 1],
    ["martedì", 2], ["martedi", 2],
    ["mercoledì", 3], ["mercoledi", 3],
    ["giovedì", 4], ["giovedi", 4],
    ["venerdì", 5], ["venerdi", 5],
    ["sabato", 6],
    ["domenica", 0],
  ]);

  const targetDate = new Date(now);

  if (lower.includes("domani")) {
    targetDate.setDate(now.getDate() + 1);
  } else if (!lower.includes("oggi")) {
    for (const [name, day] of dayMap) {
      if (lower.includes(name)) {
        const cd = now.getDay();
        let diff = day - cd;
        if (diff <= 0) diff += 7;
        targetDate.setDate(now.getDate() + diff);
        break;
      }
    }
  }

  // Pulisci titolo
  const dayNames = ["lunedì", "lunedi", "martedì", "martedi", "mercoledì", "mercoledi", "giovedì", "giovedi", "venerdì", "venerdi", "sabato", "domenica", "domani", "oggi"];
  let title = text;
  for (const dn of dayNames) {
    title = title.replace(new RegExp(dn, "gi"), "");
  }
  title = title.replace(/alle\s+\d{1,2}(?:[.:]\d{2})?/gi, "");
  title = title.replace(/\s{2,}/g, " ").trim();

  if (!title) title = "Evento";

  const start_time = new Date(targetDate);
  start_time.setHours(hour, minute, 0, 0);
  const end_time = new Date(start_time);
  end_time.setHours(start_time.getHours() + 1);

  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    location: "",
    description: "",
    start_time: start_time.toISOString(),
    end_time: end_time.toISOString(),
    source: "ai",
  };
}
