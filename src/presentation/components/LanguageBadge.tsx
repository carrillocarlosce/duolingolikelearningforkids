"use client";

import type { SpeechSynthPort } from "@/application/ports";
import type { Lang } from "@/domain/language";
import { SPEECH_RATE_NORMAL } from "@/domain/speech";

const flag: Record<Lang, string> = {
  en: "🇺🇸",
  es: "🇵🇪",
};

/** Flag, wording, and a speaker. The label is in the language it names. */
export function LanguageBadge({
  lang,
  label,
  speech,
  spoken,
  helper,
}: {
  lang: Lang;
  label: string;
  speech: SpeechSynthPort;
  /** Sentence to speak. The badge label is spoken when this is empty. */
  spoken?: string | null;
  helper?: string | null;
}) {
  const text = spoken?.trim() ? spoken : label;
  const tone =
    lang === "en" ? "bg-sky text-white shadow-[0_4px_0_#1899d6]" : "bg-sun text-ink shadow-[0_4px_0_#e6a800]";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-stretch gap-3">
        <p
          lang={lang}
          data-answer-lang={lang}
          className={`flex flex-1 items-center justify-center gap-2 rounded-3xl px-4 py-4 text-center text-xl font-bold leading-tight ${tone}`}
        >
          <span aria-hidden="true" draggable={false}>
            {flag[lang]}
          </span>
          <span>{label}</span>
        </p>
        <button
          type="button"
          lang={lang}
          aria-label={text}
          onClick={() => speech.speak(text, lang, SPEECH_RATE_NORMAL)}
          className="grid size-16 shrink-0 place-items-center self-center rounded-full bg-white text-3xl shadow-[0_4px_0_#e4e4e4]"
        >
          <span aria-hidden="true" draggable={false}>
            🔊
          </span>
        </button>
      </div>
      {spoken ? (
        <p lang={lang} className="rounded-2xl bg-white px-4 py-3 text-lg font-bold leading-snug">
          {spoken}
        </p>
      ) : null}
      {helper ? <p className="text-center text-lg font-bold text-ink/70">{helper}</p> : null}
    </div>
  );
}
