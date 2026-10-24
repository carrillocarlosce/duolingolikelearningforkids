import { describe, expect, it } from "vitest";
import { getLessonPath } from "@/application/get-lesson-path";
import { isLessonUnlocked, lessonCatalog } from "@/domain/lesson-path";

describe("lesson path", () => {
  it("lists the Unit 7 lessons in order", () => {
    expect(lessonCatalog.map((lesson) => lesson.id)).toEqual([
      "sweet-treats",
      "fruits",
      "drinks",
      "market-meals",
      "on-the-plate",
      "word-review",
      "menu-sentences",
      "i-like",
      "write-it",
      "my-restaurant",
    ]);
  });

  it("opens only the first lesson when nothing is finished", () => {
    const path = getLessonPath([]);
    expect(path[0]?.unlocked).toBe(true);
    expect(path[0]?.current).toBe(true);
    expect(path.slice(1).every((lesson) => !lesson.unlocked && !lesson.current)).toBe(true);
  });

  it("unlocks the next lesson after the previous one is complete", () => {
    const done = new Set(["sweet-treats"]);
    expect(isLessonUnlocked(0, done)).toBe(true);
    expect(isLessonUnlocked(1, done)).toBe(true);
    expect(isLessonUnlocked(2, done)).toBe(false);

    const path = getLessonPath(["sweet-treats"]);
    expect(path[0]?.completed).toBe(true);
    expect(path[1]?.unlocked).toBe(true);
    expect(path[1]?.current).toBe(true);
    expect(path[2]?.unlocked).toBe(false);
  });
});
