import type { GradeStatus } from "@/domain/exercises";

export const MAX_HEARTS = 5;
export const XP_CORRECT = 10;
export const XP_ALMOST = 8;
export const XP_LESSON_BONUS = 20;
export const XP_PERFECT_BONUS = 10;
/** Reading the lesson cards, before the exercise rounds exist. */
export const XP_READ = 10;

export function xpForStatus(status: GradeStatus): number {
  if (status === "correct") return XP_CORRECT;
  if (status === "almost") return XP_ALMOST;
  return 0;
}

export function starsForMistakes(mistakes: number): 1 | 2 | 3 {
  if (mistakes <= 0) return 3;
  if (mistakes === 1) return 2;
  return 1;
}

export function canStartLesson(hearts: number): boolean {
  return hearts > 0;
}
