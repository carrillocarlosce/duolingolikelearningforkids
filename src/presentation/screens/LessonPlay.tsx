"use client";

import { useCallback, useMemo, useState } from "react";
import type { SpeechSynthPort } from "@/application/ports";
import type { LessonPathItem } from "@/application/get-lesson-path";
import { buildLessonExercises, mulberry32 } from "@/domain/build-lesson";
import type { Answer, Exercise } from "@/domain/exercises";
import type { Direction } from "@/domain/language";
import { MAX_HEARTS } from "@/domain/scoring";
import {
  completionSummary,
  continueSession,
  startSession,
  submitAnswer,
  type SessionState,
} from "@/domain/session";
import type { Copy } from "@/presentation/i18n";
import { TraceWord } from "@/presentation/exercises/TraceWord";
import {
  BuildSentence,
  ListenPick,
  MatchPairs,
  PictureWord,
  TypeAnswer,
  WordPicture,
} from "@/presentation/exercises/views";
import { LessonReader } from "@/presentation/screens/LessonReader";

type LessonPlayProps = {
  lesson: LessonPathItem;
  direction: Direction;
  t: Copy;
  speech: SpeechSynthPort;
  onExit: () => void;
  onFinished: (summary: { xp: number; stars: 1 | 2 | 3 }) => void;
};

export function LessonPlay({ lesson, direction, t, speech, onExit, onFinished }: LessonPlayProps) {
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000_000));
  const exercises = useMemo(
    () => buildLessonExercises(lesson.id, direction, mulberry32(seed)),
    [lesson.id, direction, seed],
  );
  const [phase, setPhase] = useState<"intro" | "play" | "done" | "failed">("intro");
  const [session, setSession] = useState<SessionState>(() => startSession(lesson.id, MAX_HEARTS));
  const [draft, setDraft] = useState<Answer | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const exercise = exercises[session.index];
  const locked = session.phase !== "question";

  const setTokens = useCallback((tokens: string[] | null) => {
    setDraft(tokens ? { type: "tokens", tokens } : null);
  }, []);
  const setText = useCallback((text: string) => {
    setDraft(text.trim() ? { type: "text", text } : null);
  }, []);

  if (!lesson.unlocked || phase === "intro") {
    return (
      <LessonReader
        lesson={lesson}
        t={t}
        saving={false}
        actionLabel={t.start}
        speech={speech}
        onBack={onExit}
        onFinish={() => {
          if (lesson.unlocked && exercises.length > 0) setPhase("play");
        }}
      />
    );
  }

  function check() {
    if (!exercise || !draft || session.phase !== "question") return;
    setSession(submitAnswer(session, exercise, draft));
  }

  function advance() {
    const next = continueSession(session, exercises.length);
    setSession(next);
    setDraft(null);
    if (next.outcome === "complete" && !saved) {
      setSaved(true);
      setPhase("done");
      onFinished(completionSummary(next));
      return;
    }
    if (next.outcome === "failed") setPhase("failed");
  }

  if (phase === "done") {
    const summary = completionSummary(session);
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="text-5xl" aria-label={`${summary.stars} stars`}>
            {"⭐".repeat(summary.stars)}
          </p>
          <h1 className="mt-4 text-4xl font-bold">{t.doneTitle}</h1>
          <button type="button" onClick={onExit} className="btn-3d btn-leaf mt-8 bg-leaf px-10 py-4 text-xl text-white">
            {t.continue}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "failed") {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <p className="text-5xl">💛</p>
          <h1 className="mt-4 text-3xl font-bold">{t.outOfHearts}</h1>
          <button
            type="button"
            onClick={() => {
              setSession(startSession(lesson.id, MAX_HEARTS));
              setDraft(null);
              setPhase("play");
            }}
            className="btn-3d btn-leaf mt-8 w-full bg-leaf px-8 py-4 text-xl text-white"
          >
            {t.tryAgain}
          </button>
          <button type="button" onClick={onExit} className="btn-3d btn-soft mt-3 w-full bg-white px-8 py-4 text-xl">
            {t.back}
          </button>
        </div>
      </div>
    );
  }

  const grade = session.lastGrade;
  const banner =
    grade?.status === "correct"
      ? "bg-leaf text-white"
      : grade?.status === "almost"
        ? "bg-sun text-ink"
        : "bg-[#ff4b4b] text-white";
  const progress = exercises.length === 0 ? 0 : ((session.index + (locked ? 1 : 0)) / exercises.length) * 100;
  const selfCheck = exercise?.type === "match" || exercise?.type === "trace";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pt-4 pb-36">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setLeaving(true)}
          className="grid size-12 place-items-center rounded-2xl bg-white text-2xl font-bold"
          aria-label={t.leave}
        >
          ×
        </button>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-white" aria-hidden="true">
          <div className="h-full rounded-full bg-leaf" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xl" aria-label={`${session.hearts} ${t.hearts}`}>
          {"❤".repeat(session.hearts)}
          <span className="text-ink/30">{"❤".repeat(Math.max(0, MAX_HEARTS - session.hearts))}</span>
        </p>
      </div>

        <div className="mt-5" key={exercise?.id ?? "empty"}>
        {exercise ? (
          <ExerciseBody
            exercise={exercise}
            t={t}
            draft={draft}
            disabled={locked}
            onSelect={(id) => setDraft({ type: "choice", choiceId: id })}
            onTokens={setTokens}
            onText={setText}
            onSolved={() => {
              if (session.phase === "question" && exercise.type === "match") {
                setSession(
                  submitAnswer(session, exercise, {
                    type: "match",
                    matched: exercise.left.length,
                    total: exercise.left.length,
                  }),
                );
              }
            }}
            onTraced={() => {
              if (session.phase === "question" && exercise.type === "trace") {
                setSession(submitAnswer(session, exercise, { type: "trace", coverage: 1 }));
              }
            }}
            onEnter={check}
            speech={speech}
          />
        ) : null}
      </div>

      {session.phase === "feedback" && grade ? (
        <div className={`fixed inset-x-0 bottom-0 z-20 px-4 pb-4 pt-5 ${banner}`}>
          <div className="mx-auto w-full max-w-xl">
            <p className="text-2xl font-bold">
              {grade.status === "correct" ? t.correct : grade.status === "almost" ? t.almost : t.wrong}
            </p>
            {grade.status !== "correct" && grade.canonical ? (
              <p className="text-xl font-bold">{grade.canonical}</p>
            ) : null}
            <button
              type="button"
              onClick={advance}
              className="btn-3d mt-3 w-full bg-white py-4 text-xl text-ink"
            >
              {t.continue}
            </button>
          </div>
        </div>
      ) : (
        <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-4">
          <div className="mx-auto w-full max-w-xl">
            {selfCheck ? null : (
            <button
              type="button"
              disabled={!draft}
              onClick={check}
              className="btn-3d btn-leaf w-full bg-leaf py-4 text-xl text-white disabled:bg-slate-300 disabled:opacity-70"
            >
              {t.check}
            </button>
            )}
          </div>
        </div>
      )}

      {leaving ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-ink/40 p-4" role="presentation">
          <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-[2rem] bg-white p-6 text-center">
            <h2 className="text-2xl font-bold">{t.leaveTitle}</h2>
            <button type="button" onClick={onExit} className="btn-3d mt-5 w-full bg-[#ff4b4b] py-4 text-xl text-white">
              {t.leave}
            </button>
            <button type="button" onClick={() => setLeaving(false)} className="btn-3d btn-soft mt-3 w-full bg-white py-4 text-xl">
              {t.keepGoing}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ExerciseBody({
  exercise,
  t,
  draft,
  disabled,
  onSelect,
  onTokens,
  onText,
  onSolved,
  onTraced,
  onEnter,
  speech,
}: {
  exercise: Exercise;
  t: Copy;
  draft: Answer | null;
  disabled: boolean;
  onSelect: (id: string) => void;
  onTokens: (tokens: string[] | null) => void;
  onText: (text: string) => void;
  onSolved: () => void;
  onTraced: () => void;
  onEnter: () => void;
  speech: SpeechSynthPort;
}) {
  const selected = draft?.type === "choice" ? draft.choiceId : null;
  switch (exercise.type) {
    case "picture-word":
      return (
        <PictureWord exercise={exercise} t={t} selected={selected} disabled={disabled} onSelect={onSelect} />
      );
    case "word-picture":
      return (
        <WordPicture exercise={exercise} t={t} selected={selected} disabled={disabled} onSelect={onSelect} />
      );
    case "match":
      return <MatchPairs exercise={exercise} t={t} disabled={disabled} onSolved={onSolved} />;
    case "build":
      return <BuildSentence exercise={exercise} t={t} disabled={disabled} onDraft={onTokens} />;
    case "type":
      return <TypeAnswer exercise={exercise} t={t} disabled={disabled} onDraft={onText} onEnter={onEnter} />;
    case "listen":
      return (
        <ListenPick
          exercise={exercise}
          t={t}
          speech={speech}
          selected={selected}
          disabled={disabled}
          onSelect={onSelect}
        />
      );
    case "trace":
      return <TraceWord exercise={exercise} t={t} disabled={disabled} onSolved={onTraced} />;
    default:
      return null;
  }
}
