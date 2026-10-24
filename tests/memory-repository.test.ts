import { describe, expect, it } from "vitest";
import { freshProfile } from "@/domain/progress";
import { MemoryProgressRepository } from "@/infrastructure/storage/memory-progress-repository";

describe("MemoryProgressRepository", () => {
  it("keeps an independent copy of the profile and lessons", async () => {
    const repo = new MemoryProgressRepository(freshProfile("2026-10-24"));
    await repo.saveProfile({ ...freshProfile("2026-10-24"), uiLang: "en", xp: 5 });
    await repo.saveLessonProgress({
      lessonId: "fruits",
      completed: true,
      bestStars: 3,
      bestXp: 20,
      timesCompleted: 1,
    });

    const profile = await repo.getProfile();
    profile.xp = 999;
    expect((await repo.getProfile()).xp).toBe(5);
    expect((await repo.getProfile()).uiLang).toBe("en");
    expect(await repo.getLessonProgress()).toHaveLength(1);

    await repo.reset();
    expect(await repo.getLessonProgress()).toEqual([]);
    expect((await repo.getProfile()).xp).toBe(0);
  });
});