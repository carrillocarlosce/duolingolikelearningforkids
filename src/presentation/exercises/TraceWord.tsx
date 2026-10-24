"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SpeechSynthPort } from "@/application/ports";
import type { Exercise } from "@/domain/exercises";
import type { Lang } from "@/domain/language";
import {
  canvasBitmapSize,
  coverAlongSegment,
  lettersOf,
  pointerToBox,
  layoutStartDots,
  pointOnStroke,
  pointsUntil,
  sampleCheckpoints,
  shouldCompleteStroke,
  strokesForLetter,
  type Point,
} from "@/domain/letter-strokes";
import { answerHelper, WritingBadge } from "@/presentation/components/WritingBadge";
import type { Copy } from "@/presentation/i18n";

type TraceProgress = {
  letterIndex: number;
  strokeIndex: number;
  covered: number;
  snapping: boolean;
};

type Guide = { points: Point[]; checkpoints: Point[] };

export function TraceWord({
  exercise,
  t,
  uiLang,
  speech,
  disabled,
  onSolved,
}: {
  exercise: Extract<Exercise, { type: "trace" }>;
  t: Copy;
  uiLang: Lang;
  speech: SpeechSynthPort;
  disabled: boolean;
  onSolved: () => void;
}) {
  const letters = useMemo(() => lettersOf(exercise.word), [exercise.word]);
  const [progress, setProgress] = useState<TraceProgress>({
    letterIndex: 0,
    strokeIndex: 0,
    covered: 0,
    snapping: false,
  });
  const progressRef = useRef(progress);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const guideRef = useRef<Guide[]>([]);
  const lettersRef = useRef(letters);
  const disabledRef = useRef(disabled);
  const contactRef = useRef<Point | null>(null);
  const lastFinger = useRef<Point | null>(null);
  const solved = useRef(false);
  const onSolvedRef = useRef(onSolved);
  const drawRef = useRef<() => void>(() => {});

  const letter = letters[progress.letterIndex] ?? "";
  const strokes = useMemo(() => strokesForLetter(letter), [letter]);

  const commit = useCallback((next: TraceProgress) => {
    progressRef.current = next;
    setProgress(next);
  }, []);

  useEffect(() => {
    onSolvedRef.current = onSolved;
  }, [onSolved]);

  useEffect(() => {
    lettersRef.current = letters;
  }, [letters]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    guideRef.current = strokes.map((stroke) => ({
      points: stroke.points,
      checkpoints: sampleCheckpoints(stroke.points),
    }));
  }, [strokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const paint = () => {
      const rect = canvas.getBoundingClientRect();
      const bitmap = canvasBitmapSize(rect.width, rect.height, window.devicePixelRatio || 1);
      if (rect.width < 2 || rect.height < 2) return;
      if (canvas.width !== bitmap.width) canvas.width = bitmap.width;
      if (canvas.height !== bitmap.height) canvas.height = bitmap.height;
      const context = canvas.getContext("2d");
      if (!context) return;
      const scaleX = (rect.width / 100) * bitmap.dpr;
      const scaleY = (rect.height / 100) * bitmap.dpr;
      context.setTransform(scaleX, 0, 0, scaleY, 0, 0);
      context.clearRect(0, 0, 100, 100);
      const guides = guideRef.current;
      const state = progressRef.current;
      guides.forEach((guide, index) => {
        const done = index < state.strokeIndex || (index === state.strokeIndex && state.snapping);
        const active = index === state.strokeIndex && !state.snapping;
        context.lineWidth = 13;
        context.lineCap = "round";
        context.lineJoin = "round";
        context.strokeStyle = done ? "#58cc02" : "#d5d5d5";
        strokePath(context, guide.points);
        if (active) {
          const fraction = guide.checkpoints.length === 0 ? 0 : state.covered / guide.checkpoints.length;
          context.strokeStyle = "#58cc02";
          strokePath(context, pointsUntil(guide.points, fraction));
        }
      });
      const dots = layoutStartDots(guides);
      guides.forEach((guide, index) => {
        const done = index < state.strokeIndex || (index === state.strokeIndex && state.snapping);
        if (done || guide.points.length === 0) return;
        const active = index === state.strokeIndex;
        const fraction = guide.checkpoints.length === 0 ? 0 : state.covered / guide.checkpoints.length;
        const arrowAt = active ? Math.min(0.84, Math.max(0.22, fraction + 0.16)) : 0.28;
        drawArrow(context, guide.points, arrowAt, active ? "#1cb0f6" : "#bdbdbd");
        const dot = dots[index];
        if (dot) drawStart(context, dot, index, active);
      });
      const contact = contactRef.current;
      if (contact && !state.snapping) {
        context.beginPath();
        context.fillStyle = "#58cc02";
        context.arc(contact.x, contact.y, 3.2, 0, Math.PI * 2);
        context.fill();
      }
    };
    drawRef.current = paint;
    paint();
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const frame = requestAnimationFrame(() => drawRef.current());
    const observer = new ResizeObserver(() => drawRef.current());
    observer.observe(canvas);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!progress.snapping) return;
    const timer = window.setTimeout(() => {
      const state = progressRef.current;
      const strokeCount = guideRef.current.length;
      const letterCount = lettersRef.current.length;
      if (state.strokeIndex < strokeCount - 1) {
        lastFinger.current = null;
        contactRef.current = null;
        commit({ ...state, strokeIndex: state.strokeIndex + 1, covered: 0, snapping: false });
        return;
      }
      if (state.letterIndex < letterCount - 1) {
        lastFinger.current = null;
        contactRef.current = null;
        commit({
          ...state,
          letterIndex: state.letterIndex + 1,
          strokeIndex: 0,
          covered: 0,
          snapping: false,
        });
        return;
      }
      if (!solved.current) {
        solved.current = true;
        onSolvedRef.current();
      }
    }, 560);
    return () => window.clearTimeout(timer);
  }, [commit, progress.letterIndex, progress.snapping, progress.strokeIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let activeId: number | null = null;

    const lockPage = (locked: boolean) => {
      document.body.style.overflow = locked ? "hidden" : "";
      document.documentElement.style.touchAction = locked ? "none" : "";
    };

    const pointFrom = (event: PointerEvent): Point => {
      const rect = canvas.getBoundingClientRect();
      return pointerToBox(event.clientX, event.clientY, rect);
    };

    const consider = (finger: Point) => {
      contactRef.current = finger;
      canvas.dataset.point = `${finger.x.toFixed(1)},${finger.y.toFixed(1)}`;
      const state = progressRef.current;
      if (state.snapping || disabledRef.current) {
        drawRef.current();
        return;
      }
      const guide = guideRef.current[state.strokeIndex];
      if (!guide) return;
      const next = coverAlongSegment(guide.checkpoints, state.covered, lastFinger.current, finger);
      lastFinger.current = finger;
      if (next !== state.covered) {
        const done = shouldCompleteStroke(next, guide.checkpoints.length);
        commit({
          ...state,
          covered: done ? guide.checkpoints.length : next,
          snapping: done,
        });
      }
      drawRef.current();
    };

    const down = (event: PointerEvent) => {
      if (disabledRef.current || progressRef.current.snapping || activeId !== null) return;
      if (event.cancelable) event.preventDefault();
      activeId = event.pointerId;
      lockPage(true);
      try {
        canvas.setPointerCapture(event.pointerId);
      } catch {
        // The pointer can end before capture.
      }
      lastFinger.current = null;
      consider(pointFrom(event));
    };

    const move = (event: PointerEvent) => {
      if (event.pointerId !== activeId) return;
      if (event.cancelable) event.preventDefault();
      const samples = event.getCoalescedEvents?.() ?? [event];
      for (const sample of samples) consider(pointFrom(sample));
    };

    const up = (event: PointerEvent) => {
      if (event.pointerId !== activeId) return;
      if (event.cancelable) event.preventDefault();
      activeId = null;
      lastFinger.current = null;
      lockPage(false);
    };

    const blockTouch = (event: Event) => {
      if (event.cancelable) event.preventDefault();
    };

    canvas.addEventListener("pointerdown", down, { passive: false });
    canvas.addEventListener("pointermove", move, { passive: false });
    canvas.addEventListener("pointerup", up, { passive: false });
    canvas.addEventListener("pointercancel", up, { passive: false });
    canvas.addEventListener("touchstart", blockTouch, { passive: false });
    canvas.addEventListener("touchmove", blockTouch, { passive: false });
    canvas.addEventListener("contextmenu", blockTouch);
    return () => {
      lockPage(false);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      canvas.removeEventListener("touchstart", blockTouch);
      canvas.removeEventListener("touchmove", blockTouch);
      canvas.removeEventListener("contextmenu", blockTouch);
    };
  }, [commit, exercise.id]);

  const guide = strokes[progress.strokeIndex];
  const checkpointCount = guide ? sampleCheckpoints(guide.points).length : 0;

  return (
    <div className="flex flex-col items-center gap-3" lang={exercise.lang === "es" ? "es-PE" : "en"}>
      <WritingBadge
        kind="trace"
        lang={exercise.lang}
        speech={speech}
        listenLabel={t.listen}
        helper={answerHelper(uiLang, exercise.lang, t)}
      />
      <h2 className="text-center text-2xl font-bold">{t.trace}</h2>
      <p className="text-5xl" aria-hidden="true">
        {exercise.emoji}
      </p>
      <p className="text-center text-3xl font-bold tracking-wide" aria-label={exercise.word}>
        {letters.map((glyph, glyphIndex) => (
          <span
            key={`${glyph}-${glyphIndex}`}
            className={
              glyphIndex < progress.letterIndex
                ? "text-leaf"
                : glyphIndex === progress.letterIndex
                  ? "text-leaf"
                  : "text-ink/35"
            }
          >
            {glyph}
          </span>
        ))}
      </p>
      <p className="text-center text-base font-semibold text-ink/70">{t.traceHint}</p>
      <div className="w-full max-w-[20rem] overscroll-none">
        <canvas
          ref={canvasRef}
          className="trace-pad aspect-square w-full rounded-[2rem] bg-white shadow-[0_4px_0_#e4e4e4]"
          style={{ touchAction: "none" }}
          aria-label={`${t.trace} ${letter}`}
          data-letter={letter}
          data-stroke={progress.strokeIndex}
          data-covered={progress.covered}
          data-total={checkpointCount}
          data-guide={JSON.stringify(strokes.map((stroke) => stroke.points))}
        />
      </div>
      <p className="text-lg font-bold text-sky">
        {t.traceStroke} {progress.strokeIndex + 1} / {Math.max(1, strokes.length)}
      </p>
      <p className="text-lg font-bold text-sky">
        {progress.letterIndex + 1} / {letters.length}
      </p>
    </div>
  );
}

function strokePath(context: CanvasRenderingContext2D, points: readonly Point[]) {
  const first = points[0];
  if (!first) return;
  context.beginPath();
  context.moveTo(first.x, first.y);
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    if (point) context.lineTo(point.x, point.y);
  }
  context.stroke();
}

function drawArrow(context: CanvasRenderingContext2D, points: readonly Point[], fraction: number, color: string) {
  const { point, angle } = pointOnStroke(points, fraction);
  const size = 6.5;
  context.beginPath();
  context.fillStyle = color;
  context.moveTo(point.x + Math.cos(angle) * size, point.y + Math.sin(angle) * size);
  context.lineTo(point.x + Math.cos(angle + 2.5) * size, point.y + Math.sin(angle + 2.5) * size);
  context.lineTo(point.x + Math.cos(angle - 2.5) * size, point.y + Math.sin(angle - 2.5) * size);
  context.closePath();
  context.fill();
}

function drawStart(context: CanvasRenderingContext2D, dot: Point, ordinal: number, active: boolean) {
  context.beginPath();
  context.fillStyle = active ? "#1cb0f6" : "#ffffff";
  context.arc(dot.x, dot.y, active ? 6.6 : 5.6, 0, Math.PI * 2);
  context.fill();
  context.lineWidth = 1.3;
  context.strokeStyle = active ? "#1899d6" : "#b5b5b5";
  context.stroke();
  context.fillStyle = active ? "#ffffff" : "#8a8a8a";
  context.font = "700 7px Fredoka, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(ordinal + 1), dot.x, dot.y + 0.4);
}
