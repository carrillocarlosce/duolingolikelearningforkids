import { describe, expect, it } from "vitest";
import { gradeExact } from "@/domain/answers";
import { buildLessonExercises, mulberry32 } from "@/domain/build-lesson";
import { examLines } from "@/domain/content/exam";
import { practiceCards } from "@/domain/content/practice-cards";
import { getVocab } from "@/domain/content/vocabulary";
import { getLessonPath } from "@/application/get-lesson-path";
import { continueSession, startSession, submitAnswer } from "@/domain/session";
import { foodRole } from "@/domain/restaurant";

describe("exam practice", () => {
  it("spells the English line exactly and ignores capitals and extra spaces", () => {
    const accepted = ["Ice cream and cake"];
    expect(gradeExact("  ICE   CREAM and cake ", accepted)).toEqual({
      status: "correct",
      canonical: "Ice cream and cake",
    });
    expect(gradeExact("Ice-cream and cake", accepted).status).toBe("correct");
    expect(gradeExact("a fruit salad", ["A fruit salad"]).status).toBe("correct");
    expect(gradeExact("icecream and cake", accepted)).toEqual({
      status: "incorrect",
      canonical: "Ice cream and cake",
    });
    expect(gradeExact("Ice creem and cake", accepted).status).toBe("incorrect");
    expect(gradeExact("Fruit salad", ["A fruit salad"]).status).toBe("incorrect");
    expect(gradeExact("Helado y torta", accepted)).toEqual({
      status: "incorrect",
      canonical: "Ice cream and cake",
    });
  });

  it("keeps fries as an everyday food", () => {
    expect(getVocab("fries").emoji).toBe("🍟");
    expect(getVocab("fries").healthy).toBe(false);
    expect(foodRole("fries")).toBe("everyday");
  });

  it("builds each menu line from easy copy to a hidden recall", () => {
    const steps = buildLessonExercises("exam-ice-cream-and-cake", "es", mulberry32(2));
    expect(steps.map((step) => step.type)).toEqual(["type", "build", "fill", "fill", "type"]);
    expect(steps.every((step) => step.type === "say" || step.type === "listen")).toBe(false);

    const copy = steps[0];
    if (copy?.type !== "type") throw new Error("missing copy step");
    expect(copy.answerLang).toBe("en");
    expect(copy.promptText).toBe("Ice cream and cake");
    expect(copy.sourceText).toBe("Helado y torta");
    expect(copy.hidePromptText).toBe(false);
    expect(copy.strict).toBe(true);
    expect(copy.retryUntilCorrect).toBe(true);
    expect(copy.exam).toBe(true);
    expect(copy.accepted).toEqual(["Ice cream and cake"]);

    const built = steps[1];
    if (built?.type !== "build") throw new Error("missing tile step");
    expect(built.answerLang).toBe("en");
    expect(built.answerTokens).toEqual(["Ice", "cream", "and", "cake"]);
    expect(built.sourceText).toBe("Helado y torta");
    for (const token of ["Ice", "cream", "and", "cake", "the", "or", "with", "my"]) {
      expect(built.tiles).toContain(token);
    }
    expect(built.exam).toBe(true);

    const word = steps[2];
    if (word?.type !== "fill") throw new Error("missing function-word step");
    expect(word.itemId).toBe("and");
    expect(word.clozeText).toBe("Ice cream ___ cake");
    expect(word.choiceLabels?.and).toBe("and");
    expect(word.choiceIds).toEqual(expect.arrayContaining(["and", "the", "or", "with"]));
    expect(word.exam).toBe(true);

    const food = steps[3];
    if (food?.type !== "fill") throw new Error("missing food step");
    expect(food.itemId).toBe("cake");
    expect(food.clozeText).toBe("Ice cream and ___");
    expect(food.choiceLabels).toBeUndefined();
    expect(food.exam).toBe(true);

    const recall = steps[4];
    if (recall?.type !== "type") throw new Error("missing recall step");
    expect(recall.hidePromptText).toBe(true);
    expect(recall.promptText).toBe("");
    expect(recall.sourceText).toBeUndefined();
    expect(recall.emoji).toBe("🍦");
    expect(recall.strict).toBe(true);
    expect(recall.retryUntilCorrect).toBe(true);

    const article = buildLessonExercises("exam-a-fruit-salad", "en-es", mulberry32(3));
    const blank = article.find((step) => step.type === "fill" && step.itemId === "a");
    if (blank?.type !== "fill") throw new Error("missing article step");
    expect(blank.clozeText).toBe("___ fruit salad");
    expect(blank.choiceLabels?.a).toBe("A");
    expect(blank.answerLang).toBe("en");
    expect(article.every((step) => ("answerLang" in step ? step.answerLang === "en" : true))).toBe(true);
  });

  it("asks for every line on the menu card, in order", () => {
    const menu = buildLessonExercises("exam-write-menu", "es", mulberry32(1));
    expect(menu).toHaveLength(examLines().length);
    expect(menu.map((step) => (step.type === "type" ? step.speakText : ""))).toEqual([
      "Ice cream and cake",
      "A fruit salad",
      "Sandwich and milk",
      "Hamburger and fries",
    ]);
    const first = menu[0];
    const last = menu[3];
    if (first?.type !== "type" || !first.menuCard) throw new Error("missing menu card");
    if (last?.type !== "type" || !last.menuCard) throw new Error("missing last menu row");
    expect(first.menuCard.title).toBe("Escribe mi menú");
    expect(first.menuCard.rows.map((row) => row.state)).toEqual(["now", "later", "later", "later"]);
    expect(last.menuCard.rows.map((row) => row.state)).toEqual(["done", "done", "done", "now"]);
    expect(last.menuCard.rows[0]?.text).toBe("Ice cream and cake");
    expect(first.strict).toBe(true);
    expect(first.retryUntilCorrect).toBe(true);
    expect(first.exam).toBe(true);
  });

  it("shows the line again and does not spend a heart when the spelling is wrong", () => {
    const steps = buildLessonExercises("exam-ice-cream-and-cake", "en", mulberry32(4));
    const copy = steps[0];
    if (copy?.type !== "type") throw new Error("missing copy step");
    const missed = submitAnswer(startSession("exam-ice-cream-and-cake", 1), copy, {
      type: "text",
      text: "Ice creem and cake",
    });
    expect(missed.hearts).toBe(1);
    expect(missed.outcome).toBe("active");
    expect(missed.lastGrade).toEqual({ status: "incorrect", canonical: "Ice cream and cake" });
    const stayed = continueSession(missed, steps.length, true);
    expect(stayed.index).toBe(0);
    expect(stayed.phase).toBe("question");
    expect(stayed.lastGrade).toBeNull();

    const typed = submitAnswer(stayed, copy, { type: "text", text: "  ICE   CREAM and cake " });
    expect(typed.lastGrade?.status).toBe("correct");
    expect(typed.hearts).toBe(1);
    expect(continueSession(typed, steps.length, true).index).toBe(1);
  });

  it("opens the exam section before the path is finished", () => {
    const fresh = getLessonPath([]);
    expect(fresh.find((lesson) => lesson.current)?.id).toBe("sweet-treats");
    expect(fresh.find((lesson) => lesson.id === "exam-ice-cream-and-cake")?.unlocked).toBe(true);
    expect(fresh.find((lesson) => lesson.id === "exam-a-fruit-salad")?.unlocked).toBe(false);
    expect(fresh.find((lesson) => lesson.id === "exam-write-menu")?.unlocked).toBe(false);

    const oneLine = getLessonPath(["exam-ice-cream-and-cake"]);
    expect(oneLine.find((lesson) => lesson.id === "exam-a-fruit-salad")?.unlocked).toBe(true);
    expect(oneLine.find((lesson) => lesson.id === "exam-sandwich-and-milk")?.unlocked).toBe(false);

    const lines = [
      "exam-ice-cream-and-cake",
      "exam-a-fruit-salad",
      "exam-sandwich-and-milk",
      "exam-hamburger-and-fries",
    ];
    expect(getLessonPath(lines).find((lesson) => lesson.id === "exam-write-menu")?.unlocked).toBe(true);
    expect(practiceCards("exam-ice-cream-and-cake")).toEqual([
      { id: "ice-cream-and-cake", emoji: "🍦", en: "Ice cream and cake", es: "Helado y torta" },
    ]);
    expect(practiceCards("exam-write-menu").map((card) => card.en)).toEqual([
      "Ice cream and cake",
      "A fruit salad",
      "Sandwich and milk",
      "Hamburger and fries",
    ]);
  });
});
