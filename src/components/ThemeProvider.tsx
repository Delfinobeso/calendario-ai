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
        resolved === "dark" ? "#1b1b1b" : "#fafafa"
      );
    }
  }, [theme]);

  // Keep --app-vh in sync with the visible viewport so bottom sheets shrink
  // (instead of being pushed off-screen) when the iOS keyboard is open.
  useEffect(() => {
    const vv = window.visualViewport;
    const setAppVh = () => {
      const h = vv?.height ?? window.innerHeight;
      document.documentElement.style.setProperty("--app-vh", `${h}px`);
    };
    setAppVh();
    vv?.addEventListener("resize", setAppVh);
    vv?.addEventListener("scroll", setAppVh);
    window.addEventListener("resize", setAppVh);
    return () => {
      vv?.removeEventListener("resize", setAppVh);
      vv?.removeEventListener("scroll", setAppVh);
      window.removeEventListener("resize", setAppVh);
    };
  }, []);

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
