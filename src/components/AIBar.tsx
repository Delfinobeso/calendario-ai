"use client";

import VoiceInput from "@/components/VoiceInput";
import { CheckIcon, WarningIcon, ErrorIcon } from "@/components/icons";
import type { AiToast } from "@/store/ui";
import type { ParsedEvent } from "@/components/AIAssembleSheet";

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="6" y="1.5" width="4" height="7.5" rx="2" fill="currentColor" />
      <path d="M3.5 7.5a4.5 4.5 0 0 0 9 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M8 12v2.5M5.5 14.5h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 13V3M8 3l-4 4M8 3l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SparkleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6.5 1c.35 2.3 1.4 3.35 3.7 3.7-2.3.35-3.35 1.4-3.7 3.7-.35-2.3-1.4-3.35-3.7-3.7C5.1 4.35 6.15 3.3 6.5 1z" fill="currentColor" />
      <path d="M12 7.5c.2 1.3.85 1.95 2.15 2.15-1.3.2-1.95.85-2.15 2.15-.2-1.3-.85-1.95-2.15-2.15 1.3-.2 1.95-.85 2.15-2.15z" fill="currentColor" opacity="0.55" />
    </svg>
  );
}

// AI bar — SEMPRE presente, fissa sopra il dock (decisione Aziz). "Scrivi o
// detta…" + mic; submit chiama il parser backend, il risultato si assembla
// campo per campo in AIAssembleSheet (§11.7). Nasconde in overlay uguale al
// dock quando un foglio è aperto/tastiera attiva è gestito dal parent (page.tsx).
export default function AIBar({
  value, onChange, onSubmit, loading, aiResult,
  voiceActive, voiceBusy, onVoiceToggle, onVoiceDone, onVoiceParsed, hidden = false, bottom, onFocusChange,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
  aiResult: AiToast | null;
  voiceActive: boolean;
  voiceBusy: boolean;
  onVoiceToggle: () => void;
  onVoiceDone: () => void;
  onVoiceParsed: (parsed: ParsedEvent, conflicts: { title: string }[]) => void;
  onFocusChange?: (focused: boolean) => void;
  hidden?: boolean;
  bottom: number;
}) {
  const hasText = value.trim().length > 0;
  const showTrailingButton = !(voiceBusy && !voiceActive);

  return (
    <div
      className="fixed left-[22px] right-[22px] z-30 mx-auto max-w-md"
      style={{
        bottom,
        transform: hidden ? "translateY(120%)" : "translateY(0)",
        opacity: hidden ? 0 : 1,
        transitionProperty: "transform,opacity,bottom",
        transitionDuration: "var(--dur-base)",
        transitionTimingFunction: "var(--ease-snap)",
      }}
    >
      <div
        className="flex items-center gap-1.5 rounded-full px-1.5 py-1.5 glass-1 min-w-0"
        style={{ borderColor: voiceActive ? "var(--alert)" : undefined }}
      >
        {voiceBusy ? (
          <VoiceInput active={voiceActive} onDone={onVoiceDone} onParsed={onVoiceParsed} />
        ) : (
          <>
            <span className="touch-target w-9 h-9 flex items-center justify-center shrink-0 text-[var(--text-2)]">
              <SparkleIcon />
            </span>
            <input
              className="flex-1 bg-transparent py-2.5 px-1.5 text-[var(--text-1)] placeholder-[var(--text-3)] outline-none text-[15px] min-w-0"
              placeholder="Scrivi o detta…"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSubmit()}
              onFocus={() => onFocusChange?.(true)}
              onBlur={() => onFocusChange?.(false)}
              enterKeyHint="go"
            />
          </>
        )}
        {showTrailingButton && (
          <button
            onClick={voiceActive || !hasText ? onVoiceToggle : onSubmit}
            disabled={loading}
            className="touch-target w-9 h-9 flex items-center justify-center rounded-full shrink-0 active:scale-90"
            style={{
              background: voiceActive ? "var(--alert)" : hasText ? "var(--flare)" : "transparent",
              color: voiceActive || hasText ? "#fff" : "var(--text-2)",
              transitionProperty: "background-color,color",
              transitionDuration: "var(--dur-base)",
            }}
            aria-label={voiceActive ? "Ferma registrazione" : hasText ? "Invia" : "Registra audio"}
          >
            {loading ? (
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-transparent spin" />
            ) : voiceActive ? (
              <span className="block w-3 h-3 rounded-[2px] bg-white" />
            ) : hasText ? (
              <SendIcon />
            ) : (
              <MicIcon />
            )}
          </button>
        )}
      </div>
      {aiResult && (
        <p
          className="text-[11px] mt-1.5 text-center font-medium flex items-center justify-center gap-1.5 enter-view"
          style={{ color: aiResult.kind === "success" ? "var(--signal)" : aiResult.kind === "warning" ? "var(--ember)" : "var(--alert)" }}
        >
          {aiResult.kind === "success" ? <CheckIcon /> : aiResult.kind === "warning" ? <WarningIcon /> : <ErrorIcon />}
          <span>{aiResult.text}</span>
        </p>
      )}
    </div>
  );
}
