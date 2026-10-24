import { describe, expect, it } from "vitest";
import { MemoryProgressRepository } from "@/infrastructure/storage/memory-progress-repository";

describe("MemoryProgressRepository", () => {
  it("returns a copy of the stored progress and profile", async () => {
    const repo = new MemoryProgressRepository(["fruits"], { uiLang: "en" });
    await expect(repo.getCompletedLessonIds()).resolves.toEqual(["fruits"]);
    await expect(repo.getProfile()).resolves.toEqual({ uiLang: "en" });
  });
});
