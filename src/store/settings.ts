"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light" | "system";
export type Font = "sans" | "serif" | "system";

export interface UserProfile {
  name: string;
  role: string;
}

interface SettingsStore {
  theme: Theme;
  font: Font;
  profile: UserProfile;
  setTheme: (t: Theme) => void;
  setFont: (f: Font) => void;
  setProfile: (p: Partial<UserProfile>) => void;
  syncProfileFromBackend: () => Promise<void>;
  saveProfileToBackend: () => Promise<void>;
}

export const FONT_FAMILIES: Record<Font, string> = {
  sans: "'Plus Jakarta Sans', -apple-system, system-ui, sans-serif",
  serif: "'Merriweather', Georgia, 'Times New Roman', serif",
  system: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
};

export const FONT_LABELS: Record<Font, string> = {
  sans: "Sans Serif",
  serif: "Serif",
  system: "System",
};

export const FONT_GOOGLE: Record<Font, string | null> = {
  sans: "Plus+Jakarta+Sans:wght@400;500;600;700;800",
  serif: "Merriweather:ital,wght@0,400;0,700;1,400",
  system: null,
};

// See calendar.ts for why this doesn't hit NEXT_PUBLIC_API_URL directly.
const API_BASE = process.env.NEXT_PUBLIC_API_URL ? "/api/backend" : "";

export const useSettings = create<SettingsStore>()(
  persist(
    (set, get) => ({
      theme: "dark",
      font: "system",
      profile: { name: "", role: "" },

      setTheme: (theme) => set({ theme }),
      setFont: (font) => set({ font }),
      setProfile: (p) => {
        set((s) => ({ profile: { ...s.profile, ...p } }));
        // Auto-save to backend after update
        get().saveProfileToBackend();
      },

      syncProfileFromBackend: async () => {
        if (!API_BASE) return;
        try {
          const res = await fetch(`${API_BASE}/profile`);
          if (res.ok) {
            const data = await res.json();
            set({ profile: { name: data.name || "", role: data.role || "" } });
          }
        } catch { /* offline — keep localStorage */ }
      },

      saveProfileToBackend: async () => {
        if (!API_BASE) return;
        try {
          await fetch(`${API_BASE}/profile`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(get().profile),
          });
        } catch { /* offline — localStorage only */ }
      },
    }),
    {
      name: "calendario-settings",
      partialize: (s) => ({
        theme: s.theme,
        font: s.font,
        profile: s.profile,
      }),
    }
  )
);
