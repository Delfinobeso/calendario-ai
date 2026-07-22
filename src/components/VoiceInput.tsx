"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useUI } from "@/store/ui";
import type { ParsedEvent } from "@/components/AIAssembleSheet";

// Kept alive for the whole session: on iOS, stopping all tracks of a getUserMedia
// stream makes the next getUserMedia() call re-show the permission prompt, even
// if the site is already authorized. Reusing the same stream avoids re-asking.
let sharedMicStream: MediaStream | null = null;

async function getMicStream(): Promise<MediaStream> {
  if (sharedMicStream && sharedMicStream.getAudioTracks().some((t) => t.readyState === "live")) {
    return sharedMicStream;
  }
  sharedMicStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  return sharedMicStream;
}

interface Props {
  onDone: () => void;
  active: boolean;
  /** Dettatura trascritta+interpretata dal backend: stesso trattamento del testo
   * digitato nella AI bar (§11.7 assemble-in + sheet di conferma), MAI un
   * addEvent diretto — la conferma è sempre nel mezzo. */
  onParsed: (parsed: ParsedEvent, conflicts: { title: string }[]) => void;
}

export default function VoiceInput({ onDone, active, onParsed }: Props) {
  const { setAiResult } = useUI();

  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await getMicStream();

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setRecording(false);

        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size < 200) {
          setAiResult({ kind: "error", text: "Registrazione troppo breve." });
          setTimeout(() => { setAiResult(null); onDone(); }, 3000);
          return;
        }

        setProcessing(true);
        try {
          const API = process.env.NEXT_PUBLIC_API_URL;
          const formData = new FormData();
          formData.append("file", blob, "recording.webm");
          const res = await fetch(`${API}/ai/parse-audio`, {
            method: "POST",
            body: formData,
            signal: AbortSignal.timeout(25000),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.error) {
              setAiResult({ kind: "error", text: data.error });
              setTimeout(() => setAiResult(null), 3000);
            } else {
              onParsed(data.event, data.conflicts || []);
            }
          } else {
            setAiResult({ kind: "error", text: "Errore nella trascrizione." });
            setTimeout(() => setAiResult(null), 3000);
          }
        } catch {
          setAiResult({ kind: "error", text: "Timeout o errore di rete." });
          setTimeout(() => setAiResult(null), 3000);
        }
        setProcessing(false);
        onDone();
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setElapsed(0);
      intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch {
      setAiResult({ kind: "error", text: "Microfono non disponibile." });
      setTimeout(() => { setAiResult(null); onDone(); }, 3000);
    }
  }, [setAiResult, onDone, onParsed]);

  // Respond to parent toggle (active prop)
  const prevActiveRef = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (active === prevActiveRef.current) return;
    prevActiveRef.current = active;

    if (active) {
      // Parent turned us on — start recording
      if (!recording && !processing) startRecording();
    } else {
      // Parent turned us off — stop recording
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    }
  }, [active, recording, processing, startRecording]);

  if (processing) {
    return (
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <div className="w-3.5 h-3.5 rounded-full border-2 spin shrink-0" style={{ borderColor: "var(--flare-hi)", borderTopColor: "transparent" }} />
        <span className="text-[var(--text-2)] text-[14px]">Trascrivendo…</span>
      </div>
    );
  }

  const mm = Math.floor(elapsed / 60);
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="flex-1 flex items-center gap-2 min-w-0">
      <span className="block w-2 h-2 rounded-full shrink-0 ring-pulse" style={{ background: "var(--alert)" }} />
      <span className="text-[var(--text-1)] text-[14px] font-medium tabular-nums">REC {mm}:{ss}</span>
    </div>
  );
}
