"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useUI } from "@/store/ui";
import { useCalendar } from "@/store/calendar";

interface Props {
  onDone: () => void;
  autoStart?: boolean;
}

export default function VoiceInput({ onDone, autoStart = false }: Props) {
  const { setAiResult } = useUI();
  const { addEvent } = useCalendar();

  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);
      ctx.clearRect(0, 0, w, h);

      const barWidth = w / bufferLength;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const barHeight = (v - 1) * h * 0.7;
        const x = i * barWidth;
        ctx.fillStyle = i % 2 === 0 ? "#51b1e7" : "rgba(81,177,231,0.6)";
        ctx.fillRect(x, h / 2, barWidth * 0.8, barHeight / 2);
        ctx.fillRect(x, h / 2 - barHeight / 2, barWidth * 0.8, barHeight / 2);
      }
    };
    draw();
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      analyserRef.current = analyser;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        cancelAnimationFrame(animFrameRef.current);
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close();
        setRecording(false);

        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size < 200) {
          setAiResult("❌ Registrazione troppo breve.");
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
              setAiResult(`❌ ${data.error}`);
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
                setAiResult(
                  `⚠️ Conflitto con: ${conflicts.map((c: any) => c.title).join(", ")}. Aggiunto comunque.`
                );
              } else {
                setAiResult(`🎙️ "${parsed.title}" aggiunto`);
              }
            }
          } else {
            setAiResult("❌ Errore nella trascrizione.");
          }
        } catch {
          setAiResult("❌ Timeout o errore di rete.");
        }
        setProcessing(false);
        setTimeout(() => { setAiResult(null); onDone(); }, 4000);
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setRecording(true);
      drawWaveform();
    } catch {
      setAiResult("❌ Microfono non disponibile.");
      setTimeout(() => { setAiResult(null); onDone(); }, 3000);
    }
  }, [addEvent, drawWaveform, setAiResult, onDone]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // autoStart: parte subito in recording (usato per long-press)
  useEffect(() => {
    if (autoStart && !startedRef.current) {
      startedRef.current = true;
      startRecording();
    }
  }, [autoStart, startRecording]);

  if (processing) {
    return (
      <div className="flex-1 flex items-center gap-2 bg-[var(--color-surface-secondary)] rounded-xl px-3 py-2">
        <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--color-accent)] border-t-transparent animate-spin shrink-0" />
        <span className="text-[var(--color-text-secondary)] text-[13px]">Trascrivendo...</span>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex-1 flex items-center gap-1.5 bg-[var(--color-surface-secondary)] rounded-xl px-2.5 py-1 border border-red-500/50 min-w-0">
        <span className="text-red-400 text-[10px] font-semibold animate-pulse shrink-0">REC</span>
        <canvas ref={canvasRef} width={240} height={32} className="flex-1 h-8" />
        <button
          onClick={stopRecording}
          className="touch-target w-6 h-6 flex items-center justify-center rounded-full bg-red-500 active:scale-90 shrink-0"
        >
          <span className="text-white text-[10px]">■</span>
        </button>
      </div>
    );
  }

  // idle state (solo se non autoStart — per retrocompatibilità)
  return (
    <button
      onClick={startRecording}
      className="touch-target w-9 h-9 flex items-center justify-center rounded-lg bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] active:scale-95 shrink-0"
      aria-label="Registra audio"
    >
      <span className="text-base">🎤</span>
    </button>
  );
}
