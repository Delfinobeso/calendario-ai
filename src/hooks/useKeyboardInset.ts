"use client";

import { useEffect, useState } from "react";

/**
 * Rileva la tastiera iOS aperta confrontando l'altezza del visualViewport con
 * quella della finestra. Usato per far scivolare via il dock (spec §8.5:
 * "Tastiera iOS aperta → il dock scivola via") e per sollevare la AI bar
 * sopra la tastiera invece di lasciarla coperta.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const diff = window.innerHeight - vv.height - vv.offsetTop;
      setInset(diff > 60 ? diff : 0);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
