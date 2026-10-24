import { describe, expect, it } from "vitest";
import { loadLearnerState } from "@/application/load-learner-state";
import { recordLessonResult } from "@/application/record-lesson-result";
import { MemoryProgressRepository } from "@/infrastructure/storage/memory-progress-repository";
import { addDays, applyStreak, freshProfile, rollHearts, withHeartCount } from "@/domain/progress";
import { MAX_HEARTS, canStartLesson, starsForMistakes, xpForStatus } from "@/domain/scoring";

describe("scoring", () => {
  it("awards more XP for a clean answer than a near miss", () => {
    expect(xpForStatus("correct")).toBeGreaterThan(xpForStatus("almost"));
    expect(xpForStatus("incorrect")).toBe(0);
    expect(xpForStatus("skipped")).toBe(0);
    expect(starsForMistakes(0)).toBe(3);
    expect(starsForMistakes(1)).toBe(2);
    expect(starsForMistakes(4)).toBe(1);
    expect(canStartLesson(0)).toBe(false);
    expect(canStartLesson(MAX_HEARTS)).toBe(true);
  });
});

describe("hearts and streak", () => {
  it("stores a heart loss inside the five-heart meter", () => {
    const profile = freshProfile("2026-10-24");
    expect(withHeartCount(profile, 4).hearts).toBe(4);
    expect(withHeartCount(profile, 0).hearts).toBe(0);
    expect(withHeartCount(profile, -3).hearts).toBe(0);
    expect(withHeartCount(profile, 9).hearts).toBe(MAX_HEARTS);
  });

  it("refills hearts on a new day and keeps them on the same day", () => {
    const monday = freshProfile("2026-10-19");
    const tired = { ...monday, hearts: 2, heartsDate: "2026-10-19" };
    expect(rollHearts(tired, "2026-10-19").hearts).toBe(2);
    expect(rollHearts(tired, "2026-10-20")).toMatchObject({ hearts: MAX_HEARTS, heartsDate: "2026-10-20" });
  });

  it("counts a streak only across touching days", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");

    const first = applyStreak(freshProfile("2026-10-22"), "2026-10-22");
    expect(first.streak).toBe(1);
    expect(applyStreak(first, "2026-10-22").streak).toBe(1);
    const next = applyStreak(first, "2026-10-23");
    expect(next.streak).toBe(2);
    expect(applyStreak(next, "2026-10-25").streak).toBe(1);
  });
});

describe("saved progress", () => {
  it("stores XP, a full heart meter, the streak, and the best stars", async () => {
    const repo = new MemoryProgressRepository(freshProfile("2026-10-24"));
    const first = await recordLessonResult(repo, {
      lessonId: "sweet-treats",
      xpAwarded: 10,
      attemptXp: 10,
      stars: 1,
      today: "2026-10-24",
    });
    expect(first.profile.xp).toBe(10);
    expect(first.profile.hearts).toBe(MAX_HEARTS);
    expect(first.profile.streak).toBe(1);
    expect(first.progress).toMatchObject({ completed: true, bestStars: 1, timesCompleted: 1 });

    const again = await recordLessonResult(repo, {
      lessonId: "sweet-treats",
      xpAwarded: 40,
      attemptXp: 40,
      stars: 3,
      today: "2026-10-24",
    });
    expect(again.profile.xp).toBe(50);
    expect(again.profile.streak).toBe(1);
    expect(again.progress.bestStars).toBe(3);
    expect(again.progress.bestXp).toBe(40);
    expect(again.progress.timesCompleted).toBe(2);

    const kept = await recordLessonResult(repo, {
      lessonId: "sweet-treats",
      xpAwarded: 5,
      attemptXp: 5,
      stars: 1,
      today: "2026-10-25",
    });
    expect(kept.progress.bestStars).toBe(3);
    expect(kept.profile.streak).toBe(2);
  });

  it("refills hearts when the saved day is not today", async () => {
    const repo = new MemoryProgressRepository({
      ...freshProfile("2026-10-23"),
      hearts: 1,
      heartsDate: "2026-10-23",
    });
    const loaded = await loadLearnerState(repo, "2026-10-24");
    expect(loaded.profile.hearts).toBe(MAX_HEARTS);
    expect((await repo.getProfile()).heartsDate).toBe("2026-10-24");
  });
});
