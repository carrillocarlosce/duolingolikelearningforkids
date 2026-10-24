import { describe, expect, it } from "vitest";
import type { Exercise } from "@/domain/exercises";
import { XP_ALMOST, XP_CORRECT, XP_LESSON_BONUS, XP_PERFECT_BONUS } from "@/domain/scoring";
import { completionSummary, continueSession, startSession, submitAnswer, TRACE_COVERAGE } from "@/domain/session";

const picture = (id = "q1"): Exercise => ({
  id,
  type: "picture-word",
  itemId: "apple",
  choiceIds: ["apple", "milk"],
  answerLang: "en",
  promptLang: null,
  showPromptWord: false,
  promptText: "",
  answerText: "apple",
});

describe("lesson session", () => {
  it("gives XP for a right answer and a near miss without spending a heart", () => {
    const typed: Exercise = {
      id: "type-1",
      type: "type",
      promptLang: "en",
      answerLang: "es",
      promptText: "apple",
      hidePromptText: false,
      speakText: "apple",
      accepted: ["manzana"],
      emoji: "🍎",
    };
    const almost = submitAnswer(startSession("fruits", 5), typed, { type: "text", text: "mansana" });
    expect(almost.lastGrade?.status).toBe("almost");
    expect(almost.hearts).toBe(5);
    expect(almost.xpEarned).toBe(XP_ALMOST);
    expect(almost.mistakes).toBe(0);

    const correct = submitAnswer(startSession("fruits", 5), picture(), { type: "choice", choiceId: "apple" });
    expect(correct.xpEarned).toBe(XP_CORRECT);
    expect(correct.hearts).toBe(5);
  });

  it("spends a heart on a miss and ends the lesson at zero", () => {
    const missed = submitAnswer(startSession("fruits", 2), picture(), { type: "choice", choiceId: "milk" });
    expect(missed.hearts).toBe(1);
    expect(missed.outcome).toBe("active");
    expect(missed.lastGrade?.canonical).toBe("apple");

    const failed = submitAnswer({ ...missed, phase: "question" }, picture("q2"), {
      type: "choice",
      choiceId: "milk",
    });
    expect(failed.hearts).toBe(0);
    expect(failed.outcome).toBe("failed");
    expect(continueSession(failed, 3).outcome).toBe("failed");
  });

  it("does not spend hearts on matching or tracing mistakes", () => {
    const match: Exercise = {
      id: "m",
      type: "match",
      left: [{ pairId: "apple", text: "apple" }],
      right: [{ pairId: "apple", text: "manzana" }],
    };
    const missed = submitAnswer(startSession("fruits", 3), match, { type: "match", matched: 0, total: 1 });
    expect(missed.hearts).toBe(3);
    expect(missed.lastGrade?.status).toBe("incorrect");

    const trace: Exercise = { id: "t", type: "trace", word: "milk", answerLang: "en", emoji: "🥛" };
    const low = submitAnswer(startSession("drinks", 3), trace, { type: "trace", coverage: TRACE_COVERAGE - 0.1 });
    expect(low.hearts).toBe(3);
    const done = submitAnswer(startSession("drinks", 3), trace, { type: "trace", coverage: TRACE_COVERAGE });
    expect(done.lastGrade?.status).toBe("correct");
  });

  it("builds a sentence only when every tile is in order", () => {
    const build: Exercise = {
      id: "b",
      type: "build",
      sentenceId: "milk-sandwich",
      promptLang: "en",
      answerLang: "es",
      promptText: "Milk and a sandwich",
      sourceLang: "en",
      sourceText: "Milk and a sandwich",
      showPromptText: true,
      speakText: "Leche y un sándwich",
      tiles: ["Leche", "y", "un", "sándwich", "pizza"],
      answerTokens: ["Leche", "y", "un", "sándwich"],
      answerText: "Leche y un sándwich",
      scene: { emojis: ["🥛", "🥪"] },
    };
    const wrong = submitAnswer(startSession("menu-sentences", 5), build, {
      type: "tokens",
      tokens: ["Leche", "y", "pizza"],
    });
    expect(wrong.lastGrade?.status).toBe("incorrect");
    const right = submitAnswer(startSession("menu-sentences", 5), build, {
      type: "tokens",
      tokens: ["leche", "y", "un", "sandwich"],
    });
    expect(right.lastGrade?.status).toBe("correct");
  });

  it("treats a partial sentence as incomplete instead of a miss", () => {
    const build: Exercise = {
      id: "b2",
      type: "build",
      sentenceId: "like-apples",
      promptLang: "es",
      answerLang: "en",
      sourceLang: "es",
      sourceText: "Me gustan las manzanas",
      promptText: "Me gustan las manzanas",
      showPromptText: true,
      speakText: "I like apples",
      tiles: ["I", "like", "apples", "sandwich", "chicken"],
      answerTokens: ["I", "like", "apples"],
      answerText: "I like apples",
      scene: { mascot: "like", emojis: ["🍎"] },
    };
    const partial = submitAnswer(startSession("i-like", 5), build, { type: "tokens", tokens: ["apples"] });
    expect(partial.lastGrade?.status).toBe("almost");
    expect(partial.lastGrade?.incomplete).toBe(true);
    expect(partial.lastGrade?.canonical).toBe("I like apples");
    expect(partial.hearts).toBe(5);
    expect(partial.mistakes).toBe(0);

    const prefix = submitAnswer(startSession("i-like", 5), build, { type: "tokens", tokens: ["I", "like"] });
    expect(prefix.lastGrade?.incomplete).toBe(true);

    const stray = submitAnswer(startSession("i-like", 5), build, { type: "tokens", tokens: ["apples", "sandwich"] });
    expect(stray.lastGrade?.status).toBe("incorrect");
    expect(stray.hearts).toBe(4);

    const typed: Exercise = {
      id: "type-sentence",
      type: "type",
      sentenceId: "like-apples",
      promptLang: "es",
      answerLang: "en",
      sourceLang: "es",
      sourceText: "Me gustan las manzanas",
      promptText: "Me gustan las manzanas",
      hidePromptText: false,
      speakText: "I like apples",
      accepted: ["I like apples"],
      emoji: "",
      scene: { mascot: "like", emojis: ["🍎"] },
    };
    const short = submitAnswer(startSession("i-like", 5), typed, { type: "text", text: "apples" });
    expect(short.lastGrade).toMatchObject({ status: "almost", incomplete: true, canonical: "I like apples" });
    expect(short.hearts).toBe(5);
  });

  it("adds a perfect bonus when the lesson is finished with no misses", () => {
    const first = submitAnswer(startSession("drinks", 5), picture(), { type: "choice", choiceId: "apple" });
    const second = submitAnswer(continueSession(first, 2), picture("q2"), { type: "choice", choiceId: "apple" });
    const done = continueSession(second, 2);
    expect(done.outcome).toBe("complete");
    expect(completionSummary(done)).toEqual({
      xp: XP_CORRECT * 2 + XP_LESSON_BONUS + XP_PERFECT_BONUS,
      stars: 3,
      perfect: true,
    });
  });

  it("skips an empty spoken answer without costing a heart", () => {
    const say: Exercise = {
      id: "s",
      type: "say",
      promptText: "milk",
      audioText: "milk",
      answerLang: "en",
      accepted: ["milk"],
      emoji: "🥛",
    };
    const silent = submitAnswer(startSession("drinks", 4), say, { type: "speech", transcript: "  " });
    expect(silent.lastGrade?.status).toBe("skipped");
    expect(silent.hearts).toBe(4);
    expect(silent.xpEarned).toBe(0);
    const heard = submitAnswer(startSession("drinks", 4), say, { type: "speech", transcript: "Milk!" });
    expect(heard.lastGrade?.status).toBe("correct");
  });
});
