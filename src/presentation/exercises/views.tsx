"use client";

import { useEffect, useRef, useState } from "react";
import type { SpeechSynthPort } from "@/application/ports";
import { getVocab } from "@/domain/content/vocabulary";
import type { Exercise } from "@/domain/exercises";
import { SPEECH_RATE_NORMAL, SPEECH_RATE_SLOW } from "@/domain/speech";
import type { Copy } from "@/presentation/i18n";

function choiceClass(selected: boolean): string {
  return [
    "rounded-2xl border-2 px-4 py-4 text-left text-2xl font-bold",
    "shadow-[0_4px_0_#e4e4e4] active:translate-y-1 active:shadow-none",
    selected ? "border-sky bg-sky/10" : "border-transparent bg-white",
  ].join(" ");
}

export function PictureWord({
  exercise,
  t,
  selected,
  disabled,
  onSelect,
}: {
  exercise: Extract<Exercise, { type: "picture-word" }>;
  t: Copy;
  selected: string | null;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  const item = getVocab(exercise.itemId);
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-center text-2xl font-bold">{t.whatIsThis}</h2>
      <div className="mx-auto grid size-40 place-items-center rounded-[2rem] bg-white text-7xl shadow-[0_4px_0_#e4e4e4]">
        <span aria-hidden="true">{item.emoji}</span>
      </div>
      {exercise.showPromptWord ? (
        <p className="text-center text-3xl font-bold text-sky">{exercise.promptText}</p>
      ) : null}
      <div className="grid gap-3">
        {exercise.choiceIds.map((id) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            aria-pressed={selected === id}
            onClick={() => onSelect(id)}
            className={choiceClass(selected === id)}
          >
            {getVocab(id)[exercise.answerLang]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function WordPicture({
  exercise,
  t,
  selected,
  disabled,
  onSelect,
}: {
  exercise: Extract<Exercise, { type: "word-picture" }>;
  t: Copy;
  selected: string | null;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-center text-2xl font-bold">{t.tapPicture}</h2>
      <p className="text-center text-4xl font-bold">{exercise.promptText}</p>
      <div className="grid grid-cols-2 gap-3">
        {exercise.choiceIds.map((id) => {
          const item = getVocab(id);
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              aria-pressed={selected === id}
              onClick={() => onSelect(id)}
              className={[
                "grid aspect-square place-items-center rounded-[1.75rem] border-4 bg-white text-6xl",
                "shadow-[0_4px_0_#e4e4e4] active:translate-y-1 active:shadow-none",
                selected === id ? "border-sky" : "border-transparent",
              ].join(" ")}
            >
              <span aria-hidden="true">{item.emoji}</span>
              <span className="sr-only">{item.en}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MatchPairs({
  exercise,
  t,
  disabled,
  onSolved,
}: {
  exercise: Extract<Exercise, { type: "match" }>;
  t: Copy;
  disabled: boolean;
  onSolved: () => void;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [shake, setShake] = useState(false);
  const solved = useRef(false);

  function chooseRight(pairId: string) {
    if (!picked || disabled || done.includes(pairId)) return;
    if (picked === pairId) {
      const next = [...done, pairId];
      setDone(next);
      setPicked(null);
      if (!solved.current && next.length === exercise.left.length) {
        solved.current = true;
        onSolved();
      }
      return;
    }
    setShake(true);
    window.setTimeout(() => {
      setShake(false);
      setPicked(null);
    }, 400);
  }

  return (
    <div className={shake ? "shake" : undefined}>
      <h2 className="mb-4 text-center text-2xl font-bold">{t.match}</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-3">
          {exercise.left.map((side) => (
            <button
              key={`l-${side.pairId}`}
              type="button"
              disabled={disabled || done.includes(side.pairId)}
              aria-pressed={picked === side.pairId}
              onClick={() => setPicked(side.pairId)}
              className={[
                "min-h-16 rounded-2xl border-2 px-3 py-3 text-xl font-bold",
                done.includes(side.pairId) ? "border-leaf bg-leaf/15" : "bg-white",
                picked === side.pairId ? "border-sky" : "border-transparent",
              ].join(" ")}
            >
              <span className="text-3xl" aria-hidden="true">
                {side.emoji ?? ""}
              </span>
              {side.text ? <span className="mt-1 block">{side.text}</span> : null}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {exercise.right.map((side) => (
            <button
              key={`r-${side.pairId}`}
              type="button"
              disabled={disabled || done.includes(side.pairId) || !picked}
              onClick={() => chooseRight(side.pairId)}
              className={[
                "min-h-16 rounded-2xl border-2 bg-white px-3 py-3 text-xl font-bold",
                done.includes(side.pairId) ? "border-leaf bg-leaf/15" : "border-transparent",
              ].join(" ")}
            >
              {side.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BuildSentence({
  exercise,
  t,
  disabled,
  onDraft,
}: {
  exercise: Extract<Exercise, { type: "build" }>;
  t: Copy;
  disabled: boolean;
  onDraft: (tokens: string[] | null) => void;
}) {
  const [used, setUsed] = useState<number[]>([]);

  function update(next: number[]) {
    setUsed(next);
    const tokens = next.map((index) => exercise.tiles[index] ?? "");
    onDraft(tokens.length > 0 ? tokens : null);
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-center text-2xl font-bold">{t.build}</h2>
      {exercise.emoji ? <p className="text-center text-4xl">{exercise.emoji}</p> : null}
      {exercise.showPromptText ? (
        <p className="rounded-2xl bg-white px-4 py-3 text-center text-2xl font-bold">{exercise.promptText}</p>
      ) : null}
      <div className="min-h-24 rounded-3xl border-2 border-dashed border-sky/40 bg-white/70 p-3">
        <div className="flex flex-wrap gap-2">
          {used.map((tileIndex, position) => (
            <button
              key={`${tileIndex}-${position}`}
              type="button"
              disabled={disabled}
              onClick={() => update(used.filter((_, index) => index !== position))}
              className="rounded-xl bg-sky px-3 py-2 text-xl font-bold text-white"
            >
              {exercise.tiles[tileIndex]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {exercise.tiles.map((tile, index) => (
          <button
            key={`${tile}-${index}`}
            type="button"
            disabled={disabled || used.includes(index)}
            onClick={() => update([...used, index])}
            className="rounded-xl bg-white px-3 py-2 text-xl font-bold shadow-[0_3px_0_#e4e4e4] disabled:opacity-30"
          >
            {tile}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ListenPick({
  exercise,
  t,
  speech,
  selected,
  disabled,
  onSelect,
}: {
  exercise: Extract<Exercise, { type: "listen" }>;
  t: Copy;
  speech: SpeechSynthPort;
  selected: string | null;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  const [slow, setSlow] = useState(false);
  const [settled, setSettled] = useState(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return true;
    return window.speechSynthesis.getVoices().length > 0;
  });
  const rate = slow ? SPEECH_RATE_SLOW : SPEECH_RATE_NORMAL;
  const missing = settled && !speech.hasVoice(exercise.audioLang);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const mark = () => {
      if (synth.getVoices().length > 0) setSettled(true);
    };
    synth.addEventListener("voiceschanged", mark);
    const timer = window.setTimeout(() => setSettled(true), 700);
    return () => {
      synth.removeEventListener("voiceschanged", mark);
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    speech.speak(exercise.audioText, exercise.audioLang, SPEECH_RATE_NORMAL);
    return () => speech.stop();
  }, [exercise.audioLang, exercise.audioText, exercise.id, speech]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-center text-2xl font-bold">{t.hearWord}</h2>
      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={() => speech.speak(exercise.audioText, exercise.audioLang, rate)}
          className="grid size-24 place-items-center rounded-full bg-sky text-4xl text-white shadow-[0_4px_0_#1899d6]"
          aria-label={t.listen}
        >
          🔊
        </button>
        <button
          type="button"
          aria-pressed={slow}
          aria-label={t.slow}
          onClick={() => {
            setSlow((value) => !value);
            speech.speak(exercise.audioText, exercise.audioLang, slow ? SPEECH_RATE_NORMAL : SPEECH_RATE_SLOW);
          }}
          className="grid size-24 place-items-center rounded-full bg-white text-4xl shadow-[0_4px_0_#e4e4e4]"
        >
          🐢
        </button>
      </div>
      {missing ? (
        <p className="rounded-2xl bg-cream px-4 py-3 text-center text-xl font-bold">
          {t.noVoice} {exercise.audioText}
        </p>
      ) : null}
      <div className="grid gap-3">
        {exercise.choiceIds.map((id) => (
          <button
            key={id}
            type="button"
            disabled={disabled}
            aria-pressed={selected === id}
            onClick={() => onSelect(id)}
            className={choiceClass(selected === id)}
          >
            {getVocab(id)[exercise.answerLang]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TypeAnswer({
  exercise,
  t,
  disabled,
  onDraft,
  onEnter,
}: {
  exercise: Extract<Exercise, { type: "type" }>;
  t: Copy;
  disabled: boolean;
  onDraft: (text: string) => void;
  onEnter: () => void;
}) {
  const [value, setValue] = useState("");
  const sentence = exercise.accepted[0]?.includes(" ") ?? false;
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-center text-2xl font-bold">{sentence ? t.typeSentence : t.typeWord}</h2>
      {exercise.emoji ? <p className="text-center text-6xl">{exercise.emoji}</p> : null}
      {!exercise.hidePromptText && exercise.promptText ? (
        <p className="rounded-2xl bg-white px-4 py-3 text-center text-2xl font-bold">{exercise.promptText}</p>
      ) : null}
      <input
        value={value}
        disabled={disabled}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label={sentence ? t.typeSentence : t.typeWord}
        onChange={(event) => {
          setValue(event.target.value);
          onDraft(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") onEnter();
        }}
        className="w-full rounded-2xl border-4 border-white bg-white px-4 py-4 text-2xl font-bold outline-none focus:border-sky"
      />
    </div>
  );
}
