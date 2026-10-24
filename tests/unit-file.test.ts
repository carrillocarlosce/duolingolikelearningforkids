import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MAP_UNIT_ID, requireUnit, units } from "@/domain/content/registry";
import { parseUnit } from "@/domain/content/unit";
import { lessonCatalog } from "@/domain/lesson-path";

const savedLessonIds = [
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

describe("unit files", () => {
  it("loads Unit 7 and keeps the lesson ids already stored on tablets", () => {
    expect(units.map((unit) => unit.id)).toEqual(["unit-7"]);
    const unit = requireUnit(MAP_UNIT_ID);
    expect(unit.title).toEqual({ en: "Unit 7", es: "Unidad 7" });
    const ids = unit.lessons.map((lesson) => lesson.id);
    expect(ids[0]).toBe("sweet-treats");
    expect(ids.at(-1)).toBe("market-challenge");
    let cursor = -1;
    for (const id of savedLessonIds) {
      const index = ids.indexOf(id);
      expect(index).toBeGreaterThan(cursor);
      cursor = index;
    }
    expect(lessonCatalog.map((lesson) => lesson.id)).toEqual(ids);
    expect(unit.lessons.find((lesson) => lesson.id === "sweet-listen")?.skill).toBe("listen");
    expect(unit.vocabulary).toHaveLength(16);
    expect(unit.sentences.length).toBeGreaterThan(0);
  });

  it("validates the JSON file itself, not only the imported module", () => {
    const file = path.join(process.cwd(), "src/domain/content/units/unit-7.json");
    const parsed = parseUnit(JSON.parse(readFileSync(file, "utf8")));
    expect(parsed.id).toBe("unit-7");
    expect(parsed.lessons.map((lesson) => lesson.id)).toEqual(lessonCatalog.map((lesson) => lesson.id));
  });

  it("names the broken field when a unit file is invalid", () => {
    expect(() => parseUnit({ id: "Unit 7" })).toThrow(/unit\.id: use lowercase/);
    expect(() => parseUnit({ id: "unit-8", title: { en: "Unit 8" } })).toThrow(/unit\.title\.es/);

    const brokenTiles = {
      id: "unit-8",
      title: { en: "Unit 8", es: "Unidad 8" },
      vocabulary: [{ id: "bread", en: "bread", es: "pan", emoji: "🍞", healthy: true }],
      sentences: [
        {
          id: "like-bread",
          en: "I like bread",
          es: "Me gusta el pan",
          enTokens: ["I", "like"],
          esTokens: ["Me", "gusta", "el", "pan"],
          imageIds: ["bread"],
          scene: { emojis: ["🍞"] },
        },
      ],
      lessons: [
        {
          id: "bakery",
          emoji: "🍞",
          title: { en: "Bakery", es: "Panadería" },
          blurb: { en: "Bread.", es: "Pan." },
          kind: "vocab",
          vocabIds: ["missing"],
          sentenceIds: [],
        },
      ],
    };
    expect(() => parseUnit(brokenTiles)).toThrow(/unit\.sentences\[0\]\.enTokens/);

    const unknownWord = {
      ...brokenTiles,
      sentences: [
        {
          ...brokenTiles.sentences[0],
          enTokens: ["I", "like", "bread"],
        },
      ],
    };
    expect(() => parseUnit(unknownWord)).toThrow(/unit\.lessons\[0\]\.vocabIds: unknown word "missing"/);

    expect(() =>
      parseUnit({
        ...unknownWord,
        lessons: [{ ...unknownWord.lessons[0], vocabIds: ["bread"], kind: "quiz" }],
      }),
    ).toThrow(/unit\.lessons\[0\]\.kind/);

    expect(() =>
      parseUnit({
        ...unknownWord,
        lessons: [{ ...unknownWord.lessons[0], vocabIds: ["bread"], skill: "sing" }],
      }),
    ).toThrow(/unit\.lessons\[0\]\.skill/);
  });
});
