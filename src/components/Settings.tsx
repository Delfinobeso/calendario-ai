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

export default function Settings() {
  const [open, setOpen] = useState(false);
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
      {/* ── Trigger button (⚙️) ── */}
      <button
        onClick={() => setOpen(true)}
        className="touch-target flex items-center justify-center w-[44px] h-[44px] rounded-full bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] active:scale-90 transition-transform"
        aria-label="Impostazioni"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>

      {/* ── Sheet ── */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={BACKDROP_TRANSITION}
              className="fixed inset-0 bg-black/40 sheet-blur z-40"
              onClick={() => setOpen(false)}
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

              <div className="h-6" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Sub-components ── */

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
