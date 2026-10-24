import { MAP_UNIT_ID, requireUnit } from "@/domain/content/registry";
import type { LessonKind, LessonSummary } from "@/domain/content/unit";

export type { LessonKind, LessonSummary };

/**
 * Unit 7 path from the school bulletin "Let's go to the market!"
 * The first lesson is open. Each later lesson opens when the one before it is finished.
 * Lesson ids are unchanged so progress already stored on a tablet still matches.
 */
export const lessonCatalog: readonly LessonSummary[] = requireUnit(MAP_UNIT_ID).lessons;

export function isLessonUnlocked(lessonIndex: number, completedIds: ReadonlySet<string>): boolean {
  if (lessonIndex <= 0) return true;
  const previous = lessonCatalog[lessonIndex - 1];
  if (!previous) return false;
  return completedIds.has(previous.id);
}

export function getLesson(id: string): LessonSummary | undefined {
  return lessonCatalog.find((lesson) => lesson.id === id);
}
