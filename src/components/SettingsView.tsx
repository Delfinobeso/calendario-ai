"use client";

import { useState, useEffect } from "react";
import { useSettings, type Font, FONT_FAMILIES } from "@/store/settings";
import { pushSupported, getSubscriptionState, enablePush, disablePush } from "@/lib/push";
import Ring from "@/components/Ring";
import pkg from "../../package.json";

const ACCENT_HUES = [27, 55, 145, 210, 260, 300, 350] as const;

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="px-1 pb-2 text-[13px] font-bold uppercase tracking-wide text-[var(--text-2)]">{children}</h2>;
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="glass-1 overflow-hidden rounded-[var(--r-md)]">{children}</div>;
}

// List row §8.3: min-height 52px, separatore hairline inset.
function Row({ children, last = false }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex min-h-[52px] items-center justify-between gap-3 px-4 py-3 ${last ? "" : "border-b"}`} style={{ borderColor: "var(--hairline)" }}>
      {children}
    </div>
  );
}

// Impostazioni — blueprint standard ORBIT §8.6, stessa struttura in tutte le
// app: solo il contenuto cambia. Ordine fisso Aspetto → Dati → App → Info
// (Sicurezza solo Kino, omessa qui). Nessun contenuto fuori da queste sezioni
// — la Profilo (Nome/Ruolo) del vecchio Settings.tsx non era usata da nessun
// altro punto dell'app (solo self-referenziale): ritirata per rispettare la
// regola "niente cassetto per feature orfane" (vedi report finale).
export default function SettingsView() {
  const { theme, font, setTheme, setFont } = useSettings();
  const [accentH, setAccentH] = useState<number>(27);

  useEffect(() => {
    const h = parseInt(localStorage.getItem("cal:accent") || "27", 10);
    if ((ACCENT_HUES as readonly number[]).includes(h)) setAccentH(h);
  }, []);

  const pickAccent = (h: number) => {
    setAccentH(h);
    localStorage.setItem("cal:accent", String(h));
    document.documentElement.style.setProperty("--accent-h", String(h));
  };

  return (
    <div className="h-full flex flex-col overflow-hidden enter-view">
      <header className="shrink-0 px-5 pt-1 pb-2">
        <h1 className="text-[22px] font-extrabold text-[var(--text-1)] tracking-tight">Impostazioni</h1>
      </header>

      <main className="flex-1 overflow-y-auto gpu-scroll px-4" style={{ paddingBottom: "180px" }}>
        <div className="flex flex-col gap-6">
          {/* 1 — Aspetto: tema (Calendario ha dark+light) + accent */}
          <section>
            <SectionLabel>Aspetto</SectionLabel>
            <Card>
              <Row>
                <span className="text-[15px] text-[var(--text-1)]">Tema</span>
                <div className="flex shrink-0 gap-1 rounded-full p-1" style={{ background: "var(--surface-1)" }}>
                  {(["dark", "light"] as const).map((t) => {
                    const on = theme === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setTheme(t)}
                        className="rounded-full px-3.5 py-1.5 text-[13px] font-semibold"
                        style={{
                          background: on ? "var(--surface-3)" : "transparent",
                          color: on ? "var(--text-1)" : "var(--text-2)",
                          transitionProperty: "background-color,color",
                          transitionDuration: "var(--dur-base)",
                          transitionTimingFunction: "var(--ease-orbit)",
                        }}
                      >
                        {t === "dark" ? "Scuro" : "Chiaro"}
                      </button>
                    );
                  })}
                </div>
              </Row>
              <Row last>
                <span className="text-[15px] text-[var(--text-1)]">Colore accent</span>
                <span className="flex shrink-0 gap-1.5">
                  {ACCENT_HUES.map((h) => (
                    <button key={h} onClick={() => pickAccent(h)} aria-label={`Accent ${h}`} className="flex h-11 w-8 items-center justify-center touch-target">
                      <span
                        className="block h-7 w-7 rounded-full"
                        style={{
                          background: `oklch(52% 0.2 ${h})`,
                          outline: accentH === h ? "2px solid var(--text-1)" : "none",
                          outlineOffset: 2,
                        }}
                      />
                    </button>
                  ))}
                </span>
              </Row>
            </Card>
          </section>

          {/* 2 — Dati: stato push con anello di stato §7 */}
          <section>
            <SectionLabel>Dati</SectionLabel>
            <NotificationCard />
          </section>

          {/* 4 — App: font selector esistente (feature reale di Aziz) */}
          <section>
            <SectionLabel>App</SectionLabel>
            <Card>
              <div className="p-3">
                <div className="flex gap-2">
                  {(["sans", "serif", "system"] as Font[]).map((f) => {
                    const on = font === f;
                    return (
                      <button
                        key={f}
                        onClick={() => setFont(f)}
                        className="flex-1 py-3 rounded-[var(--r-sm)] font-semibold text-[14px] active:scale-[0.97]"
                        style={{
                          background: on ? "var(--surface-3)" : "var(--surface-1)",
                          color: on ? "var(--text-1)" : "var(--text-2)",
                          fontFamily: FONT_FAMILIES[f],
                          transitionProperty: "background-color,color",
                          transitionDuration: "var(--dur-base)",
                          transitionTimingFunction: "var(--ease-orbit)",
                        }}
                      >
                        {f === "sans" ? "Sans Serif" : f === "serif" ? "Serif" : "System"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          </section>

          {/* 5 — Info */}
          <section>
            <SectionLabel>Info</SectionLabel>
            <Card>
              <Row last>
                <span className="text-[15px] text-[var(--text-3)]">Calendario AI</span>
                <span className="font-mono text-[13px] tabular-nums text-[var(--text-3)]">v{pkg.version}</span>
              </Row>
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}

function NotificationCard() {
  const [state, setState] = useState<"loading" | "unsupported" | "denied" | "subscribed" | "available">("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!pushSupported()) { setState("unsupported"); return; }
    getSubscriptionState().then(setState);
  }, []);

  const handleEnable = async () => {
    setBusy(true); setMsg("");
    const r = await enablePush();
    setBusy(false);
    if (r.ok) { setState("subscribed"); setMsg("Notifiche attive."); }
    else setMsg(r.error || "Errore.");
  };
  const handleDisable = async () => {
    setBusy(true); setMsg("");
    await disablePush();
    setBusy(false);
    setState("available");
    setMsg("Notifiche disattivate.");
  };

  const ringState = state === "subscribed" ? "solid" : state === "loading" ? "pulse" : "dashed";
  const label = state === "unsupported" ? "Non supportate qui"
    : state === "denied" ? "Permesso negato"
    : state === "subscribed" ? "Attive"
    : state === "loading" ? "…"
    : "Disattive";

  return (
    <Card>
      <Row last>
        <span className="flex items-center gap-2.5 text-[15px] text-[var(--text-1)]">
          <Ring state={ringState} size={22} />
          Notifiche push
        </span>
        <span className="text-[13px] text-[var(--text-2)]">{label}</span>
      </Row>
      {(state === "subscribed" || state === "available") && (
        <div className="px-4 pb-4 pt-1">
          <p className="text-[13px] text-[var(--text-2)] leading-relaxed mb-2.5">
            Ricevi un promemoria push prima degli eventi che hanno una sveglia impostata.
          </p>
          <button
            onClick={state === "subscribed" ? handleDisable : handleEnable}
            disabled={busy}
            className="w-full py-3 font-semibold rounded-[var(--r-sm)] text-[15px] active:scale-[0.98] disabled:opacity-50"
            style={{ background: state === "subscribed" ? "var(--surface-1)" : "var(--flare)", color: state === "subscribed" ? "var(--text-1)" : "#fff" }}
          >
            {busy ? "…" : state === "subscribed" ? "Disattiva notifiche" : "Attiva notifiche"}
          </button>
          {msg && <p className="text-[12px] text-center text-[var(--text-2)] mt-2">{msg}</p>}
        </div>
      )}
      {state === "unsupported" && (
        <p className="px-4 pb-4 pt-1 text-[13px] text-[var(--text-3)] leading-relaxed">
          Su iPhone: installa l&apos;app dalla schermata Home (Condividi → Aggiungi a Home) e riapri da lì.
        </p>
      )}
      {state === "denied" && (
        <p className="px-4 pb-4 pt-1 text-[13px] leading-relaxed" style={{ color: "var(--alert)" }}>
          Abilita le notifiche per &quot;Calendario&quot; nelle impostazioni di sistema.
        </p>
      )}
    </Card>
  );
}
