import {
  isLessonUnlocked,
  lessonCatalog,
  type LessonSummary,
} from "@/domain/lesson-path";

export interface LessonPathItem extends LessonSummary {
  unlocked: boolean;
  completed: boolean;
  current: boolean;
}

export function getLessonPath(completedIds: readonly string[]): LessonPathItem[] {
  const done = new Set(completedIds);
  const items = lessonCatalog.map((lesson, index) => ({
    ...lesson,
    unlocked: isLessonUnlocked(index, done),
    completed: done.has(lesson.id),
    current: false,
  }));
  const current = items.find((item) => item.unlocked && !item.completed);
  if (current) current.current = true;
  return items;
}
