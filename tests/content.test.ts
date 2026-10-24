import { describe, expect, it } from "vitest";
import { practiceCards } from "@/domain/content/practice-cards";
import { getSentence, sentences } from "@/domain/content/sentences";
import { vocabulary } from "@/domain/content/vocabulary";
import { lessonCatalog } from "@/domain/lesson-path";

describe("Unit 7 content", () => {
  it("covers the bulletin foods in Peruvian Spanish", () => {
    expect(vocabulary.map((item) => item.en)).toEqual([
      "cake",
      "apple",
      "ice cream",
      "juice",
      "milk",
      "grapes",
      "pizza",
      "salad",
      "hamburger",
      "fruit",
      "pasta",
      "orange",
      "sandwich",
      "chicken",
      "cookies",
      "hot dog",
    ]);
    expect(vocabulary.find((item) => item.id === "pasta")?.es).toBe("fideos");
    expect(vocabulary.find((item) => item.id === "cake")?.es).toBe("pastel");
    expect(vocabulary.find((item) => item.id === "hot-dog")?.esAlternates).toContain("perro caliente");
  });

  it("keeps sentence tiles aligned with the full sentence", () => {
    for (const sentence of sentences) {
      expect(sentence.enTokens.join(" ")).toBe(sentence.en);
      expect(sentence.esTokens.join(" ")).toBe(sentence.es);
      expect(getSentence(sentence.id).imageIds.length).toBeGreaterThan(0);
      expect(sentence.scene.emojis.length > 0 || sentence.scene.mascot).toBeTruthy();
    }
    expect(sentences.map((sentence) => sentence.en)).toEqual(
      expect.arrayContaining([
        "Milk and a sandwich",
        "Pasta and orange juice",
        "Chicken and salad",
        "Fruit salad",
        "I like apples",
        "I want pizza",
        "My restaurant is called Sunny Food",
      ]),
    );
  });

  it("only references words and sentences that exist", () => {
    const wordIds = new Set(vocabulary.map((item) => item.id));
    const sentenceIds = new Set(sentences.map((item) => item.id));
    for (const lesson of lessonCatalog) {
      for (const id of lesson.vocabIds) expect(wordIds.has(id)).toBe(true);
      for (const id of lesson.sentenceIds) expect(sentenceIds.has(id)).toBe(true);
    }
    expect(practiceCards("sweet-treats").map((card) => card.en)).toEqual(["cake", "ice cream", "cookies"]);
    expect(practiceCards("word-review")).toHaveLength(vocabulary.length);
    expect(practiceCards("menu-sentences").map((card) => card.es)).toContain("Leche y un sándwich");
  });
});
