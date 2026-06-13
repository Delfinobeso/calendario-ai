"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useUI } from "@/store/ui";
import { useCalendar } from "@/store/calendar";

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
}

export default function VoiceInput({ onDone, active }: Props) {
  const { setAiResult } = useUI();
  const { addEvent } = useCalendar();

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
            } else {
              const parsed = data.event;
              await addEvent({
                title: parsed.title,
                location: parsed.location || "",
                description: parsed.description || "",
                start_time: parsed.start_time,
                end_time: parsed.end_time,
                source: "ai",
              });
              const conflicts = data.conflicts || [];
              if (conflicts.length) {
                setAiResult({
                  kind: "warning",
                  text: `Conflitto con: ${conflicts.map((c: any) => c.title).join(", ")}. Aggiunto comunque.`,
                });
              } else {
                setAiResult({ kind: "success", text: `"${parsed.title}" aggiunto` });
              }
            }
          } else {
            setAiResult({ kind: "error", text: "Errore nella trascrizione." });
          }
        } catch {
          setAiResult({ kind: "error", text: "Timeout o errore di rete." });
        }
        setProcessing(false);
        setTimeout(() => { setAiResult(null); onDone(); }, 4000);
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
  }, [addEvent, setAiResult, onDone]);

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
        <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin shrink-0" />
        <span className="text-[var(--color-text-secondary)] text-[14px]">Trascrivendo...</span>
      </div>
    );
  }

  const mm = Math.floor(elapsed / 60);
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <div className="flex-1 flex items-center gap-2 min-w-0">
      <span className="block w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0" />
      <span className="text-[var(--color-text-primary)] text-[14px] font-medium tabular-nums">REC {mm}:{ss}</span>
    </div>
  );
}
