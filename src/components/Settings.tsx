"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useSettings,
  type Theme,
  type Font,
  FONT_FAMILIES,
} from "@/store/settings";
import { SHEET_TRANSITION, BACKDROP_TRANSITION } from "@/lib/motion";
import { CheckIcon, MoonIcon, SunIcon, AutoIcon } from "@/components/icons";
import { pushSupported, getSubscriptionState, enablePush, disablePush } from "@/lib/push";

export default function Settings({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [saved, setSaved] = useState(false);
  const {
    theme, font, profile,
    setTheme, setFont, setProfile,
  } = useSettings();

  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");

  // Sync form fields from store when sheet opens (not just on mount)
  useEffect(() => {
    if (open) {
      setEditName(profile.name);
      setEditRole(profile.role);
      setSaved(false);
    }
  }, [open, profile.name, profile.role]);

  const handleSaveProfile = () => {
    setProfile({ name: editName, role: editRole });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      {/* ── Sheet (trigger vive nel Bottom Dock, vedi page.tsx) ── */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={BACKDROP_TRANSITION}
              className="fixed inset-0 bg-black/40 sheet-blur z-40"
              onClick={onClose}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={SHEET_TRANSITION}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface)] rounded-t-[22px] px-6 pt-6 pb-safe max-h-[calc(var(--app-vh)*0.9)] overflow-y-auto border-t border-[var(--color-surface-tertiary)]/30"
            >
              <div className="w-10 h-1 bg-[var(--color-text-tertiary)]/25 rounded-full mx-auto mb-6" />
              <h2 className="text-[22px] font-extrabold text-[var(--color-text-primary)] mb-6">
                Impostazioni
              </h2>

              {/* ── Profilo ── */}
              <Section title="Profilo">
                <div className="space-y-3">
                  <Field label="Nome" value={editName} onChange={setEditName} placeholder="Il tuo nome" />
                  <Field label="Ruolo" value={editRole} onChange={setEditRole} placeholder="es. Geometra" />
                  <button
                    onClick={handleSaveProfile}
                    className={`w-full py-3 font-semibold rounded-xl text-[15px] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 ${
                      saved ? "bg-[var(--color-success)] text-white" : "bg-[var(--color-accent)] text-black"
                    }`}
                  >
                    {saved ? (<><CheckIcon /> Salvato</>) : "Salva profilo"}
                  </button>
                </div>
              </Section>

              {/* ── Tema ── */}
              <Section title="Tema">
                <ThemePicker selected={theme} onChange={setTheme} />
              </Section>

              {/* ── Font ── */}
              <Section title="Font">
                <FontPicker selected={font} onChange={setFont} />
              </Section>

              {/* ── Notifiche ── */}
              <Section title="Notifiche">
                <NotificationSettings open={open} />
              </Section>

              <div className="h-6" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Sub-components ── */

function NotificationSettings({ open }: { open: boolean }) {
  const [state, setState] = useState<"loading" | "unsupported" | "denied" | "subscribed" | "available">("loading");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!open) return;
    if (!pushSupported()) { setState("unsupported"); return; }
    getSubscriptionState().then(setState);
  }, [open]);

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

  if (state === "unsupported") {
    return <p className="text-[13px] text-[var(--color-text-tertiary)] leading-relaxed">Le notifiche non sono supportate qui. Su iPhone: installa l&apos;app dalla schermata Home (Condividi → Aggiungi a Home) e riapri da lì.</p>;
  }
  if (state === "denied") {
    return <p className="text-[13px] text-[var(--color-danger)] leading-relaxed">Permesso negato. Abilita le notifiche per &quot;Calendario&quot; nelle impostazioni di sistema.</p>;
  }

  return (
    <div className="space-y-2.5">
      <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
        Ricevi un promemoria push prima degli eventi che hanno una sveglia impostata.
      </p>
      <button
        onClick={state === "subscribed" ? handleDisable : handleEnable}
        disabled={busy || state === "loading"}
        className={`w-full py-3 font-semibold rounded-xl text-[15px] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 ${
          state === "subscribed"
            ? "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]"
            : "bg-[var(--color-accent)] text-black"
        }`}
      >
        {busy ? "…" : state === "subscribed" ? "Disattiva notifiche" : "Attiva notifiche"}
      </button>
      {msg && <p className="text-[12px] text-center text-[var(--color-text-secondary)]">{msg}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-[13px] font-bold text-[var(--color-text-tertiary)] uppercase tracking-wider mb-3 ml-1">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({
  label, value, onChange, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <label className="block">
      <span className="block text-[12px] text-[var(--color-text-secondary)] mb-1.5 ml-1">{label}</span>
      <input
        className="w-full bg-[var(--color-surface-secondary)] rounded-xl px-4 py-3.5 text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] outline-none text-[16px] focus:ring-2 ring-[var(--color-accent)]/40 transition-shadow"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function ThemePicker({ selected, onChange }: { selected: Theme; onChange: (t: Theme) => void }) {
  const options: { key: Theme; label: string; Icon: typeof MoonIcon }[] = [
    { key: "dark", label: "Scuro", Icon: MoonIcon },
    { key: "light", label: "Chiaro", Icon: SunIcon },
    { key: "system", label: "Auto", Icon: AutoIcon },
  ];

  return (
    <div className="flex gap-2">
      {options.map(({ key, label, Icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex-1 py-3 rounded-xl font-semibold text-[15px] transition-all active:scale-[0.97] flex items-center justify-center gap-1.5 ${
            selected === key
              ? "bg-[var(--color-accent)] text-black"
              : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]"
          }`}
        >
          <Icon />
          {label}
        </button>
      ))}
    </div>
  );
}

function FontPicker({ selected, onChange }: { selected: Font; onChange: (f: Font) => void }) {
  const options: { key: Font; label: string }[] = [
    { key: "sans", label: "Sans Serif" },
    { key: "serif", label: "Serif" },
    { key: "system", label: "System" },
  ];

  return (
    <div className="flex gap-2">
      {options.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`flex-1 py-3 rounded-xl font-semibold text-[15px] transition-all active:scale-[0.97] ${
            selected === key
              ? "bg-[var(--color-accent)] text-black"
              : "bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)]"
          }`}
          style={{ fontFamily: FONT_FAMILIES[key] }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
