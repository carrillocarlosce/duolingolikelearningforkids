"use client";

import type { SpeechSynthPort } from "@/application/ports";
import { answerLanguage, type Exercise } from "@/domain/exercises";
import type { Lang } from "@/domain/language";
import { SPEECH_RATE_NORMAL } from "@/domain/speech";
import type { Copy } from "@/presentation/i18n";

type WriteTask = "write" | "build" | "trace" | "spell" | "say";

const cue: Record<Lang, Record<WriteTask, { mark: string; label: string }>> = {
  en: {
    write: { mark: "✏️", label: "Write in English" },
    build: { mark: "🧱", label: "Build in English" },
    trace: { mark: "✏️", label: "Trace in English" },
    spell: { mark: "✏️", label: "Spell in English" },
    say: { mark: "🗣️", label: "Say it in English" },
  },
  es: {
    write: { mark: "✏️", label: "Escribe en español" },
    build: { mark: "🧱", label: "Arma en español" },
    trace: { mark: "✏️", label: "Traza en español" },
    spell: { mark: "✏️", label: "Deletrea en español" },
    say: { mark: "🗣️", label: "Dilo en español" },
  },
};

const flag: Record<Lang, string> = {
  en: "🇺🇸",
  es: "🇵🇪",
};

function writeTask(exercise: Exercise): WriteTask | null {
  switch (exercise.type) {
    case "type":
      return "write";
    case "build":
      return "build";
    case "trace":
      return "trace";
    case "spell":
      return "spell";
    case "say":
      return "say";
    default:
      return null;
  }
}

/** Kid-facing badge. Wording and color follow the exercise answer language, not the parent UI language. */
export function AnswerLanguageBadge({
  exercise,
  uiLang,
  t,
  speech,
}: {
  exercise: Exercise;
  uiLang: Lang;
  t: Copy;
  speech: SpeechSynthPort;
}) {
  const answerLang = answerLanguage(exercise);
  const task = writeTask(exercise);
  if (!answerLang || !task) return null;
  const { mark, label } = cue[answerLang][task];
  const helper = uiLang === answerLang ? null : answerLang === "en" ? t.answerInEnglish : t.answerInSpanish;
  const tone =
    answerLang === "en"
      ? "bg-sky text-white shadow-[0_4px_0_#1899d6]"
      : "bg-sun text-ink shadow-[0_4px_0_#e6a800]";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-stretch gap-3">
        <p
          lang={answerLang}
          data-answer-lang={answerLang}
          className={`flex flex-1 items-center justify-center gap-2 rounded-3xl px-4 py-4 text-center text-2xl font-bold ${tone}`}
        >
          <span aria-hidden="true">{mark}</span>
          <span>{label}</span>
          <span aria-hidden="true">{flag[answerLang]}</span>
        </p>
        <button
          type="button"
          lang={answerLang}
          aria-label={label}
          onClick={() => speech.speak(label, answerLang, SPEECH_RATE_NORMAL)}
          className="grid size-16 shrink-0 place-items-center rounded-full bg-white text-3xl shadow-[0_4px_0_#e4e4e4]"
        >
          <span aria-hidden="true">🔊</span>
        </button>
      </div>
      {helper ? <p className="text-center text-lg font-bold text-ink/70">{helper}</p> : null}
    </div>
  );
}
