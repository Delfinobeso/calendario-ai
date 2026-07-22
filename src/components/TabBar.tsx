"use client";

export type MainView = "agenda" | "week" | "month" | "settings";

// Dock v2.6 — GEOMETRIA APP STORE (decreto Aziz, identica in ogni app ORBIT):
// barra a pillola piena inset 22px / altezza 64px / raggio 32 (= metà altezza),
// padding orizzontale 6px, 5 slot TUTTI UGUALI flex:1 (il "+" è uno slot come
// gli altri, niente bottone centrale speciale). Selezionato = alone CIRCOLARE
// Ø52px (--tab-pill) dietro icona+label + tint --flare-hi su entrambe (come il
// tint blu dell'App Store); inattive --text-2. Solo colore/opacity in
// transizione, mai layout, mai scale sulle tab.
const TABS: { key: MainView | "add"; label: string; icon: string }[] = [
  { key: "agenda", label: "Agenda", icon: "agenda" },
  { key: "week", label: "Settimana", icon: "week" },
  { key: "add", label: "Nuovo", icon: "plus" },
  { key: "month", label: "Mese", icon: "month" },
  { key: "settings", label: "Impostazioni", icon: "gear" },
];

function Icon({ name }: { name: string }) {
  const common = { width: 28, height: 28, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "agenda") return (
    <svg {...common}><path d="M4 6h16M4 12h16M4 18h10" /></svg>
  );
  if (name === "week") return (
    <svg {...common}><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></svg>
  );
  if (name === "month") return (
    <svg {...common}><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /><circle cx="8" cy="14" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" /><circle cx="16" cy="14" r="1" fill="currentColor" stroke="none" /></svg>
  );
  if (name === "plus") return (
    <svg {...common} strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
  );
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function Slot({ label, icon, active, tinted, onPress }: { label: string; icon: string; active: boolean; tinted: boolean; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className="relative flex h-full flex-1 flex-col items-center justify-center gap-[3px] px-1"
      style={{
        color: tinted ? "var(--flare-hi)" : "var(--text-2)",
        transitionProperty: "color",
        transitionDuration: "var(--dur-fast)",
        transitionTimingFunction: "var(--ease-snap)",
      }}
    >
      {/* alone circolare App Store: Ø52, dietro icona+label, solo opacity in transizione */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[56px] w-[56px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: "var(--tab-pill)",
          opacity: active ? 1 : 0,
          transitionProperty: "opacity",
          transitionDuration: "var(--dur-fast)",
          transitionTimingFunction: "var(--ease-snap)",
        }}
      />
      <span className="relative"><Icon name={icon} /></span>
      <span className="relative whitespace-nowrap text-[10px] font-semibold leading-none tracking-[-0.01em]">{label}</span>
    </button>
  );
}

export default function TabBar({ active, onSelect, onAddNew, hidden = false }: {
  active: MainView;
  onSelect: (v: MainView) => void;
  onAddNew: () => void;
  hidden?: boolean;
}) {
  return (
    <nav
      className="glass-2 fixed left-[22px] right-[22px] bottom-[22px] z-30 mx-auto flex h-16 max-w-md items-stretch rounded-[32px] px-1.5"
      style={{
        transform: hidden ? "translateY(120%)" : "translateY(0)",
        opacity: hidden ? 0 : 1,
        transitionProperty: "transform,opacity",
        transitionDuration: "var(--dur-base)",
        transitionTimingFunction: "var(--ease-snap)",
      }}
    >
      {TABS.map((t) =>
        t.key === "add" ? (
          <Slot key="add" label={t.label} icon={t.icon} active={false} tinted onPress={onAddNew} />
        ) : (
          <Slot key={t.key} label={t.label} icon={t.icon} active={active === t.key} tinted={active === t.key} onPress={() => onSelect(t.key as MainView)} />
        )
      )}
    </nav>
  );
}
