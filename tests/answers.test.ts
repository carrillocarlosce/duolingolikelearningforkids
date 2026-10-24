import { describe, expect, it } from "vitest";
import { gradeText, levenshtein, normalizeAnswer } from "@/domain/answers";
import { acceptedForms, getVocab } from "@/domain/content/vocabulary";
import { acceptedSentenceForms, getSentence } from "@/domain/content/sentences";

describe("answer checking", () => {
  it("ignores case, accents, punctuation, and extra spaces", () => {
    expect(normalizeAnswer("  Mánzana! ")).toBe("manzana");
    expect(gradeText("MANZANA", ["manzana"]).status).toBe("correct");
    expect(gradeText("sándwich", acceptedForms(getVocab("sandwich"), "es")).status).toBe("correct");
    expect(gradeText("leche y un sandwich", acceptedSentenceForms(getSentence("milk-sandwich"), "es")).status).toBe(
      "correct",
    );
  });

  it("accepts Peruvian alternates as fully correct", () => {
    const cake = acceptedForms(getVocab("cake"), "es");
    expect(gradeText("torta", cake).status).toBe("correct");
    expect(gradeText("queque", cake).status).toBe("correct");
    expect(gradeText("pasta", acceptedForms(getVocab("pasta"), "es")).status).toBe("correct");
    expect(gradeText("tallarines", acceptedForms(getVocab("pasta"), "es")).status).toBe("correct");
    expect(gradeText("perro caliente", acceptedForms(getVocab("hot-dog"), "es")).status).toBe("correct");
    expect(
      gradeText("Pasta y jugo de naranja", acceptedSentenceForms(getSentence("pasta-juice"), "es")).status,
    ).toBe("correct");
  });

  it("treats a small typo as almost and shows the real spelling", () => {
    const graded = gradeText("mansana", ["manzana"]);
    expect(graded.status).toBe("almost");
    expect(graded.canonical).toBe("manzana");
    expect(gradeText("icecream", acceptedForms(getVocab("ice-cream"), "en")).status).toBe("almost");
    expect(gradeText("Me gusta las manzanas", acceptedSentenceForms(getSentence("like-apples"), "es")).status).toBe(
      "almost",
    );
  });

  it("rejects a different word, an empty answer, and slips in tiny words", () => {
    expect(gradeText("pizza", ["manzana"]).status).toBe("incorrect");
    expect(gradeText("   ", ["leche"]).status).toBe("incorrect");
    expect(gradeText("a", ["y"]).status).toBe("incorrect");
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });
});
