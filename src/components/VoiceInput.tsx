"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUI } from "@/store/ui";
import { useCalendar } from "@/store/calendar";

interface VoiceInputProps {
  onEventAdded: () => void;
}

export default function VoiceInput({ onEventAdded }: VoiceInputProps) {
  const { setAiLoading, setAiResult } = useUI();
  const { addEvent } = useCalendar();

  const [open, setOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribed, setTranscribed] = useState("");
  const [status, setStatus] = useState<"idle" | "recording" | "processing" | "done" | "error">("idle");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

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

      ctx.fillStyle = "#1b1b1b";
      ctx.fillRect(0, 0, w, h);

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#51b1e7";
      ctx.beginPath();

      const sliceWidth = w / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * h) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(w, h / 2);
      ctx.stroke();
    };
    draw();
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;
      drawWaveform();

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus" : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        cancelAnimationFrame(animFrameRef.current);
        stream.getTracks().forEach((t) => t.stop());
        audioCtx.close();

        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (blob.size < 200) {
          setStatus("error");
          setTranscribed("Registrazione troppo breve.");
          return;
        }

        setStatus("processing");
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
              setStatus("error");
              setTranscribed(data.error);
            } else {
              setTranscribed(data.text || "");
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
              setStatus("done");
              onEventAdded();
              setTimeout(() => {
                setOpen(false);
                setStatus("idle");
                setTranscribed("");
                setAiResult(null);
              }, 2000);
            }
          } else {
            setStatus("error");
            setTranscribed("Errore nella trascrizione.");
          }
        } catch {
          setStatus("error");
          setTranscribed("Timeout o errore di rete.");
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setStatus("recording");
    } catch {
      setStatus("error");
      setTranscribed("Microfono non disponibile.");
    }
  }, [addEvent, drawWaveform, onEventAdded, setAiResult]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    if (recording) stopRecording();
    cancelAnimationFrame(animFrameRef.current);
    setOpen(false);
    setStatus("idle");
    setTranscribed("");
  }, [recording, stopRecording]);

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="touch-target flex items-center gap-2 px-4 py-2.5 bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] rounded-2xl text-[14px] font-medium active:scale-95 transition-transform"
      >
        <span className="text-lg">🎤</span>
        <span>Registra</span>
      </button>

      {/* Full-screen recording sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/70 z-50"
              onClick={status === "idle" || status === "error" || status === "done" ? handleClose : undefined}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "tween", duration: 0.3, ease: [0.22, 0.61, 0.36, 1] }}
              className="fixed inset-x-0 bottom-0 z-50 bg-[#1b1b1b] rounded-t-[22px] px-6 pt-8 pb-safe flex flex-col items-center"
              style={{ paddingBottom: "max(40px, env(safe-area-inset-bottom, 0px))" }}
            >
              <div className="w-10 h-1 bg-white/20 rounded-full mb-8" />

              {status === "idle" && (
                <>
                  <p className="text-[16px] text-white/70 mb-8 text-center">
                    Tocca il microfono e parla
                  </p>
                  <div className="w-28 h-28 rounded-full bg-[var(--color-surface-secondary)] flex items-center justify-center mb-6">
                    <span className="text-5xl">🎤</span>
                  </div>
                  <button
                    onClick={startRecording}
                    className="touch-target px-10 py-4 bg-[var(--color-accent)] text-black font-bold rounded-2xl text-[17px] active:scale-95"
                  >
                    Inizia
                  </button>
                </>
              )}

              {status === "recording" && (
                <>
                  <p className="text-[16px] text-red-400 mb-4 font-medium animate-pulse">
                    ● Registrando...
                  </p>
                  <div className="w-full h-24 rounded-2xl overflow-hidden mb-6 bg-[#111]">
                    <canvas ref={canvasRef} width={600} height={100} className="w-full h-full" />
                  </div>
                  <button
                    onClick={stopRecording}
                    className="touch-target w-20 h-20 rounded-full bg-red-500 flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <span className="text-2xl text-white">■</span>
                  </button>
                </>
              )}

              {status === "processing" && (
                <>
                  <div className="w-16 h-16 rounded-full border-4 border-[var(--color-accent)] border-t-transparent animate-spin mb-6" />
                  <p className="text-[16px] text-white/60">Trascrivendo...</p>
                </>
              )}

              {status === "done" && (
                <>
                  <p className="text-[14px] text-[var(--color-success)] mb-2 font-medium">✓</p>
                  <p className="text-[16px] text-white/80 mb-1 text-center max-w-xs">
                    &ldquo;{transcribed}&rdquo;
                  </p>
                  <p className="text-[14px] text-[var(--color-success)] mb-8">Evento aggiunto</p>
                  <button
                    onClick={handleClose}
                    className="touch-target px-8 py-3 bg-[var(--color-surface-secondary)] text-white/80 rounded-xl text-[15px] active:scale-95"
                  >
                    Chiudi
                  </button>
                </>
              )}

              {status === "error" && (
                <>
                  <p className="text-[16px] text-[var(--color-danger)] mb-2">❌</p>
                  <p className="text-[15px] text-white/70 mb-8 text-center max-w-xs">
                    {transcribed || "Errore sconosciuto"}
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setStatus("idle");
                        setTranscribed("");
                      }}
                      className="touch-target px-8 py-3 bg-[var(--color-accent)] text-black font-semibold rounded-xl text-[15px] active:scale-95"
                    >
                      Riprova
                    </button>
                    <button
                      onClick={handleClose}
                      className="touch-target px-8 py-3 bg-[var(--color-surface-secondary)] text-white/60 rounded-xl text-[15px] active:scale-95"
                    >
                      Chiudi
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
