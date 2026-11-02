import { MAP_UNIT_ID, requireUnit } from "@/domain/content/registry";
import type { LessonKind, LessonSummary } from "@/domain/content/unit";

export type { LessonKind, LessonSummary };

/**
 * Unit 7 path from the school bulletin "Let's go to the market!"
 * The first lesson is open. Each later lesson opens when the one before it is finished.
 * The first exam lesson is also open, so the menu lines can be practiced before the path is done.
 * Later exam lessons open when the exam lesson before them is finished.
 * Ids that already shipped are unchanged, so IndexedDB progress still matches.
 * Listen, spell, write, a sentence pattern, and a checkpoint sit between those ids.
 */
export const lessonCatalog: readonly LessonSummary[] = requireUnit(MAP_UNIT_ID).lessons;

function isExamSkill(skill: LessonSummary["skill"]): boolean {
  return skill === "exam" || skill === "exam-menu";
}

export function isLessonUnlocked(lessonIndex: number, completedIds: ReadonlySet<string>): boolean {
  if (lessonIndex <= 0) return true;
  const lesson = lessonCatalog[lessonIndex];
  const previous = lessonCatalog[lessonIndex - 1];
  if (!lesson || !previous) return false;
  if (isExamSkill(lesson.skill) && !isExamSkill(previous.skill)) return true;
  return completedIds.has(previous.id);
}

export function getLesson(id: string): LessonSummary | undefined {
  return lessonCatalog.find((lesson) => lesson.id === id);
}
