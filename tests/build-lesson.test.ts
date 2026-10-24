import { describe, expect, it } from "vitest";
import { buildLessonExercises, mulberry32 } from "@/domain/build-lesson";
import { getVocab } from "@/domain/content/vocabulary";
import { lessonCatalog } from "@/domain/lesson-path";

describe("buildLessonExercises", () => {
  it("starts with a say-it prompt for the answer language", () => {
    const english = buildLessonExercises("sweet-treats", "en", mulberry32(1));
    const said = english[0];
    if (said?.type !== "say") throw new Error("missing say exercise");
    expect(said.lang).toBe("en");
    expect(said.promptText).toBe("cake");
    expect(said.accepted).toContain("cake");

    const spanish = buildLessonExercises("sweet-treats", "en-es", mulberry32(1));
    const translated = spanish[0];
    if (translated?.type !== "say") throw new Error("missing say exercise");
    expect(translated.promptText).toBe("pastel");
    expect(translated.accepted).toContain("torta");
  });

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

  it("traces the writing-lesson words in the answer language", () => {
    const spanish = buildLessonExercises("write-it", "es", mulberry32(5));
    const traced = spanish.filter((exercise) => exercise.type === "trace");
    expect(traced.map((exercise) => (exercise.type === "trace" ? exercise.word : ""))).toEqual([
      "leche",
      "sándwich",
      "ensalada",
    ]);

    const english = buildLessonExercises("write-it", "en", mulberry32(5));
    const first = english.find((exercise) => exercise.type === "trace");
    if (first?.type !== "trace") throw new Error("missing trace exercise");
    expect(first.word).toBe("milk");
    expect(first.lang).toBe("en");

    for (const lesson of lessonCatalog) {
      if (lesson.kind === "writing") continue;
      const round = buildLessonExercises(lesson.id, "en", mulberry32(6));
      expect(round.some((exercise) => exercise.type === "trace")).toBe(false);
    }
  });

  it("swaps tracing for spell-the-word when letter tracing is off", () => {
    const spelled = buildLessonExercises("write-it", "es", mulberry32(5), { letterTracing: false });
    const spells = spelled.filter((exercise) => exercise.type === "spell");
    expect(spelled.some((exercise) => exercise.type === "trace")).toBe(false);
    expect(spells.map((exercise) => (exercise.type === "spell" ? exercise.word : ""))).toEqual([
      "leche",
      "sándwich",
      "ensalada",
    ]);
    for (const exercise of spells) {
      if (exercise.type !== "spell") continue;
      expect(exercise.answerLang).toBe("es");
      expect(exercise.letters.join("")).toBe(exercise.word);
      expect(exercise.tiles).toHaveLength(exercise.letters.length + 2);
      for (const letter of exercise.letters) {
        const needed = exercise.letters.filter((item) => item === letter).length;
        expect(exercise.tiles.filter((item) => item === letter).length).toBe(needed);
      }
    }

    const traced = buildLessonExercises("write-it", "en", mulberry32(5), { letterTracing: true });
    expect(traced.some((exercise) => exercise.type === "spell")).toBe(false);
    const first = traced.find((exercise) => exercise.type === "trace");
    if (first?.type !== "trace") throw new Error("missing trace exercise");
    expect(first.word).toBe("milk");
    expect(first.lang).toBe("en");

    const englishTiles = buildLessonExercises("write-it", "es-en", () => 0.999999, { letterTracing: false });
    const milk = englishTiles.find((exercise) => exercise.type === "spell");
    if (milk?.type !== "spell") throw new Error("missing spell exercise");
    expect(milk.answerLang).toBe("en");
    expect(milk.word).toBe("milk");
    expect(milk.letters).toEqual(["m", "i", "l", "k"]);
    expect(milk.tiles.slice(0, 4)).toEqual(["i", "m", "l", "k"]);

    for (const lesson of lessonCatalog) {
      if (lesson.kind === "writing") continue;
      const round = buildLessonExercises(lesson.id, "en", mulberry32(8), { letterTracing: false });
      expect(round.some((exercise) => exercise.type === "spell" || exercise.type === "trace")).toBe(false);
    }
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
