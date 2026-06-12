"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light" | "system";
export type Font = "plus-jakarta" | "inter" | "dm-sans" | "system";
export type Language = "it" | "en";

export interface UserProfile {
  name: string;
  role: string;
}

interface SettingsStore {
  theme: Theme;
  font: Font;
  language: Language;
  profile: UserProfile;
  setTheme: (t: Theme) => void;
  setFont: (f: Font) => void;
  setLanguage: (l: Language) => void;
  setProfile: (p: Partial<UserProfile>) => void;
}

export const FONT_FAMILIES: Record<Font, string> = {
  "plus-jakarta": "'Plus Jakarta Sans', -apple-system, system-ui, sans-serif",
  inter: "'Inter', -apple-system, system-ui, sans-serif",
  "dm-sans": "'DM Sans', -apple-system, system-ui, sans-serif",
  system: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
};

export const FONT_LABELS: Record<Font, string> = {
  "plus-jakarta": "Plus Jakarta Sans",
  inter: "Inter",
  "dm-sans": "DM Sans",
  system: "System",
};

export const FONT_GOOGLE: Record<Font, string | null> = {
  "plus-jakarta": "Plus+Jakarta+Sans:wght@400;500;600;700;800",
  inter: "Inter:wght@400;500;600;700;800",
  "dm-sans": "DM+Sans:wght@400;500;600;700;800",
  system: null,
};

export const useSettings = create<SettingsStore>()(
  persist(
    (set) => ({
      theme: "dark",
      font: "plus-jakarta",
      language: "it",
      profile: { name: "", role: "Geometra" },

      setTheme: (theme) => set({ theme }),
      setFont: (font) => set({ font }),
      setLanguage: (language) => set({ language }),
      setProfile: (p) =>
        set((s) => ({ profile: { ...s.profile, ...p } })),
    }),
    {
      name: "calendario-settings",
      partialize: (s) => ({
        theme: s.theme,
        font: s.font,
        language: s.language,
        profile: s.profile,
      }),
    }
  )
);
