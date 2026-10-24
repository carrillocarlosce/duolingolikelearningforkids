"use client";

import { useEffect, useRef, useState } from "react";
import type { SpeechSynthPort } from "@/application/ports";
import { getSentence } from "@/domain/content/sentences";
import { getVocab } from "@/domain/content/vocabulary";
import type { Exercise } from "@/domain/exercises";
import { SPEECH_RATE_NORMAL, SPEECH_RATE_SLOW } from "@/domain/speech";
import { SentenceSceneView } from "@/presentation/components/SentenceSceneView";
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
  const themed = Boolean(exercise.scene);
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-center text-2xl font-bold" lang={themed ? (exercise.promptLang ?? undefined) : undefined}>
        {themed ? exercise.promptText : t.whatIsThis}
      </h2>
      {exercise.scene ? (
        <SentenceSceneView scene={exercise.scene} />
      ) : (
        <div className="mx-auto grid size-40 place-items-center rounded-[2rem] bg-white text-7xl shadow-[0_4px_0_#e4e4e4]">
          <span aria-hidden="true" draggable={false}>
            {item.emoji}
          </span>
        </div>
      )}
      {!themed && exercise.showPromptWord ? (
        <p lang={exercise.promptLang ?? undefined} className="text-center text-3xl font-bold text-sky">
          {exercise.promptText}
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
              <span aria-hidden="true" draggable={false}>
                {item.emoji}
              </span>
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
  onEffect,
}: {
  exercise: Extract<Exercise, { type: "match" }>;
  t: Copy;
  disabled: boolean;
  onSolved: () => void;
  onEffect: (effect: "tap" | "select" | "wrong") => void;
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
      } else {
        onEffect("select");
      }
      return;
    }
    onEffect("wrong");
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
              onClick={() => {
                onEffect("tap");
                setPicked(side.pairId);
              }}
              className={[
                "min-h-16 rounded-2xl border-2 px-3 py-3 text-xl font-bold",
                done.includes(side.pairId) ? "border-leaf bg-leaf/15" : "bg-white",
                picked === side.pairId ? "border-sky" : "border-transparent",
              ].join(" ")}
            >
              <span className="text-3xl" aria-hidden="true" draggable={false}>
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
  onEffect,
  speech,
}: {
  exercise: Extract<Exercise, { type: "build" }>;
  t: Copy;
  disabled: boolean;
  onDraft: (tokens: string[] | null) => void;
  onEffect: (effect: "tap") => void;
  speech: SpeechSynthPort;
}) {
  const [used, setUsed] = useState<number[]>([]);
  const instruction = exercise.answerLang === "en" ? t.buildInEnglish : t.buildInSpanish;
  const wordCount = exercise.answerTokens.length;
  const slotCount = Math.max(wordCount, used.length);

  function update(next: number[]) {
    onEffect("tap");
    setUsed(next);
    const tokens = next.map((index) => exercise.tiles[index] ?? "");
    onDraft(tokens.length > 0 ? tokens : null);
  }

  return (
    <div className="flex flex-col gap-4">
      <SentenceSceneView scene={exercise.scene} />
      <h2 className="text-center text-2xl font-bold">{instruction}</h2>
      <div className="flex items-center gap-3">
        <p
          lang={exercise.sourceLang}
          className="flex-1 rounded-2xl bg-white px-4 py-3 text-center text-2xl font-bold"
        >
          “{exercise.sourceText}”
        </p>
        <button
          type="button"
          lang={exercise.answerLang}
          aria-label={t.hearSentence}
          onClick={() => speech.speak(exercise.speakText, exercise.answerLang, SPEECH_RATE_NORMAL)}
          className="grid size-16 shrink-0 place-items-center rounded-full bg-sky text-3xl text-white shadow-[0_4px_0_#1899d6]"
        >
          <span aria-hidden="true">🔊</span>
        </button>
      </div>
      <p className="text-center text-lg font-bold text-ink/70">
        {t.needWords} {wordCount} {wordCount === 1 ? t.oneWord : t.manyWords}
      </p>
      <div
        lang={exercise.answerLang}
        className="min-h-24 rounded-3xl border-2 border-dashed border-sky/40 bg-white/70 p-3"
        aria-label={`${wordCount} ${wordCount === 1 ? t.oneWord : t.manyWords}`}
      >
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: slotCount }, (_, position) => {
            const tileIndex = used[position];
            if (tileIndex === undefined) {
              return (
                <span
                  key={`slot-${position}`}
                  className="inline-block h-12 min-w-16 rounded-xl border-b-4 border-dashed border-sky/60"
                />
              );
            }
            return (
              <button
                key={`${tileIndex}-${position}`}
                type="button"
                disabled={disabled}
                onClick={() => update(used.filter((_, index) => index !== position))}
                className="rounded-xl bg-sky px-3 py-2 text-xl font-bold text-white"
              >
                {exercise.tiles[tileIndex]}
              </button>
            );
          })}
        </div>
      </div>
      <div lang={exercise.answerLang} className="flex flex-wrap gap-2">
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
      <h2
        className="text-center text-2xl font-bold"
        lang={exercise.clozeText ? exercise.answerLang : undefined}
      >
        {exercise.clozeText ?? t.hearWord}
      </h2>
      {exercise.scene ? <SentenceSceneView scene={exercise.scene} /> : null}
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
  speech,
}: {
  exercise: Extract<Exercise, { type: "type" }>;
  t: Copy;
  disabled: boolean;
  onDraft: (text: string) => void;
  onEnter: () => void;
  speech: SpeechSynthPort;
}) {
  const [value, setValue] = useState("");
  const sentence = Boolean(exercise.sentenceId) || (exercise.accepted[0]?.includes(" ") ?? false);
  const instruction = exercise.answerLang === "en" ? t.typeInEnglish : t.typeInSpanish;
  const showSource = Boolean(exercise.sourceText && exercise.sourceText !== exercise.promptText);
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-center text-2xl font-bold">{sentence ? instruction : t.typeWord}</h2>
      {exercise.scene ? <SentenceSceneView scene={exercise.scene} /> : null}
      {exercise.emoji ? (
        <p className="text-center text-6xl" draggable={false}>
          {exercise.emoji}
        </p>
      ) : null}
      {showSource && exercise.sourceText && exercise.sourceLang ? (
        <p lang={exercise.sourceLang} className="rounded-2xl bg-white px-4 py-3 text-center text-2xl font-bold">
          “{exercise.sourceText}”
        </p>
      ) : null}
      {!exercise.hidePromptText && exercise.promptText ? (
        <div className="flex items-center gap-3">
          <p lang={exercise.promptLang} className="flex-1 rounded-2xl bg-white px-4 py-3 text-center text-2xl font-bold">
            {exercise.promptText}
          </p>
          {sentence ? (
            <button
              type="button"
              lang={exercise.answerLang}
              aria-label={t.hearSentence}
              onClick={() => speech.speak(exercise.speakText, exercise.answerLang, SPEECH_RATE_NORMAL)}
              className="grid size-16 shrink-0 place-items-center rounded-full bg-sky text-3xl text-white shadow-[0_4px_0_#1899d6]"
            >
              <span aria-hidden="true">🔊</span>
            </button>
          ) : null}
        </div>
      ) : null}
      <input
        value={value}
        disabled={disabled}
        lang={exercise.answerLang}
        inputMode="text"
        enterKeyHint="done"
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="off"
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

export function FillBlank({
  exercise,
  t,
  speech,
  selected,
  disabled,
  onSelect,
}: {
  exercise: Extract<Exercise, { type: "fill" }>;
  t: Copy;
  speech: SpeechSynthPort;
  selected: string | null;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 lang={exercise.answerLang} className="flex-1 text-center text-2xl font-bold">
          {exercise.clozeText}
        </h2>
        <button
          type="button"
          lang={exercise.answerLang}
          aria-label={t.hearSentence}
          onClick={() => speech.speak(exercise.speakText, exercise.answerLang, SPEECH_RATE_NORMAL)}
          className="grid size-16 shrink-0 place-items-center rounded-full bg-sky text-3xl text-white shadow-[0_4px_0_#1899d6]"
        >
          <span aria-hidden="true">🔊</span>
        </button>
      </div>
      <SentenceSceneView scene={exercise.scene} />
      <div className="grid gap-3">
        {exercise.choiceIds.map((id) => (
          <button
            key={id}
            type="button"
            lang={exercise.answerLang}
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

export function OddOneOut({
  exercise,
  t,
  speech,
  selected,
  disabled,
  onSelect,
}: {
  exercise: Extract<Exercise, { type: "odd" }>;
  t: Copy;
  speech: SpeechSynthPort;
  selected: string | null;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <h2 lang={exercise.answerLang} className="flex-1 text-center text-2xl font-bold">
          {exercise.promptText}
        </h2>
        <button
          type="button"
          lang={exercise.answerLang}
          aria-label={t.listen}
          onClick={() => speech.speak(exercise.promptText, exercise.answerLang, SPEECH_RATE_NORMAL)}
          className="grid size-16 shrink-0 place-items-center rounded-full bg-sky text-3xl text-white shadow-[0_4px_0_#1899d6]"
        >
          <span aria-hidden="true">🔊</span>
        </button>
      </div>
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
                "grid place-items-center gap-1 rounded-[1.75rem] border-4 bg-white px-3 py-4",
                "shadow-[0_4px_0_#e4e4e4] active:translate-y-1 active:shadow-none",
                selected === id ? "border-sky" : "border-transparent",
              ].join(" ")}
            >
              <span aria-hidden="true" draggable={false} className="text-5xl">
                {item.emoji}
              </span>
              <span lang={exercise.answerLang} className="text-center text-lg font-bold">
                {item[exercise.answerLang]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ListenOnly({
  exercise,
  t,
  speech,
  selected,
  disabled,
  onSelect,
}: {
  exercise: Extract<Exercise, { type: "listen-only" }>;
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
        <p className="rounded-2xl bg-cream px-4 py-3 text-center text-xl font-bold">{t.noVoice} {exercise.audioText}</p>
      ) : null}
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
              <span aria-hidden="true" draggable={false}>
                {item.emoji}
              </span>
              <span className="sr-only">{item[exercise.audioLang]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SellerRoleplay({
  exercise,
  t,
  speech,
  selected,
  disabled,
  onSelect,
}: {
  exercise: Extract<Exercise, { type: "roleplay" }>;
  t: Copy;
  speech: SpeechSynthPort;
  selected: string | null;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  useEffect(() => {
    speech.speak(exercise.promptText, exercise.promptLang, SPEECH_RATE_NORMAL);
    return () => speech.stop();
  }, [exercise.id, exercise.promptLang, exercise.promptText, speech]);

  return (
    <div className="flex flex-col gap-4">
      <SentenceSceneView scene={exercise.scene} />
      <div className="flex items-center gap-3">
        <h2 lang={exercise.promptLang} className="flex-1 text-center text-2xl font-bold">
          {exercise.promptText}
        </h2>
        <button
          type="button"
          lang={exercise.promptLang}
          aria-label={t.listen}
          onClick={() => speech.speak(exercise.promptText, exercise.promptLang, SPEECH_RATE_NORMAL)}
          className="grid size-16 shrink-0 place-items-center rounded-full bg-sky text-3xl text-white shadow-[0_4px_0_#1899d6]"
        >
          <span aria-hidden="true">🔊</span>
        </button>
      </div>
      <div className="grid gap-3">
        {exercise.choiceIds.map((id) => (
          <button
            key={id}
            type="button"
            lang={exercise.promptLang}
            disabled={disabled}
            aria-pressed={selected === id}
            onClick={() => onSelect(id)}
            className={choiceClass(selected === id)}
          >
            {getSentence(id)[exercise.promptLang]}
          </button>
        ))}
      </div>
      {disabled ? (
        <p lang={exercise.promptLang} className="text-center text-2xl font-bold">
          {exercise.replyText}
        </p>
      ) : null}
    </div>
  );
}
