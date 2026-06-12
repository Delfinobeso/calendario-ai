"use client";

import { useEffect } from "react";
import { useSettings, FONT_FAMILIES, FONT_GOOGLE } from "@/store/settings";

/** Applies theme data attribute and font family to <html> */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettings((s) => s.theme);
  const font = useSettings((s) => s.font);

  useEffect(() => {
    // Resolve "system" to actual preference
    const resolved =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;

    document.documentElement.setAttribute("data-theme", resolved);

    // Sync meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute(
        "content",
        resolved === "dark" ? "#1b1b1b" : "#f7f7f7"
      );
    }
  }, [theme]);

  useEffect(() => {
    const family = FONT_FAMILIES[font];
    const google = FONT_GOOGLE[font];

    document.documentElement.style.fontFamily = family;

    // Load Google Font if needed
    if (google) {
      const id = `gf-${font}`;
      if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?family=${google}&display=swap`;
        document.head.appendChild(link);
      }
    }
  }, [font]);

  return <>{children}</>;
}
