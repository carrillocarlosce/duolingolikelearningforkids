import type { ProgressRepository } from "@/application/ports";
import { freshProfile, normalizeProfile, type LessonProgress, type Profile } from "@/domain/progress";

export class MemoryProgressRepository implements ProgressRepository {
  private profile: Profile;
  private readonly lessons = new Map<string, LessonProgress>();

  constructor(profile?: Profile) {
    this.profile = normalizeProfile(profile ?? freshProfile("1970-01-01"), profile?.heartsDate ?? "1970-01-01");
  }

  async getProfile(): Promise<Profile> {
    return { ...this.profile };
  }

  async saveProfile(profile: Profile): Promise<void> {
    this.profile = normalizeProfile(profile, profile.heartsDate ?? "1970-01-01");
  }

  async getLessonProgress(): Promise<LessonProgress[]> {
    return [...this.lessons.values()].map((item) => ({ ...item }));
  }

  async saveLessonProgress(progress: LessonProgress): Promise<void> {
    this.lessons.set(progress.lessonId, { ...progress });
  }

  async reset(): Promise<void> {
    this.profile = freshProfile("1970-01-01");
    this.lessons.clear();
  }
}
