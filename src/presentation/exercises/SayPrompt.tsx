"use client";

import { useEffect, useRef, useState } from "react";
import type { SpeechRecognitionPort, SpeechSynthPort } from "@/application/ports";
import type { Exercise } from "@/domain/exercises";
import { SPEECH_RATE_NORMAL } from "@/domain/speech";
import { SentenceSceneView } from "@/presentation/components/SentenceSceneView";
import type { Copy } from "@/presentation/i18n";

export function SayPrompt({
  exercise,
  t,
  speech,
  recognition,
  disabled,
  onResult,
  onMic,
}: {
  exercise: Extract<Exercise, { type: "say" }>;
  t: Copy;
  speech: SpeechSynthPort;
  recognition: SpeechRecognitionPort;
  disabled: boolean;
  onResult: (transcript: string) => void;
  onMic: () => void;
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
    onMic();
    setListening(true);
    const transcript = await recognition.listen(exercise.answerLang);
    setListening(false);
    if (!skipped.current) onResultRef.current(transcript);
  }

  const hint = exercise.sentenceId ? t.saySentenceHint : t.sayHint;

  return (
    <div className="flex flex-col items-center gap-4">
      <h2 className="text-center text-2xl font-bold">
        {exercise.sentenceId ? (exercise.answerLang === "en" ? t.sayInEnglish : t.sayInSpanish) : t.say}
      </h2>
      {exercise.scene ? <SentenceSceneView scene={exercise.scene} /> : null}
      {exercise.emoji ? (
        <p className="text-7xl" aria-hidden="true">
          {exercise.emoji}
        </p>
      ) : null}
      {exercise.sourceText && exercise.sourceLang && exercise.sourceLang !== exercise.answerLang ? (
        <p lang={exercise.sourceLang} className="text-center text-xl font-bold text-ink/70">
          “{exercise.sourceText}”
        </p>
      ) : null}
      <p lang={exercise.answerLang} className="text-center text-4xl font-bold">
        {exercise.promptText}
      </p>
      <button
        type="button"
        className="btn-3d btn-soft bg-white px-5 py-3 text-lg"
        onClick={() => speech.speak(exercise.audioText, exercise.answerLang, SPEECH_RATE_NORMAL)}
      >
        {t.listen}
      </button>
      <button
        type="button"
        className="grid size-28 place-items-center rounded-full bg-sky text-5xl text-white shadow-[0_6px_0_#1899d6] disabled:opacity-60"
        aria-label={hint}
        aria-pressed={listening}
        disabled={disabled || listening || offline}
        onClick={() => void talk()}
      >
        🎤
      </button>
      <p className="text-lg font-semibold text-ink/70">{listening ? t.listening : hint}</p>
    </div>
  );
}
