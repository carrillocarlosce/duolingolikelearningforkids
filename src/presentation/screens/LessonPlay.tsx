"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SoundEffectsPort, SpeechRecognitionPort, SpeechSynthPort } from "@/application/ports";
import type { Answer } from "@/domain/exercises";
import type { LessonPathItem } from "@/application/get-lesson-path";
import { buildLessonExercises, mulberry32 } from "@/domain/build-lesson";
import { answerLanguage, type Exercise, type GradeStatus } from "@/domain/exercises";
import type { Direction, Lang } from "@/domain/language";
import { SPEECH_RATE_NORMAL } from "@/domain/speech";
import { MAX_HEARTS } from "@/domain/scoring";
import {
  completionSummary,
  continueSession,
  startSession,
  submitAnswer,
  type SessionState,
} from "@/domain/session";
import type { Copy } from "@/presentation/i18n";
import { AnswerLanguageBadge } from "@/presentation/components/AnswerLanguageBadge";
import { PipoMark, type PipoMood } from "@/presentation/components/PipoMark";
import { SayPrompt } from "@/presentation/exercises/SayPrompt";
import { SpellWord } from "@/presentation/exercises/SpellWord";
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

function pipoFor(status: GradeStatus): PipoMood {
  if (status === "incorrect") return "oops";
  if (status === "skipped") return "idle";
  return "happy";
}

type LessonPlayProps = {
  lesson: LessonPathItem;
  direction: Direction;
  uiLang: Lang;
  /** Captured when the lesson opens so a settings change cannot swap the exercise mid-round. */
  letterTracing: boolean;
  /** Saved lives for today. A finished lesson fills the meter again. */
  hearts: number;
  streak: number;
  t: Copy;
  speech: SpeechSynthPort;
  recognition: SpeechRecognitionPort;
  sound: SoundEffectsPort;
  onExit: () => void;
  onHearts: (hearts: number) => void;
  onFinished: (summary: { xp: number; stars: 1 | 2 | 3 }) => void;
};

export function LessonPlay({
  lesson,
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
}: LessonPlayProps) {
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000_000));
  const [useTracing] = useState(letterTracing);
  const [canSay] = useState(
    () => recognition.supported && (typeof navigator === "undefined" || navigator.onLine),
  );
  const exercises = useMemo(() => {
    const built = buildLessonExercises(lesson.id, direction, mulberry32(seed), { letterTracing: useTracing });
    return canSay ? built : built.filter((exercise) => exercise.type !== "say");
  }, [canSay, direction, lesson.id, seed, useTracing]);
  const [phase, setPhase] = useState<"intro" | "play" | "done" | "failed">("intro");
  const [session, setSession] = useState<SessionState>(() => startSession(lesson.id, hearts));
  const [draft, setDraft] = useState<Answer | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [shownXp, setShownXp] = useState(0);
  const combo = useRef(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const exercise = exercises[session.index];
  const locked = session.phase !== "question";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [phase, exercise?.id]);

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
        onBack={() => {
          sound.play("button");
          onExit();
        }}
        onFinish={() => {
          if (!lesson.unlocked || exercises.length === 0) return;
          sound.play("button");
          if (session.hearts <= 0) {
            setPhase("failed");
            return;
          }
          setPhase("play");
        }}
      />
    );
  }

  function reactTo(next: SessionState) {
    const status = next.lastGrade?.status;
    if (status === "correct" || status === "almost") {
      sound.play("correct");
      combo.current += 1;
      if (combo.current >= 2) window.setTimeout(() => sound.play("sparkle"), 260);
      return;
    }
    if (status === "incorrect") {
      combo.current = 0;
      sound.play("wrong");
      if (next.hearts < session.hearts) window.setTimeout(() => sound.play("heart"), 180);
    }
  }

  function scoreAnswer(answer: Answer) {
    if (!exercise || session.phase !== "question") return;
    const next = submitAnswer(session, exercise, answer);
    setSession(next);
    if (next.hearts !== session.hearts) onHearts(next.hearts);
    reactTo(next);
  }

  function check() {
    if (!draft) return;
    scoreAnswer(draft);
  }

  function advance() {
    const next = continueSession(session, exercises.length);
    setSession(next);
    setDraft(null);
    if (next.outcome === "complete" && !saved) {
      setSaved(true);
      setPhase("done");
      const summary = completionSummary(next);
      sound.play("fanfare");
      const ticks = 6;
      for (let step = 1; step <= ticks; step += 1) {
        window.setTimeout(() => {
          if (!alive.current) return;
          sound.play("xp");
          setShownXp(Math.round((summary.xp * step) / ticks));
        }, 980 + step * 90);
      }
      onFinished(summary);
      return;
    }
    if (next.outcome === "failed") setPhase("failed");
  }

  if (phase === "done") {
    const summary = completionSummary(session);
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div>
          <PipoMark className="mx-auto size-40" mood="cheer" />
          <p className="mt-4 text-5xl" aria-label={`${summary.stars} stars`} draggable={false}>
            {"⭐".repeat(summary.stars)}
          </p>
          <h1 className="mt-4 text-4xl font-bold">{t.doneTitle}</h1>
          <p className="mt-3 text-3xl font-bold text-leaf-dark">
            +{shownXp} {t.xp}
          </p>
          <p className="mt-2 text-xl font-bold" aria-label={`${streak} ${streak === 1 ? t.streakOne : t.streakMany}`}>
            <span aria-hidden="true">🔥 {streak}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              sound.play("button");
              onExit();
            }}
            className="btn-3d btn-leaf mt-8 bg-leaf px-10 py-4 text-xl text-white"
          >
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
          <PipoMark className="mx-auto size-36" mood="oops" />
          <h1 className="mt-4 text-3xl font-bold">{t.outOfHearts}</h1>
          <button
            type="button"
            onClick={() => {
              sound.play("button");
              combo.current = 0;
              onHearts(MAX_HEARTS);
              setSession(startSession(lesson.id, MAX_HEARTS));
              setDraft(null);
              setPhase("play");
            }}
            className="btn-3d btn-leaf mt-8 w-full bg-leaf px-8 py-4 text-xl text-white"
          >
            {t.tryAgain}
          </button>
          <button
            type="button"
            onClick={() => {
              sound.play("button");
              onExit();
            }}
            className="btn-3d btn-soft mt-3 w-full bg-white px-8 py-4 text-xl"
          >
            {t.back}
          </button>
        </div>
      </div>
    );
  }

  const grade = session.lastGrade;
  const feedbackLang = exercise ? answerLanguage(exercise) : null;
  const banner =
    grade?.status === "correct"
      ? "bg-leaf text-white"
      : grade?.status === "almost"
        ? "bg-sun text-ink"
        : grade?.status === "skipped"
          ? "bg-sky text-white"
          : "bg-[#ff4b4b] text-white";
  const progress = exercises.length === 0 ? 0 : ((session.index + (locked ? 1 : 0)) / exercises.length) * 100;
  const selfCheck = exercise?.type === "match" || exercise?.type === "trace" || exercise?.type === "say";

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col px-4 pt-4 pb-28">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {
            sound.play("button");
            setLeaving(true);
          }}
          className="grid size-12 place-items-center rounded-2xl bg-white text-2xl font-bold"
          aria-label={t.leave}
        >
          ×
        </button>
        <div className="h-4 flex-1 overflow-hidden rounded-full bg-white" aria-hidden="true">
          <div className="h-full rounded-full bg-leaf" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-sm font-bold text-leaf-dark" aria-label={`${session.xpEarned} ${t.xp}`}>
          {session.xpEarned} {t.xp}
        </p>
        <p className="text-xl" aria-label={`${session.hearts} ${t.hearts}`}>
          {"❤".repeat(session.hearts)}
          <span className="text-ink/30">{"❤".repeat(Math.max(0, MAX_HEARTS - session.hearts))}</span>
        </p>
      </div>

        <div className="mt-5" key={exercise?.id ?? "empty"}>
        {exercise ? (
          <ExerciseBody
            exercise={exercise}
            uiLang={uiLang}
            t={t}
            draft={draft}
            disabled={locked}
            onSelect={(id) => {
              sound.play("select");
              setDraft({ type: "choice", choiceId: id });
            }}
            onTokens={setTokens}
            onText={setText}
            onEffect={(effect) => sound.play(effect)}
            onSolved={() => {
              if (exercise.type === "match") {
                scoreAnswer({ type: "match", matched: exercise.left.length, total: exercise.left.length });
              }
            }}
            onTraced={() => {
              if (exercise.type === "trace") scoreAnswer({ type: "trace", coverage: 1 });
            }}
            onSpelled={(tokens) => {
              if (exercise.type === "spell") scoreAnswer({ type: "tokens", tokens });
            }}
            onSpoken={(transcript) => {
              if (exercise.type === "say") scoreAnswer({ type: "speech", transcript });
            }}
            onMic={() => sound.play("button")}
            onEnter={check}
            speech={speech}
            recognition={recognition}
          />
        ) : null}
      </div>

      {session.phase === "feedback" && grade ? (
        <div className={`fixed inset-x-0 bottom-0 z-20 px-4 pb-4 pt-5 ${banner}`}>
          <div className="mx-auto flex w-full max-w-xl items-start gap-3">
            <PipoMark className="size-16 shrink-0" mood={pipoFor(grade.status)} />
            <div className="min-w-0 flex-1">
            <p className="text-2xl font-bold">
              {grade.status === "correct"
                ? t.correct
                : grade.status === "almost"
                  ? grade.incomplete
                    ? t.almostSentence
                    : t.almost
                  : grade.status === "skipped"
                    ? t.skipped
                    : t.wrong}
            </p>
            {grade.status !== "correct" && grade.status !== "skipped" && grade.canonical ? (
              <div className="mt-2 flex items-center gap-3">
                <p lang={feedbackLang ?? undefined} className="text-xl font-bold">
                  {grade.canonical}
                </p>
                {feedbackLang ? (
                  <button
                    type="button"
                    lang={feedbackLang}
                    aria-label={t.hearSentence}
                    onClick={() => speech.speak(grade.canonical ?? "", feedbackLang, SPEECH_RATE_NORMAL)}
                    className="grid size-14 shrink-0 place-items-center rounded-full bg-white text-2xl text-ink"
                  >
                    <span aria-hidden="true">🔊</span>
                  </button>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => {
                if (session.index + 1 < exercises.length) sound.play("button");
                advance();
              }}
              className="btn-3d mt-3 w-full bg-white py-4 text-xl text-ink"
            >
              {t.continue}
            </button>
            </div>
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
            <button
              type="button"
              onClick={() => {
                sound.play("button");
                onExit();
              }}
              className="btn-3d mt-5 w-full bg-[#ff4b4b] py-4 text-xl text-white"
            >
              {t.leave}
            </button>
            <button
              type="button"
              onClick={() => {
                sound.play("button");
                setLeaving(false);
              }}
              className="btn-3d btn-soft mt-3 w-full bg-white py-4 text-xl"
            >
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
  uiLang,
  t,
  draft,
  disabled,
  onSelect,
  onTokens,
  onText,
  onSolved,
  onTraced,
  onSpelled,
  onSpoken,
  onEffect,
  onMic,
  onEnter,
  speech,
  recognition,
}: {
  exercise: Exercise;
  uiLang: Lang;
  t: Copy;
  draft: Answer | null;
  disabled: boolean;
  onSelect: (id: string) => void;
  onTokens: (tokens: string[] | null) => void;
  onText: (text: string) => void;
  onSolved: () => void;
  onTraced: () => void;
  onSpelled: (tokens: string[]) => void;
  onSpoken: (transcript: string) => void;
  onEffect: (effect: "tap" | "select" | "wrong") => void;
  onMic: () => void;
  onEnter: () => void;
  speech: SpeechSynthPort;
  recognition: SpeechRecognitionPort;
}) {
  const selected = draft?.type === "choice" ? draft.choiceId : null;
  const body = (() => {
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
      return (
        <MatchPairs exercise={exercise} t={t} disabled={disabled} onSolved={onSolved} onEffect={onEffect} />
      );
    case "build":
      return (
        <BuildSentence
          exercise={exercise}
          t={t}
          disabled={disabled}
          onDraft={onTokens}
          onEffect={onEffect}
          speech={speech}
        />
      );
    case "type":
      return (
        <TypeAnswer
          exercise={exercise}
          t={t}
          disabled={disabled}
          onDraft={onText}
          onEnter={onEnter}
          speech={speech}
        />
      );
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
      return (
        <TraceWord exercise={exercise} t={t} disabled={disabled} onSolved={onTraced} />
      );
    case "spell":
      return (
        <SpellWord
          exercise={exercise}
          t={t}
          speech={speech}
          disabled={disabled}
          onDraft={onTokens}
          onSolved={onSpelled}
          onEffect={onEffect}
        />
      );
    case "say":
      return (
        <SayPrompt
          exercise={exercise}
          t={t}
          speech={speech}
          recognition={recognition}
          disabled={disabled}
          onResult={onSpoken}
          onMic={onMic}
        />
      );
    default:
      return null;
  }
  })();

  return (
    <div className="flex flex-col gap-4">
      <AnswerLanguageBadge exercise={exercise} uiLang={uiLang} t={t} speech={speech} />
      {body}
    </div>
  );
}
