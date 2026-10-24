import type { ProgressRepository } from "@/application/ports";
import { rollHearts, type LessonProgress, type Profile } from "@/domain/progress";

export async function loadLearnerState(
  repo: ProgressRepository,
  today: string,
): Promise<{ profile: Profile; progress: LessonProgress[] }> {
  const stored = await repo.getProfile();
  const profile = rollHearts(stored, today);
  if (profile !== stored) await repo.saveProfile(profile);
  const progress = await repo.getLessonProgress();
  return { profile, progress };
}
