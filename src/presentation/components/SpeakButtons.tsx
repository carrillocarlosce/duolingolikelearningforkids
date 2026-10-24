"use client";

import { useState } from "react";
import type { SpeechSynthPort } from "@/application/ports";
import type { Lang } from "@/domain/language";
import { SPEECH_RATE_NORMAL, SPEECH_RATE_SLOW } from "@/domain/speech";
import type { Copy } from "@/presentation/i18n";

type SpeakButtonsProps = {
  en: string;
  es: string;
  speech: SpeechSynthPort;
  t: Copy;
};

export function SpeakButtons({ en, es, speech, t }: SpeakButtonsProps) {
  const [slow, setSlow] = useState(false);
  const rate = slow ? SPEECH_RATE_SLOW : SPEECH_RATE_NORMAL;

  function play(text: string, lang: Lang) {
    speech.speak(text, lang, rate);
  }

  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => play(en, "en")} className="rounded-2xl bg-cream px-3 py-2 text-base font-bold" aria-label={`${t.listen} English`}>
        EN
      </button>
      <button type="button" onClick={() => play(es, "es")} className="rounded-2xl bg-cream px-3 py-2 text-base font-bold" aria-label={`${t.listen} español`}>
        ES
      </button>
      <button
        type="button"
        aria-pressed={slow}
        aria-label={t.slow}
        onClick={() => setSlow((value) => !value)}
        className={["rounded-2xl px-3 py-2 text-xl", slow ? "bg-sky text-white" : "bg-cream"].join(" ")}
      >
        🐢
      </button>
    </div>
  );
}
