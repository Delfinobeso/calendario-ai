"use client";

export type MainView = "agenda" | "week" | "month" | "settings";

// Ordine dock v2.5: Agenda · Settimana · [+] · Mese · Impostazioni — lo slot
// centrale (azione "+") si inserisce tra le prime due tab e le ultime due.
const TABS_LEFT: { key: MainView; label: string; icon: string }[] = [
  { key: "agenda", label: "Agenda", icon: "agenda" },
  { key: "week", label: "Settimana", icon: "week" },
];
const TABS_RIGHT: { key: MainView; label: string; icon: string }[] = [
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

function PlusIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--flare-hi)" strokeWidth="2" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function Tab({ tab, active, onSelect }: { tab: { key: MainView; label: string; icon: string }; active: boolean; onSelect: (v: MainView) => void }) {
  return (
    <button
      onClick={() => onSelect(tab.key)}
      aria-label={tab.label}
      aria-current={active ? "page" : undefined}
      className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-[3px] rounded-[25px] px-1 py-1"
      style={{
        backgroundColor: active ? "var(--tab-pill)" : "transparent",
        color: active ? "var(--text-1)" : "var(--text-2)",
        transitionProperty: "background-color,color",
        transitionDuration: "var(--dur-fast)",
        transitionTimingFunction: "var(--ease-snap)",
      }}
    >
      <Icon name={tab.icon} />
      <span className="whitespace-nowrap text-[10px] font-semibold leading-none tracking-[-0.01em]">
        {tab.label}
      </span>
    </button>
  );
}

// Bottom Dock ORBIT v2.5 (spec §8.5): inset piatto 22px su left/right/bottom
// (libera da solo l'home indicator, MAI sommare env(safe-area-inset-bottom)),
// raggio concentrico barra/pillola 33/25, 5 slot fissi flex:1 1 0 (zero
// animazioni di layout), altezza tab 56px, icona 24px + label 10px sotto
// sempre visibile. Attiva = enfasi NEUTRA sull'intero slot (pillola
// --tab-pill, testo/icona text-1), MAI un tint rosso sulle tab: l'accent nel
// dock vive SOLO nell'icona dell'azione centrale "+" (vetro neutro
// --surface-3, pattern .dock-center-btn congelato — riferimento
// /media/SSD-256/AppData/workspace/Budgy/index.html). Il "+" apre sempre lo
// sheet "Nuovo appuntamento", identico su ogni tab, e non partecipa allo
// stato attivo/inattivo delle tab.
export default function TabBar({ active, onSelect, onAddNew, hidden = false }: {
  active: MainView;
  onSelect: (v: MainView) => void;
  onAddNew: () => void;
  hidden?: boolean;
}) {
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
      {TABS_LEFT.map((t) => (
        <Tab key={t.key} tab={t} active={active === t.key} onSelect={onSelect} />
      ))}

      <div className="flex flex-1 items-center justify-center">
        {/* wrapper: solleva ~10px sopra il filo della barra (§8.5) senza
            interferire col transform di press del bottone interno (uno
            style inline sul transform vincerebbe sempre su active:scale) */}
        <div style={{ transform: "translateY(-10px)" }}>
          <button
            type="button"
            onClick={onAddNew}
            aria-label="Nuovo appuntamento"
            className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-full active:scale-[0.97]"
            style={{
              background: "var(--surface-3)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              border: "1px solid var(--hairline)",
              boxShadow: "0 6px 18px oklch(0% 0 0 / .35)",
              transitionProperty: "transform",
              transitionDuration: "var(--dur-fast)",
              transitionTimingFunction: "var(--ease-snap)",
            }}
          >
            <PlusIcon />
          </button>
        </div>
      </div>

      {TABS_RIGHT.map((t) => (
        <Tab key={t.key} tab={t} active={active === t.key} onSelect={onSelect} />
      ))}
    </nav>
  );
}
