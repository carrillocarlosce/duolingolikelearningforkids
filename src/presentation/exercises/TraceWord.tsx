"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Exercise } from "@/domain/exercises";
import { TRACE_COVERAGE } from "@/domain/session";
import type { Copy } from "@/presentation/i18n";

const SIZE = 320;
const SAMPLE = 7;
const HIT = 30;

type Point = { x: number; y: number };

function lettersOf(word: string): string[] {
  return [...word].filter((letter) => letter.trim().length > 0);
}

function sampleLetter(letter: string): Point[] {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return [];
  const draw = (font: string, stroke: boolean) => {
    context.clearRect(0, 0, SIZE, SIZE);
    context.font = font;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#000";
    context.strokeStyle = "#000";
    context.lineWidth = 22;
    const x = SIZE / 2;
    const y = SIZE / 2 + 6;
    if (stroke) context.strokeText(letter, x, y);
    context.fillText(letter, x, y);
    const pixels = context.getImageData(0, 0, SIZE, SIZE).data;
    const points: Point[] = [];
    for (let py = 0; py < SIZE; py += SAMPLE) {
      for (let px = 0; px < SIZE; px += SAMPLE) {
        if ((pixels[(py * SIZE + px) * 4 + 3] ?? 0) > 120) points.push({ x: px, y: py });
      }
    }
    return points;
  };
  const font = `700 ${Math.floor(SIZE * 0.62)}px Fredoka, sans-serif`;
  const filled = draw(font, false);
  if (filled.length >= 12) return filled;
  return draw(font, true);
}

export function TraceWord({
  exercise,
  t,
  disabled,
  onSolved,
}: {
  exercise: Extract<Exercise, { type: "trace" }>;
  t: Copy;
  disabled: boolean;
  onSolved: () => void;
}) {
  const letters = lettersOf(exercise.word);
  const [index, setIndex] = useState(0);
  const letter = letters[index] ?? "";
  const [points, setPoints] = useState<Point[]>([]);
  const [hits, setHits] = useState<boolean[]>([]);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const solved = useRef(false);
  const advancing = useRef(false);
  const onSolvedRef = useRef(onSolved);
  useEffect(() => {
    onSolvedRef.current = onSolved;
  }, [onSolved]);
  const covered =
    points.length > 0 && hits.length === points.length && hits.filter(Boolean).length / hits.length >= TRACE_COVERAGE;

  useEffect(() => {
    const glyphs = lettersOf(exercise.word);
    const nextLetter = glyphs[index] ?? "";
    let cancelled = false;
    advancing.current = false;
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    void fontsReady.then(() => {
      window.setTimeout(() => {
        if (cancelled) return;
        const sampled = sampleLetter(nextLetter);
        setPoints(sampled);
        setHits(sampled.map(() => false));
        setStrokes([]);
      }, 0);
    });
    return () => {
      cancelled = true;
    };
  }, [exercise.id, exercise.word, index]);

  useEffect(() => {
    if (!covered || advancing.current) return;
    advancing.current = true;
    const timer = window.setTimeout(() => {
      if (index >= letters.length - 1) {
        if (!solved.current) {
          solved.current = true;
          onSolvedRef.current();
        }
        return;
      }
      setPoints([]);
      setHits([]);
      setStrokes([]);
      setIndex((current) => current + 1);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [covered, index, letters.length]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.clearRect(0, 0, SIZE, SIZE);
    context.font = `700 ${Math.floor(SIZE * 0.62)}px Fredoka, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#e6e6e6";
    context.fillText(letter, SIZE / 2, SIZE / 2 + 6);
    context.strokeStyle = "#58cc02";
    context.fillStyle = "#58cc02";
    context.lineWidth = 28;
    context.lineCap = "round";
    context.lineJoin = "round";
    for (const line of strokes) {
      if (line.length === 0) continue;
      context.beginPath();
      line.forEach((point, pointIndex) => {
        if (pointIndex === 0) context.moveTo(point.x, point.y);
        else context.lineTo(point.x, point.y);
      });
      context.stroke();
      for (const point of line) {
        context.beginPath();
        context.arc(point.x, point.y, 14, 0, Math.PI * 2);
        context.fill();
      }
    }
  }, [letter, strokes]);

  function canvasPoint(clientX: number, clientY: number): Point | null {
    const canvas = canvasRef.current;
    if (!canvas || disabled || advancing.current) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * SIZE,
      y: ((clientY - rect.top) / rect.height) * SIZE,
    };
  }

  function paint(point: Point, start: boolean) {
    setStrokes((current) => {
      if (start || current.length === 0) return [...current, [point]];
      const next = current.map((line) => [...line]);
      next[next.length - 1]?.push(point);
      return next;
    });
    if (points.length === 0) return;
    const radius = HIT * HIT;
    setHits((current) => {
      let changed = false;
      const next = current.map((hit, pointIndex) => {
        if (hit) return true;
        const target = points[pointIndex];
        if (!target) return false;
        const near = (target.x - point.x) ** 2 + (target.y - point.y) ** 2 <= radius;
        if (!near) return false;
        changed = true;
        return true;
      });
      return changed ? next : current;
    });
  }

  function pointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = canvasPoint(event.clientX, event.clientY);
    if (point) paint(point, true);
  }

  function pointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const point = canvasPoint(event.clientX, event.clientY);
    if (point) paint(point, false);
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <h2 className="text-center text-2xl font-bold">{t.trace}</h2>
      <p className="text-6xl" aria-hidden="true">
        {exercise.emoji}
      </p>
      <p
        lang={exercise.answerLang}
        className="text-center text-4xl font-bold tracking-wide"
        aria-label={exercise.word}
      >
        {letters.map((glyph, glyphIndex) => (
          <span key={`${glyph}-${glyphIndex}`} className={glyphIndex === index ? "text-leaf" : "text-ink/35"}>
            {glyph}
          </span>
        ))}
      </p>
      <p className="text-lg font-semibold text-ink/70">{t.traceHint}</p>
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        lang={exercise.answerLang}
        className="trace-pad w-full max-w-[20rem] rounded-[2rem] bg-white shadow-[0_4px_0_#e4e4e4]"
        aria-label={`${t.trace} ${letter}`}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={() => {
          drawing.current = false;
        }}
        onPointerCancel={() => {
          drawing.current = false;
        }}
      />
      <p className="text-lg font-bold text-sky">
        {index + 1} / {letters.length}
      </p>
    </div>
  );
}
