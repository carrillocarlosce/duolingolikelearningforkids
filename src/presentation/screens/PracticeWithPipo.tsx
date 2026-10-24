"use client";

import { useMemo, useState } from "react";
import type { LessonPathItem } from "@/application/get-lesson-path";
import type { SoundEffectsPort, SpeechRecognitionPort, SpeechSynthPort } from "@/application/ports";
import { buildReviewExercises, mulberry32 } from "@/domain/build-lesson";
import type { Exercise, GradeStatus } from "@/domain/exercises";
import type { Direction, Lang } from "@/domain/language";
import { reviewCards, type ReviewPick } from "@/domain/review";
import type { Copy } from "@/presentation/i18n";
import { PipoMark } from "@/presentation/components/PipoMark";
import { LessonPlay } from "@/presentation/screens/LessonPlay";

type PracticeWithPipoProps = {
  picks: readonly ReviewPick[];
  direction: Direction;
  uiLang: Lang;
  letterTracing: boolean;
  hearts: number;
  streak: number;
  t: Copy;
  speech: SpeechSynthPort;
  recognition: SpeechRecognitionPort;
  sound: SoundEffectsPort;
  onExit: () => void;
  onHearts: (hearts: number) => void;
  onFinished: (summary: { xp: number; stars: 1 | 2 | 3 }) => void;
  onGraded: (exercise: Exercise, status: GradeStatus) => void;
};

export function PracticeWithPipo({
  picks,
  direction,
  uiLang,
  letterTracing,
  hearts,
  streak,
  t,
  speech,
  recognition,
  sound,
  onExit,
  onHearts,
  onFinished,
  onGraded,
}: PracticeWithPipoProps) {
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000_000));
  const exercises = useMemo(
    () => buildReviewExercises(picks, direction, mulberry32(seed)),
    [direction, picks, seed],
  );
  const cards = useMemo(() => reviewCards(picks), [picks]);
  const lesson: LessonPathItem = {
    id: "practice-with-pipo",
    emoji: "🥭",
    title: { en: "Practice with Pipo", es: "Practica con Pipo" },
    blurb: { en: "Words to try again.", es: "Palabras para intentar otra vez." },
    kind: "review",
    vocabIds: picks.filter((pick) => pick.kind === "word").map((pick) => pick.id),
    sentenceIds: picks.filter((pick) => pick.kind === "sentence").map((pick) => pick.id),
    unlocked: true,
    completed: false,
    current: true,
  };

  if (picks.length === 0) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-center px-6 pt-10 text-center">
        <PipoMark className="size-36" />
        <h1 className="mt-4 text-3xl font-bold">{t.practiceEmptyTitle}</h1>
        <p className="mt-3 text-xl font-semibold leading-snug">{t.practiceEmpty}</p>
        <button
          type="button"
          onClick={() => {
            sound.play("button");
            onExit();
          }}
          className="btn-3d btn-leaf mt-8 bg-leaf px-10 py-4 text-xl text-white"
        >
          {t.back}
        </button>
      </div>
    );
  }

  return (
    <LessonPlay
      lesson={lesson}
      direction={direction}
      uiLang={uiLang}
      letterTracing={letterTracing}
      hearts={hearts}
      streak={streak}
      t={t}
      speech={speech}
      recognition={recognition}
      sound={sound}
      prepared={exercises}
      cards={cards}
      onExit={onExit}
      onHearts={onHearts}
      onFinished={onFinished}
      onGraded={onGraded}
    />
  );
}
