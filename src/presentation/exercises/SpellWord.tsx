"use client";

import { useEffect, useRef, useState } from "react";
import type { SpeechSynthPort } from "@/application/ports";
import type { Exercise } from "@/domain/exercises";
import type { Lang } from "@/domain/language";
import { spellMatches } from "@/domain/session";
import { SPEECH_RATE_NORMAL } from "@/domain/speech";
import { answerHelper, WritingBadge } from "@/presentation/components/WritingBadge";
import type { Copy } from "@/presentation/i18n";

function langTag(lang: Lang): string {
  return lang === "es" ? "es-PE" : "en";
}

export function SpellWord({
  exercise,
  t,
  uiLang,
  speech,
  disabled,
  onDraft,
  onSolved,
  onEffect,
}: {
  exercise: Extract<Exercise, { type: "spell" }>;
  t: Copy;
  uiLang: Lang;
  speech: SpeechSynthPort;
  disabled: boolean;
  onDraft: (tokens: string[] | null) => void;
  onSolved: (tokens: string[]) => void;
  onEffect: (effect: "tap") => void;
}) {
  const [used, setUsed] = useState<number[]>([]);
  const solved = useRef(false);
  const tag = langTag(exercise.answerLang);

  useEffect(() => {
    speech.speak(exercise.word, exercise.answerLang, SPEECH_RATE_NORMAL);
    return () => speech.stop();
  }, [exercise.answerLang, exercise.id, exercise.word, speech]);

  function tokensFor(indexes: number[]): string[] {
    return indexes.map((index) => exercise.tiles[index] ?? "");
  }

  function update(next: number[]) {
    if (disabled || solved.current) return;
    onEffect("tap");
    setUsed(next);
    const tokens = tokensFor(next);
    const complete = tokens.length === exercise.letters.length;
    onDraft(complete ? tokens : null);
    if (complete && spellMatches(tokens, exercise.letters)) {
      solved.current = true;
      onSolved(tokens);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4" lang={tag}>
      <WritingBadge
        kind="spell"
        lang={exercise.answerLang}
        speech={speech}
        listenLabel={t.listen}
        helper={answerHelper(uiLang, exercise.answerLang, t)}
      />
      <h2 className="text-center text-2xl font-bold">{t.spell}</h2>
      <p className="text-6xl" aria-hidden="true">
        {exercise.emoji}
      </p>
      {exercise.showPromptText ? (
        <p className="text-center text-2xl font-bold text-sky">{exercise.promptText}</p>
      ) : null}
      <p className="text-center text-4xl font-bold tracking-wide" lang={tag}>
        {exercise.word}
      </p>
      <div className="flex flex-wrap justify-center gap-2" aria-label={exercise.word}>
        {exercise.letters.map((letter, index) => {
          const tileIndex = used[index];
          const filled = tileIndex === undefined ? "" : (exercise.tiles[tileIndex] ?? "");
          const open = index === used.length;
          return (
            <button
              key={`${letter}-${index}`}
              type="button"
              disabled={disabled || !filled}
              onClick={() => {
                if (index === used.length - 1) update(used.slice(0, -1));
              }}
              aria-label={filled ? filled : t.spellSlot}
              className={[
                "grid h-16 min-w-12 place-items-center rounded-2xl border-b-4 bg-white px-2 text-3xl font-bold",
                filled ? "border-leaf text-ink" : open ? "border-sky text-ink/25" : "border-ink/15 text-ink/20",
              ].join(" ")}
            >
              {filled || "·"}
            </button>
          );
        })}
      </div>
      <p className="text-lg font-semibold text-ink/70">{t.spellHint}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {exercise.tiles.map((tile, index) => (
          <button
            key={`${tile}-${index}`}
            type="button"
            lang={tag}
            disabled={disabled || used.includes(index)}
            onClick={() => update([...used, index])}
            className="min-h-16 min-w-14 rounded-2xl bg-white px-3 text-3xl font-bold shadow-[0_4px_0_#e4e4e4] select-none disabled:opacity-25"
          >
            {tile}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={disabled || used.length === 0}
        onClick={() => update(used.slice(0, -1))}
        className="btn-3d btn-soft bg-white px-6 py-3 text-lg disabled:opacity-40"
      >
        {t.undo}
      </button>
    </div>
  );
}
