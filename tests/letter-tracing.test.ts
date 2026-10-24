import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { recordLessonResult } from "@/application/record-lesson-result";
import {
  CHECKPOINT_RADIUS,
  advanceCheckpoints,
  canvasBitmapSize,
  coverAlongSegment,
  coverCheckpoints,
  lettersOf,
  pointerToBox,
  layoutStartDots,
  sampleCheckpoints,
  shouldCompleteStroke,
  strokesForLetter,
  TRACE_CHECKPOINT_RATIO,
} from "@/domain/letter-strokes";
import { letterTracingEnabled } from "@/domain/letter-tracing";
import { freshProfile, normalizeProfile } from "@/domain/progress";
import { IndexedDbProgressRepository } from "@/infrastructure/storage/indexed-db-progress-repository";

const names: string[] = [];
const line = Array.from({ length: 10 }, (_, index) => ({ x: index * 10, y: 0 }));

describe("checkpoint scoring", () => {
  it("samples the stroke from the start through the end", () => {
    const points = sampleCheckpoints(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      25,
    );
    expect(points).toEqual([
      { x: 0, y: 0 },
      { x: 25, y: 0 },
      { x: 50, y: 0 },
      { x: 75, y: 0 },
      { x: 100, y: 0 },
    ]);
  });

  it("completes at about 70 percent of the checkpoints when they are hit in order", () => {
    const covered = coverCheckpoints(line, line.slice(0, 7), 0.5);
    expect(covered).toBe(7);
    expect(covered / line.length).toBeGreaterThanOrEqual(TRACE_CHECKPOINT_RATIO);
    expect(shouldCompleteStroke(covered, line.length)).toBe(true);
    expect(shouldCompleteStroke(6, line.length)).toBe(false);
  });

  it("does not count a checkpoint reached before the ones in front of it", () => {
    expect(advanceCheckpoints(line, 0, { x: 90, y: 0 }, 4)).toBe(0);
    expect(coverCheckpoints(line, [{ x: 90, y: 0 }, { x: 0, y: 0 }], 4)).toBe(1);
    expect(coverAlongSegment(line, 0, { x: 90, y: 0 }, { x: 0, y: 0 }, 4)).toBe(1);
  });

  it("counts checkpoints a fast finger jumps across when the path follows the stroke", () => {
    const covered = coverAlongSegment(line, 0, { x: 0, y: 0 }, { x: 60, y: 0 }, 4);
    expect(covered).toBeGreaterThanOrEqual(7);
    expect(shouldCompleteStroke(covered, line.length)).toBe(true);
    const offTheStroke = coverAlongSegment(line, 0, { x: 0, y: 0 }, { x: 0, y: 80 }, 4);
    expect(shouldCompleteStroke(offTheStroke, line.length)).toBe(false);
  });

  it("keeps the finger on the guide when the canvas bitmap is scaled", () => {
    const rect = { left: 10, top: 20, width: 300, height: 300 };
    expect(pointerToBox(160, 170, rect)).toEqual({ x: 50, y: 50 });
    expect(pointerToBox(10, 20, rect)).toEqual({ x: 0, y: 0 });
    expect(canvasBitmapSize(300, 300, 2.5)).toEqual({ width: 750, height: 750, dpr: 2.5 });
    expect(canvasBitmapSize(300, 300, Number.NaN).dpr).toBe(1);
  });
});

describe("letter guides", () => {
  it("gives every writing-lesson letter a stroke, including á", () => {
    for (const word of ["milk", "sandwich", "salad", "leche", "sándwich", "ensalada"]) {
      expect(lettersOf(word).join("")).toBe(word);
      for (const letter of lettersOf(word)) {
        const strokes = strokesForLetter(letter);
        expect(strokes.length).toBeGreaterThan(0);
        for (const stroke of strokes) expect(sampleCheckpoints(stroke.points).length).toBeGreaterThan(1);
      }
    }
    expect(strokesForLetter("á").length).toBe(strokesForLetter("a").length + 1);
    expect(strokesForLetter("ñ").length).toBe(strokesForLetter("n").length + 1);
    expect(strokesForLetter("N").length).toBe(strokesForLetter("n").length);
  });

  it("asks for the n stem before the arch, and a scribble on the arch does not finish the stem", () => {
    const [stem, arch] = strokesForLetter("n");
    if (!stem || !arch) throw new Error("missing n strokes");
    const stemDrop = stem.points[stem.points.length - 1]!.y - stem.points[0]!.y;
    const stemDrift = Math.abs(stem.points[stem.points.length - 1]!.x - stem.points[0]!.x);
    expect(stemDrop).toBeGreaterThan(stemDrift);
    const checkpoints = sampleCheckpoints(stem.points);
    expect(shouldCompleteStroke(coverCheckpoints(checkpoints, checkpoints), checkpoints.length)).toBe(true);
    const archEnd = arch.points[arch.points.length - 1]!;
    expect(advanceCheckpoints(checkpoints, 0, archEnd, CHECKPOINT_RADIUS)).toBe(0);
    const dots = layoutStartDots(strokesForLetter("m"));
    for (let index = 0; index < dots.length; index += 1) {
      for (let other = index + 1; other < dots.length; other += 1) {
        const gap = Math.hypot(dots[index]!.x - dots[other]!.x, dots[index]!.y - dots[other]!.y);
        expect(gap).toBeGreaterThan(14);
      }
    }
  });
});

describe("letter tracing setting", () => {
  it("stays off for a phone until a parent chooses otherwise", () => {
    expect(letterTracingEnabled("auto", true)).toBe(false);
    expect(letterTracingEnabled("auto", false)).toBe(true);
    expect(letterTracingEnabled("on", true)).toBe(true);
    expect(letterTracingEnabled("off", false)).toBe(false);
    expect(normalizeProfile({ xp: 3 }, "2026-10-24").letterTracing).toBe("auto");
    expect(normalizeProfile({ letterTracing: "off" }, "2026-10-24").letterTracing).toBe("off");
    expect(normalizeProfile({ letterTracing: "sometimes" }, "2026-10-24").letterTracing).toBe("auto");
  });

  afterEach(async () => {
    await Promise.all(names.splice(0).map((name) => indexedDB.deleteDatabase(name)));
  });

  it("remembers an explicit off choice in IndexedDB", async () => {
    const name = `pipos-trace-${crypto.randomUUID()}`;
    names.push(name);
    const today = "2026-10-24";
    const repo = new IndexedDbProgressRepository(name, () => today);
    const created = await repo.getProfile();
    expect(created.letterTracing).toBe("auto");
    await repo.saveProfile({ ...created, letterTracing: "off" });
    await repo.close();

    const reopened = new IndexedDbProgressRepository(name, () => today);
    const saved = await reopened.getProfile();
    expect(saved.letterTracing).toBe("off");
    const finished = await recordLessonResult(reopened, {
      lessonId: "sweet-treats",
      xpAwarded: 10,
      attemptXp: 10,
      stars: 3,
      today,
    });
    expect(finished.profile.letterTracing).toBe("off");
    expect(finished.profile.xp).toBe(freshProfile(today).xp + 10);
    await reopened.close();
  });
});
