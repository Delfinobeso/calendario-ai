"use client";

// Motivo di famiglia — anello di stato (spec §7). Stroke 2.5px, gap 3px dal
// contenuto, stroke-linecap round. Classi esplicite .ring / .ring-icon così il
// selettore non cattura mai l'icona interna (bug reale v1 già preso altrove).
type RingState = "solid" | "arc" | "pulse" | "dashed";

export default function Ring({
  state,
  percent = 0,
  size = 44,
  children,
}: {
  state: RingState;
  percent?: number; // 0-100, solo per state="arc"
  size?: number;
  children?: React.ReactNode;
}) {
  const stroke = 2.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, percent)) / 100) * c;

  const color =
    state === "solid" ? "var(--signal)" :
    state === "pulse" ? "var(--ember)" :
    state === "dashed" ? "var(--text-3)" :
    "var(--flare-hi)";

  return (
    <span className="relative inline-flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      <svg
        className={`status-ring absolute inset-0 ${state === "pulse" ? "ring-pulse" : ""}`}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        {state === "dashed" ? (
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray="4 3" strokeLinecap="round"
          />
        ) : state === "arc" ? (
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dashoffset 600ms var(--ease-orbit)" }}
          />
        ) : (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" />
        )}
      </svg>
      {children && <span className="ring-icon relative flex items-center justify-center">{children}</span>}
    </span>
  );
}
