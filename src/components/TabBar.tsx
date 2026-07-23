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
  const common = { width: 28, height: 28, viewBox: "0 0 24 24", fill: "currentColor" }; /* glifi FILLED, validati a screenshot vs App Store */
  if (name === "agenda") return (
    <svg {...common}><rect x="3.5" y="5" width="17" height="2.6" rx="1.3" /><rect x="3.5" y="10.7" width="17" height="2.6" rx="1.3" /><rect x="3.5" y="16.4" width="11" height="2.6" rx="1.3" /></svg>
  );
  if (name === "week") return (
    <svg {...common}><path fillRule="evenodd" d="M7 2.5a1.2 1.2 0 0 1 1.2 1.2v.8h7.6v-.8a1.2 1.2 0 0 1 2.4 0v.8h.3A2.5 2.5 0 0 1 21 7v10a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17V7a2.5 2.5 0 0 1 2.5-2.5h.3v-.8A1.2 1.2 0 0 1 7 2.5ZM4.8 9.5h14.4V17a.7.7 0 0 1-.7.7H5.5a.7.7 0 0 1-.7-.7V9.5Z" /></svg>
  );
  if (name === "month") return (
    <svg {...common}><rect x="3" y="4.5" width="18" height="15" rx="2.5" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /><circle cx="8" cy="14" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" /><circle cx="16" cy="14" r="1" fill="currentColor" stroke="none" /></svg>
  );
  if (name === "plus") return (
    <svg {...common}><path d="M12 4.2a1.3 1.3 0 0 1 1.3 1.3v5.2h5.2a1.3 1.3 0 0 1 0 2.6h-5.2v5.2a1.3 1.3 0 0 1-2.6 0v-5.2H5.5a1.3 1.3 0 0 1 0-2.6h5.2V5.5A1.3 1.3 0 0 1 12 4.2Z" /></svg>
  );
  return (
    <svg {...common}>
      <path fillRule="evenodd" d="M10.3 2.5a1 1 0 0 0-1 .84l-.3 1.9a7.6 7.6 0 0 0-1.6.93l-1.8-.68a1 1 0 0 0-1.22.44l-1.7 2.94a1 1 0 0 0 .23 1.28l1.5 1.22a7.7 7.7 0 0 0 0 1.86l-1.5 1.22a1 1 0 0 0-.23 1.28l1.7 2.94a1 1 0 0 0 1.22.44l1.8-.68c.5.38 1.03.7 1.6.93l.3 1.9a1 1 0 0 0 1 .84h3.4a1 1 0 0 0 1-.84l.3-1.9a7.6 7.6 0 0 0 1.6-.93l1.8.68a1 1 0 0 0 1.22-.44l1.7-2.94a1 1 0 0 0-.23-1.28l-1.5-1.22a7.7 7.7 0 0 0 0-1.86l1.5-1.22a1 1 0 0 0 .23-1.28l-1.7-2.94a1 1 0 0 0-1.22-.44l-1.8.68a7.6 7.6 0 0 0-1.6-.93l-.3-1.9a1 1 0 0 0-1-.84h-3.4ZM12 15.4a3.4 3.4 0 1 1 0-6.8 3.4 3.4 0 0 1 0 6.8Z" />
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
        color: tinted ? "var(--flare-hi)" : "oklch(93% 0 0)",
        transitionProperty: "color",
        transitionDuration: "var(--dur-fast)",
        transitionTimingFunction: "var(--ease-snap)",
      }}
    >
      {/* alone circolare App Store: Ø52, dietro icona+label, solo opacity in transizione */}
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[50px] w-[calc(100%-10px)] -translate-x-1/2 -translate-y-1/2 rounded-[25px]"
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
      className="glass-2 fixed left-[22px] right-[22px] bottom-[22px] z-30 mx-auto flex h-[60px] max-w-md items-stretch rounded-[30px] px-1.5"
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
