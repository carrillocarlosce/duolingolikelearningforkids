import type { LearnerProfile, ProgressRepository } from "@/application/ports";

export class MemoryProgressRepository implements ProgressRepository {
  constructor(
    private readonly completedIds: readonly string[] = [],
    private readonly profile: LearnerProfile = { uiLang: "es" },
  ) {}

  async getCompletedLessonIds(): Promise<string[]> {
    return [...this.completedIds];
  }

  async getProfile(): Promise<LearnerProfile> {
    return { ...this.profile };
  }
}
