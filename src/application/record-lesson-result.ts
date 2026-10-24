import type { ProgressRepository } from "@/application/ports";
import { applyStreak, rollHearts, type LessonProgress, type Profile } from "@/domain/progress";
import { MAX_HEARTS } from "@/domain/scoring";

export interface LessonResult {
  lessonId: string;
  /** Added to the saved XP total. */
  xpAwarded: number;
  /** Score of this attempt, kept if it beats the previous best. */
  attemptXp: number;
  stars: 1 | 2 | 3;
  today: string;
}

export async function recordLessonResult(
  repo: ProgressRepository,
  result: LessonResult,
): Promise<{ profile: Profile; progress: LessonProgress }> {
  const rolled = rollHearts(await repo.getProfile(), result.today);
  const profile: Profile = {
    ...applyStreak(rolled, result.today),
    xp: rolled.xp + result.xpAwarded,
    hearts: MAX_HEARTS,
    heartsDate: result.today,
  };
  await repo.saveProfile(profile);

  const previous = (await repo.getLessonProgress()).find((item) => item.lessonId === result.lessonId);
  const progress: LessonProgress = {
    lessonId: result.lessonId,
    completed: true,
    bestStars: Math.max(previous?.bestStars ?? 0, result.stars),
    bestXp: Math.max(previous?.bestXp ?? 0, result.attemptXp),
    timesCompleted: (previous?.timesCompleted ?? 0) + 1,
  };
  await repo.saveLessonProgress(progress);
  return { profile, progress };
}
