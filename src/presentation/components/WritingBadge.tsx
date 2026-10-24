"use client";

import type { SpeechSynthPort } from "@/application/ports";
import type { Lang } from "@/domain/language";
import { SPEECH_RATE_NORMAL } from "@/domain/speech";
import type { Copy } from "@/presentation/i18n";

const badgeCopy = {
  spell: {
    en: { label: "✏️ Spell in English 🇺🇸", speak: "Spell in English" },
    es: { label: "✏️ Deletrea en español 🇵🇪", speak: "Deletrea en español" },
  },
  trace: {
    en: { label: "✏️ Trace in English 🇺🇸", speak: "Trace in English" },
    es: { label: "✏️ Traza en español 🇵🇪", speak: "Traza en español" },
  },
} as const;

export function answerHelper(uiLang: Lang, answerLang: Lang, t: Copy): string | null {
  if (uiLang === answerLang) return null;
  return answerLang === "en" ? t.answerInEnglish : t.answerInSpanish;
}

export function WritingBadge({
  kind,
  lang,
  speech,
  listenLabel,
  helper,
}: {
  kind: "spell" | "trace";
  lang: Lang;
  speech: SpeechSynthPort;
  listenLabel: string;
  helper: string | null;
}) {
  const badge = badgeCopy[kind][lang];
  const english = lang === "en";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-center gap-2">
        <p
          className={[
            "rounded-full px-4 py-2 text-center text-lg font-bold",
            english ? "bg-sky text-white" : "bg-sun text-ink",
          ].join(" ")}
        >
          {badge.label}
        </p>
        <button
          type="button"
          className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-2xl shadow-[0_3px_0_#e4e4e4]"
          aria-label={listenLabel}
          onClick={() => speech.speak(badge.speak, lang, SPEECH_RATE_NORMAL)}
        >
          🔊
        </button>
      </div>
      {helper ? <p className="text-center text-base font-bold text-ink/70">{helper}</p> : null}
    </div>
  );
}
