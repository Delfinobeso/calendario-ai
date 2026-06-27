import type { CalendarEvent } from "@/store/calendar";

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  sopralluogo: ["sopralluogo", "sopraluogo", "rilievo", "misura", "perizia", "accatastamento", "cantiere"],
  pratica: ["catasto", "catastale", "comune", "pratica", "scia", "cila", "permesso", "protocollo", "documenti"],
  riunione: ["riunione", "meeting", "incontro", "appuntamento", "cliente", "call"],
  personale: ["cena", "pranzo", "compleanno", "famiglia", "medico", "dentista", "palestra", "ferie", "aperitivo"],
  scadenza: ["scadenza", "consegna", "deadline", "pagamento", "pagare", "bolletta", "f24", "termine", "rata"],
};

function inferCategory(lower: string): string {
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some((w) => lower.includes(w))) return cat;
  }
  return "";
}

function inferRecurrence(lower: string): string {
  if (/ogni\s+giorn|tutti i giorni|quotidian/.test(lower)) return "daily";
  if (/ogni\s+settiman|ogni\s+(lun|mart|merc|giov|ven|sab|domenic)|settimanal/.test(lower)) return "weekly";
  if (/ogni\s+mese|mensil/.test(lower)) return "monthly";
  if (/ogni\s+anno|tutti gli anni|annual/.test(lower)) return "yearly";
  return "";
}

function inferReminder(lower: string, category: string): number {
  const m = lower.match(/(?:ricorda|avvisa|promemoria).{0,20}?(\d{1,3})\s*(min|or|giorn)/);
  if (m) {
    const n = parseInt(m[1]); const u = m[2];
    if (u.startsWith("min")) return n;
    if (u.startsWith("or")) return n * 60;
    if (u.startsWith("giorn")) return n * 1440;
  }
  if (/giorno prima/.test(lower)) return 1440;
  // sensible default per category
  return { sopralluogo: 60, riunione: 60, scadenza: 1440, personale: 30 }[category as string] ?? 0;
}

// Naive local ISO ("YYYY-MM-DDTHH:mm:ss") — no UTC shift, consistent with the manual form and backend.
function toLocalISO(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
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

  if (lower.includes("dopodomani")) {
    targetDate.setDate(now.getDate() + 2);
  } else if (lower.includes("domani")) {
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
  const dayNames = ["lunedì", "lunedi", "martedì", "martedi", "mercoledì", "mercoledi", "giovedì", "giovedi", "venerdì", "venerdi", "sabato", "domenica", "dopodomani", "domani", "oggi"];
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

  const category = inferCategory(lower);
  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    location: "",
    description: "",
    category,
    recurrence: inferRecurrence(lower) as CalendarEvent["recurrence"],
    reminder_minutes: inferReminder(lower, category),
    start_time: toLocalISO(start_time),
    end_time: toLocalISO(end_time),
    source: "ai",
  };
}
