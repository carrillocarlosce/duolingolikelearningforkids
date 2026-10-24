import { describe, expect, it } from "vitest";
import { buildLessonExercises, mulberry32 } from "@/domain/build-lesson";
import { getVocab } from "@/domain/content/vocabulary";
import { getSentence } from "@/domain/content/sentences";
import { answerLanguage, sentenceSource } from "@/domain/exercises";
import type { Direction, Lang } from "@/domain/language";
import { lessonCatalog } from "@/domain/lesson-path";

function answerFor(direction: Direction): Lang {
  return direction === "en" || direction === "es-en" ? "en" : "es";
}

describe("buildLessonExercises", () => {
  it("starts with a say-it prompt for the answer language", () => {
    const english = buildLessonExercises("sweet-treats", "en", mulberry32(1));
    const said = english[0];
    if (said?.type !== "say") throw new Error("missing say exercise");
    expect(said.answerLang).toBe("en");
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
    expect(first.answerLang).toBe("en");

    for (const lesson of lessonCatalog) {
      if (lesson.kind === "writing") continue;
      const round = buildLessonExercises(lesson.id, "en", mulberry32(6));
      expect(round.some((exercise) => exercise.type === "trace")).toBe(false);
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

  it("puts a target language on every exercise the child writes, builds, traces, or says", () => {
    const seen = new Set<string>();
    for (const lesson of lessonCatalog) {
      for (const direction of ["en-es", "es-en", "en", "es"] as const) {
        const expected = answerFor(direction);
        const exercises = buildLessonExercises(lesson.id, direction, mulberry32(8));
        expect(exercises.some((exercise) => exercise.type === "type" || exercise.type === "say")).toBe(true);
        for (const exercise of exercises) {
          seen.add(exercise.type);
          const target = answerLanguage(exercise);
          switch (exercise.type) {
            case "type":
            case "build":
            case "trace":
            case "say":
              expect(target).toBe(expected);
              expect(exercise.answerLang).toBe(expected);
              break;
            case "picture-word":
            case "word-picture":
            case "listen":
            case "match":
              expect(target).toBeNull();
              break;
            default: {
              const unexpected: never = exercise;
              throw new Error(`unclassified exercise ${JSON.stringify(unexpected)}`);
            }
          }
        }
      }
    }
    expect([...seen].sort()).toEqual(
      ["build", "listen", "match", "picture-word", "say", "trace", "type", "word-picture"].sort(),
    );
  });

  it("gives every sentence exercise a translation and spoken target", () => {
    const themed = new Set(["like-apples", "like-milk", "want-pizza", "want-hamburger", "want-cookies"]);
    for (const lesson of lessonCatalog) {
      for (const direction of ["en-es", "es-en", "en", "es"] as const) {
        const answer = answerFor(direction);
        for (const exercise of buildLessonExercises(lesson.id, direction, mulberry32(9))) {
          const source = sentenceSource(exercise);
          if (!source) continue;
          const sentence = getSentence(source.sentenceId);
          expect(source.sourceLang).not.toBe(answer);
          expect(source.sourceText).toBe(sentence[source.sourceLang]);
          expect(source.sourceText).not.toBe(sentence[answer]);
          expect(source.speakText).toBe(sentence[answer]);
          expect(source.speakText.length).toBeGreaterThan(0);
          expect(source.scene.emojis.length > 0 || source.scene.mascot).toBeTruthy();
          if (sentence.imageIds.length === 1) {
            expect(source.scene.mascot).toBeTruthy();
          }
          if (themed.has(sentence.id)) {
            expect(source.scene.mascot === "like" || source.scene.mascot === "want").toBe(true);
          }
        }
      }
    }

    const liked = buildLessonExercises("i-like", "en", mulberry32(2));
    const said = liked[0];
    if (said?.type !== "say") throw new Error("sentence lesson should open by saying the sentence");
    expect(said.sentenceId).toBe("like-apples");
    expect(said.promptText).toBe("I like apples");
    expect(said.sourceText).toBe("Me gustan las manzanas");

    const pictured = liked.find((exercise) => exercise.type === "picture-word");
    if (pictured?.type !== "picture-word") throw new Error("missing themed picture");
    expect(pictured.promptText).toBe("I like ___");
    expect(pictured.scene?.mascot).toBe("like");
    expect(pictured.scene?.emojis).toEqual([]);

    const built = liked.find((exercise) => exercise.type === "build" && exercise.sentenceId === "like-apples");
    if (built?.type !== "build") throw new Error("missing like-apples builder");
    expect(built.sourceText).toBe("Me gustan las manzanas");
    expect(built.speakText).toBe("I like apples");
    expect(built.answerTokens).toEqual(["I", "like", "apples"]);
    expect(built.showPromptText).toBe(true);
    expect(built.scene).toEqual({ mascot: "like", emojis: ["🍎"] });

    const heard = liked.find((exercise) => exercise.type === "listen" && exercise.sentenceId === "like-apples");
    if (heard?.type !== "listen") throw new Error("missing sentence listen");
    expect(heard.audioText).toBe("I like apples");
    expect(heard.clozeText).toBe("I like ___");
  });
});
