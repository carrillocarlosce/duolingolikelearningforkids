import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { freshProfile } from "@/domain/progress";
import { IndexedDbProgressRepository } from "@/infrastructure/storage/indexed-db-progress-repository";

const names: string[] = [];

describe("IndexedDbProgressRepository", () => {
  afterEach(async () => {
    await Promise.all(names.splice(0).map((name) => indexedDB.deleteDatabase(name)));
  });

  it("remembers profile and lesson progress after the connection closes", async () => {
    const name = `pipos-test-${crypto.randomUUID()}`;
    names.push(name);
    const today = "2026-10-24";
    const repo = new IndexedDbProgressRepository(name, () => today);

    const created = await repo.getProfile();
    expect(created).toEqual(freshProfile(today));

    await repo.saveProfile({ ...created, xp: 25, hearts: 3, streak: 2 });
    await repo.saveLessonProgress({
      lessonId: "fruits",
      completed: true,
      bestStars: 2,
      bestXp: 30,
      timesCompleted: 1,
    });
    await repo.close();

    const reopened = new IndexedDbProgressRepository(name, () => today);
    expect(await reopened.getProfile()).toMatchObject({ xp: 25, hearts: 3, streak: 2 });
    expect(await reopened.getLessonProgress()).toEqual([
      { lessonId: "fruits", completed: true, bestStars: 2, bestXp: 30, timesCompleted: 1 },
    ]);

    await reopened.reset();
    expect(await reopened.getLessonProgress()).toEqual([]);
    expect(await reopened.getProfile()).toEqual(freshProfile(today));
    await reopened.close();
  });
});
