import type { Transition } from "framer-motion";

// Single shared animation curve for every bottom sheet (Nuovo/Modifica/Dettaglio
// evento, Impostazioni) so they all feel the same when opening/closing.
export const SHEET_TRANSITION: Transition = { type: "spring", damping: 30, stiffness: 300 };
export const BACKDROP_TRANSITION: Transition = { duration: 0.2 };
