import "fake-indexeddb/auto";
import { openDB } from "idb";
import { afterEach, describe, expect, it } from "vitest";
import { saveReviewAnswer } from "@/application/save-review";
import { getLessonPath } from "@/application/get-lesson-path";
import { buildLessonExercises, buildReviewExercises, mulberry32 } from "@/domain/build-lesson";
import { answerLanguage } from "@/domain/exercises";
import { sentences } from "@/domain/content/sentences";
import { vocabulary } from "@/domain/content/vocabulary";
import { freshProfile, normalizeProfile } from "@/domain/progress";
import {
  applyReviewResult,
  dueReviewItems,
  REVIEW_LIMIT,
  reviewTarget,
  scheduleFromGrade,
} from "@/domain/review";
import { IndexedDbProgressRepository } from "@/infrastructure/storage/indexed-db-progress-repository";
import { MemoryProgressRepository } from "@/infrastructure/storage/memory-progress-repository";

const names: string[] = [];

describe("Practice with Pipo", () => {
  afterEach(async () => {
    await Promise.all(names.splice(0).map((name) => indexedDB.deleteDatabase(name)));
  });

  it("starts with unseen words and keeps misses ahead of them", () => {
    const today = "2026-10-24";
    expect(dueReviewItems([], today).map((item) => item.id)).toEqual(["cake", "apple", "ice-cream", "juice", "milk"]);
    expect(dueReviewItems([], today)).toHaveLength(REVIEW_LIMIT);

    const missed = applyReviewResult([], { kind: "word", id: "salad" }, "incorrect", today);
    expect(dueReviewItems(missed, today)[0]).toEqual({ kind: "word", id: "salad" });

    const learned = applyReviewResult(missed, { kind: "word", id: "cake" }, "correct", today);
    const cake = learned.find((item) => item.id === "cake");
    expect(cake?.due).toBe("2026-10-25");
    expect(cake?.correctStreak).toBe(1);
    expect(dueReviewItems(learned, today).some((item) => item.id === "cake")).toBe(false);
    if (!cake) throw new Error("missing cake schedule");
    const later = {
      wrongs: 0,
      correctStreak: 1,
      lastSeen: today,
      due: "2026-12-01",
    };
    const parked = [
      cake,
      ...vocabulary.filter((item) => item.id !== "cake").map((item) => ({ id: item.id, kind: "word" as const, ...later })),
      ...sentences.map((item) => ({ id: item.id, kind: "sentence" as const, ...later })),
    ];
    expect(dueReviewItems(parked, "2026-10-24").some((item) => item.id === "cake")).toBe(false);
    expect(dueReviewItems(parked, "2026-10-25")).toEqual([{ kind: "word", id: "cake" }]);

    const again = applyReviewResult(learned, { kind: "word", id: "cake" }, "correct", "2026-10-25");
    expect(again.find((item) => item.id === "cake")?.due).toBe("2026-10-28");
    const week = applyReviewResult(again, { kind: "word", id: "cake" }, "correct", "2026-10-28");
    expect(week.find((item) => item.id === "cake")?.due).toBe("2026-11-04");
    expect(week.find((item) => item.id === "cake")?.correctStreak).toBe(3);
  });

  it("does not move the schedule for a skip or a match", () => {
    const records = applyReviewResult([], { kind: "word", id: "milk" }, "incorrect", "2026-10-24");
    const picture = buildReviewExercises([{ kind: "word", id: "milk" }], "en", mulberry32(1)).find(
      (exercise) => exercise.type === "picture-word",
    );
    if (picture?.type !== "picture-word") throw new Error("missing picture");
    expect(scheduleFromGrade(records, picture, "skipped", "2026-10-24")).toBe(records);
    expect(reviewTarget(picture)).toEqual({ kind: "word", id: "milk" });

    const fromLesson = buildLessonExercises("sweet-treats", "en", mulberry32(1)).find(
      (exercise) => exercise.type === "match",
    );
    if (fromLesson?.type !== "match") throw new Error("missing match");
    expect(reviewTarget(fromLesson)).toBeNull();
    expect(scheduleFromGrade(records, fromLesson, "incorrect", "2026-10-24")).toBe(records);
  });

  it("builds a short round in the answer language and leaves the path alone", () => {
    const picks = [
      { kind: "word" as const, id: "cake" },
      { kind: "sentence" as const, id: "like-apples" },
      { kind: "word" as const, id: "milk" },
    ];
    const round = buildReviewExercises(picks, "en-es", mulberry32(4));
    expect(round[0]?.type).toBe("say");
    expect(round.map((exercise) => exercise.type)).toEqual(["say", "picture-word", "build", "listen"]);
    const built = round.find((exercise) => exercise.type === "build");
    if (built?.type !== "build") throw new Error("missing sentence");
    expect(built.answerLang).toBe("es");
    expect(built.answerTokens).toEqual(["Me", "gustan", "las", "manzanas"]);
    expect(answerLanguage(built)).toBe("es");
    expect(reviewTarget(built)).toEqual({ kind: "sentence", id: "like-apples" });
    for (const exercise of round) {
      if (exercise.type === "picture-word" || exercise.type === "listen") {
        expect(exercise.choiceIds).toContain(exercise.itemId);
      }
    }
    expect(getLessonPath([]).map((lesson) => lesson.id)).not.toContain("practice-with-pipo");
  });

  it("drops junk and keeps a real miss when an older profile is opened", () => {
    const today = "2026-10-24";
    const normalized = normalizeProfile(
      {
        reviews: [
          { id: "gone", kind: "word", wrongs: 1, correctStreak: 0, lastSeen: today, due: today },
          { id: "juice", kind: "word", wrongs: 2, correctStreak: 0, lastSeen: today, due: today },
          { id: "juice", kind: "nope" },
        ],
      },
      today,
    );
    expect(normalized.reviews).toEqual([
      { id: "juice", kind: "word", wrongs: 2, correctStreak: 0, lastSeen: today, due: today },
    ]);
    expect(freshProfile(today).reviews).toEqual([]);
  });

  it("saves the schedule in IndexedDB without a new database version", async () => {
    const name = `pipos-review-${crypto.randomUUID()}`;
    names.push(name);
    const today = "2026-10-24";
    const repo = new IndexedDbProgressRepository(name, () => today);
    await repo.getProfile();
    await repo.close();

    const database = await openDB(name, 1);
    await database.put(
      "profile",
      {
        xp: 4,
        hearts: 5,
        streak: 1,
        lastActiveDate: today,
        heartsDate: today,
        uiLang: "es",
        sound: true,
        direction: "en",
        letterTracing: "auto",
        restaurant: null,
      },
      "main",
    );
    database.close();

    const reopened = new IndexedDbProgressRepository(name, () => today);
    const older = await reopened.getProfile();
    expect(older.reviews).toEqual([]);
    expect(older.xp).toBe(4);

    const picture = buildReviewExercises([{ kind: "word", id: "apple" }], "en", mulberry32(2)).find(
      (exercise) => exercise.type === "picture-word",
    );
    if (picture?.type !== "picture-word") throw new Error("missing picture");
    const saved = await saveReviewAnswer(reopened, older, picture, "incorrect", today);
    expect(saved.reviews[0]).toMatchObject({ id: "apple", kind: "word", wrongs: 1, due: today });
    await reopened.close();

    const again = new IndexedDbProgressRepository(name, () => today);
    expect((await again.getProfile()).reviews).toEqual(saved.reviews);
    await again.close();

    const memory = new MemoryProgressRepository(freshProfile(today));
    const remembered = await saveReviewAnswer(memory, await memory.getProfile(), picture, "correct", today);
    expect(remembered.reviews[0]?.correctStreak).toBe(1);
    expect((await memory.getProfile()).reviews).toEqual(remembered.reviews);
  });
});
