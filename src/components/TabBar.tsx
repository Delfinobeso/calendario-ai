"use client";

export type MainView = "agenda" | "week" | "month" | "settings";

const TABS: { key: MainView; label: string; icon: string }[] = [
  { key: "agenda", label: "Agenda", icon: "agenda" },
  { key: "week", label: "Settimana", icon: "week" },
  { key: "month", label: "Mese", icon: "month" },
  { key: "settings", label: "Impostazioni", icon: "gear" },
];

function Icon({ name }: { name: string }) {
  const common = { width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "agenda") return (
    <svg {...common}><path d="M4 6h16M4 12h16M4 18h10" /><circle cx="4" cy="6" r="0" /></svg>
  );
  if (name === "week") return (
    <svg {...common}><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></svg>
  );
  if (name === "month") return (
    <svg {...common}><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /><circle cx="8" cy="14" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" /><circle cx="16" cy="14" r="1" fill="currentColor" stroke="none" /></svg>
  );
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

// Bottom Dock ORBIT (spec §8.5, pattern CONGELATO — identico a Kino/Budgy):
// inset piatto 22px su left/right/bottom (libera da solo l'home indicator, MAI
// sommare env(safe-area-inset-bottom)), raggio concentrico barra/pillola 33/25,
// 4 slot fissi flex:1 1 0 (zero animazioni di layout), altezza tab 56px, icona
// 24px + label 10px sotto sempre visibile. Attiva = enfasi NEUTRA sull'intero
// slot (pillola --tab-pill, testo/icona text-1), MAI un tint rosso: l'accent
// nel dock non vive qui (nessuna azione centrale "+" — il "+" vive nella top
// bar della vista corrente).
export default function TabBar({ active, onSelect, hidden = false }: { active: MainView; onSelect: (v: MainView) => void; hidden?: boolean }) {
  return (
    <nav
      className="glass-2 fixed left-[22px] right-[22px] bottom-[22px] z-30 mx-auto flex max-w-md gap-0.5 rounded-[33px] p-2"
      style={{
        transform: hidden ? "translateY(120%)" : "translateY(0)",
        opacity: hidden ? 0 : 1,
        transitionProperty: "transform,opacity",
        transitionDuration: "var(--dur-base)",
        transitionTimingFunction: "var(--ease-snap)",
      }}
    >
      {TABS.map((t) => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onSelect(t.key)}
            aria-label={t.label}
            aria-current={isActive ? "page" : undefined}
            className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-[3px] rounded-[25px] px-1 py-1"
            style={{
              backgroundColor: isActive ? "var(--tab-pill)" : "transparent",
              color: isActive ? "var(--text-1)" : "var(--text-2)",
              transitionProperty: "background-color,color",
              transitionDuration: "var(--dur-fast)",
              transitionTimingFunction: "var(--ease-snap)",
            }}
          >
            <Icon name={t.icon} />
            <span className="whitespace-nowrap text-[10px] font-semibold leading-none tracking-[-0.01em]">
              {t.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
