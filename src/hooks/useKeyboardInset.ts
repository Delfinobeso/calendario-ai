"use client";

import { useEffect, useState } from "react";

/**
 * Rileva la tastiera iOS aperta confrontando l'altezza del visualViewport con
 * quella della finestra. Usato per far scivolare via il dock (spec §8.5:
 * "Tastiera iOS aperta → il dock scivola via") e per sollevare la AI bar
 * sopra la tastiera invece di lasciarla coperta.
 *
 * Calcolo semplificato (feedback Aziz, rebuild v2): solo
 * `window.innerHeight - visualViewport.height`, senza `offsetTop` — su iOS
 * standalone l'offsetTop può falsare la misura e lasciare la AI bar a mezz'aria
 * con un buco sotto invece di appoggiarsi sopra la tastiera. Soglia 60 invariata.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const diff = window.innerHeight - vv.height;
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
