import { describe, expect, it } from "vitest";
import { buildLessonExercises, mulberry32 } from "@/domain/build-lesson";
import { getVocab } from "@/domain/content/vocabulary";
import { lessonCatalog } from "@/domain/lesson-path";

describe("buildLessonExercises", () => {
  it("asks for the Spanish word when practicing English to Spanish", () => {
    const exercises = buildLessonExercises("sweet-treats", "en-es", mulberry32(1));
    const picture = exercises.find((exercise) => exercise.type === "picture-word");
    expect(picture?.type).toBe("picture-word");
    if (picture?.type !== "picture-word") return;
    expect(picture.answerLang).toBe("es");
    expect(picture.showPromptWord).toBe(true);
    expect(picture.choiceIds).toContain(picture.itemId);
    expect(picture.answerText).toBe(getVocab(picture.itemId).es);
    expect(new Set(exercises.map((exercise) => exercise.id)).size).toBe(exercises.length);
  });

  it("hides the written word in English-only picture choices", () => {
    const exercises = buildLessonExercises("fruits", "en", mulberry32(2));
    const picture = exercises.find((exercise) => exercise.type === "picture-word");
    if (picture?.type !== "picture-word") throw new Error("missing picture exercise");
    expect(picture.showPromptWord).toBe(false);
    expect(picture.answerLang).toBe("en");
    expect(picture.answerText).toBe(getVocab(picture.itemId).en);

    const typed = exercises.find((exercise) => exercise.type === "type");
    if (typed?.type !== "type") throw new Error("missing type exercise");
    expect(typed.hidePromptText).toBe(true);
    expect(typed.promptText).toBe("");
    expect(typed.accepted[0]?.length).toBeGreaterThan(0);
  });

  it("puts every answer tile in the sentence builder and matches both columns", () => {
    const exercises = buildLessonExercises("menu-sentences", "es-en", mulberry32(3));
    const built = exercises.find((exercise) => exercise.type === "build");
    if (built?.type !== "build") throw new Error("missing build exercise");
    expect(built.answerLang).toBe("en");
    for (const token of built.answerTokens) expect(built.tiles).toContain(token);

    const matched = exercises.find((exercise) => exercise.type === "match");
    if (matched?.type !== "match") throw new Error("missing match exercise");
    expect(matched.left.map((side) => side.pairId).sort()).toEqual(
      matched.right.map((side) => side.pairId).sort(),
    );
    expect(matched.left.every((side) => side.text.length > 0)).toBe(true);
  });

  it("builds a non-empty round for every lesson and direction", () => {
    for (const lesson of lessonCatalog) {
      for (const direction of ["en-es", "es-en", "en", "es"] as const) {
        const exercises = buildLessonExercises(lesson.id, direction, mulberry32(4));
        expect(exercises.length).toBeGreaterThan(0);
        for (const exercise of exercises) {
          if (
            exercise.type === "picture-word" ||
            exercise.type === "word-picture" ||
            exercise.type === "listen"
          ) {
            expect(exercise.choiceIds).toContain(exercise.itemId);
          }
        }
        expect(exercises.some((exercise) => exercise.type === "listen")).toBe(true);
      }
    }
  });
});
