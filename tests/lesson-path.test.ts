import { describe, expect, it } from "vitest";
import { getLessonPath } from "@/application/get-lesson-path";
import { isLessonUnlocked, lessonCatalog } from "@/domain/lesson-path";

const savedIds = [
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
];

describe("lesson path", () => {
  it("keeps the saved Unit 7 ids and adds the skill ladder around them", () => {
    const ids = lessonCatalog.map((lesson) => lesson.id);
    expect(ids[0]).toBe("sweet-treats");
    expect(ids.at(-1)).toBe("market-challenge");
    let cursor = -1;
    for (const id of savedIds) {
      const index = ids.indexOf(id);
      expect(index).toBeGreaterThan(cursor);
      cursor = index;
    }
    expect(ids).toEqual([
      "sweet-treats",
      "sweet-listen",
      "sweet-spell",
      "sweet-write",
      "pattern-like",
      "checkpoint-sweets",
      "fruits",
      "fruit-listen",
      "fruit-spell",
      "fruit-write",
      "pattern-price",
      "checkpoint-fruits",
      "drinks",
      "drink-listen",
      "drink-spell",
      "drink-write",
      "pattern-please",
      "checkpoint-drinks",
      "market-meals",
      "market-listen",
      "market-spell",
      "market-write",
      "pattern-want",
      "checkpoint-market",
      "on-the-plate",
      "plate-listen",
      "plate-spell",
      "plate-write",
      "plate-sentences",
      "checkpoint-plate",
      "mix-picnic",
      "mix-lunch",
      "mix-basket",
      "word-review",
      "menu-sentences",
      "i-like",
      "write-it",
      "my-restaurant",
      "market-challenge",
    ]);
    expect(new Set(ids).size).toBe(ids.length);
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
    expect(path[1]?.id).toBe("sweet-listen");
    expect(path[1]?.unlocked).toBe(true);
    expect(path[1]?.current).toBe(true);
    expect(path[2]?.unlocked).toBe(false);

    const returned = getLessonPath(["sweet-treats", "fruits"]);
    expect(returned.find((lesson) => lesson.id === "fruits")?.completed).toBe(true);
    expect(returned.find((lesson) => lesson.id === "sweet-listen")?.current).toBe(true);
    expect(returned.find((lesson) => lesson.id === "market-challenge")?.unlocked).toBe(false);
  });
});
