import type { ProgressRepository } from "@/application/ports";
import type { Exercise, GradeStatus } from "@/domain/exercises";
import type { Profile } from "@/domain/progress";
import { scheduleFromGrade } from "@/domain/review";

/** Remember a right or wrong answer for the daily review. A skip does not move the schedule. */
export async function saveReviewAnswer(
  repo: ProgressRepository,
  profile: Profile,
  exercise: Exercise,
  status: GradeStatus,
  today: string,
): Promise<Profile> {
  const reviews = scheduleFromGrade(profile.reviews, exercise, status, today);
  if (reviews === profile.reviews) return profile;
  const next = { ...profile, reviews };
  await repo.saveProfile(next);
  return next;
}
