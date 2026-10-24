"use client";

import { useEffect, useRef, useState } from "react";
import type { SpeechRecognitionPort, SpeechSynthPort } from "@/application/ports";
import type { Exercise } from "@/domain/exercises";
import { SPEECH_RATE_NORMAL } from "@/domain/speech";
import type { Copy } from "@/presentation/i18n";

export function SayPrompt({
  exercise,
  t,
  speech,
  recognition,
  disabled,
  onResult,
}: {
  exercise: Extract<Exercise, { type: "say" }>;
  t: Copy;
  speech: SpeechSynthPort;
  recognition: SpeechRecognitionPort;
  disabled: boolean;
  onResult: (transcript: string) => void;
}) {
  const [listening, setListening] = useState(false);
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && navigator.onLine === false);
  const onResultRef = useRef(onResult);
  const skipped = useRef(false);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    const markOffline = () => setOffline(true);
    const markOnline = () => setOffline(false);
    window.addEventListener("offline", markOffline);
    window.addEventListener("online", markOnline);
    return () => {
      window.removeEventListener("offline", markOffline);
      window.removeEventListener("online", markOnline);
    };
  }, []);

  useEffect(() => {
    if (!offline || disabled || skipped.current) return;
    skipped.current = true;
    const timer = window.setTimeout(() => onResultRef.current(""), 0);
    return () => window.clearTimeout(timer);
  }, [disabled, offline]);

  async function talk() {
    if (disabled || listening || offline) return;
    setListening(true);
    const transcript = await recognition.listen(exercise.lang);
    setListening(false);
    if (!skipped.current) onResultRef.current(transcript);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <h2 className="text-center text-2xl font-bold">{t.say}</h2>
      <p className="text-7xl" aria-hidden="true">
        {exercise.emoji}
      </p>
      <p className="text-center text-4xl font-bold">{exercise.promptText}</p>
      <button
        type="button"
        className="btn-3d btn-soft bg-white px-5 py-3 text-lg"
        onClick={() => speech.speak(exercise.audioText, exercise.lang, SPEECH_RATE_NORMAL)}
      >
        {t.listen}
      </button>
      <button
        type="button"
        className="grid size-28 place-items-center rounded-full bg-sky text-5xl text-white shadow-[0_6px_0_#1899d6] disabled:opacity-60"
        aria-label={t.sayHint}
        aria-pressed={listening}
        disabled={disabled || listening || offline}
        onClick={() => void talk()}
      >
        🎤
      </button>
      <p className="text-lg font-semibold text-ink/70">{listening ? t.listening : t.sayHint}</p>
    </div>
  );
}
