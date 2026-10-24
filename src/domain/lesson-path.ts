import type { LocalizedText } from "@/domain/language";

export type LessonKind = "vocab" | "sentences" | "writing" | "review";

export interface LessonSummary {
  id: string;
  emoji: string;
  title: LocalizedText;
  blurb: LocalizedText;
  kind: LessonKind;
  vocabIds: readonly string[];
  sentenceIds: readonly string[];
}

/**
 * Unit 7 path from the school bulletin "Let's go to the market!"
 * The first lesson is open. Each later lesson opens when the one before it is finished.
 */
export const lessonCatalog: readonly LessonSummary[] = [
  {
    id: "sweet-treats",
    emoji: "🍰",
    title: { en: "Sweet treats", es: "Cosas dulces" },
    blurb: { en: "Cake, ice cream, and cookies.", es: "Pastel, helado y galletas." },
    kind: "vocab",
    vocabIds: ["cake", "ice-cream", "cookies"],
    sentenceIds: [],
  },
  {
    id: "fruits",
    emoji: "🍎",
    title: { en: "Fruits", es: "Frutas" },
    blurb: { en: "Apple, grapes, orange, and fruit.", es: "Manzana, uvas, naranja y fruta." },
    kind: "vocab",
    vocabIds: ["apple", "grapes", "orange", "fruit"],
    sentenceIds: [],
  },
  {
    id: "drinks",
    emoji: "🥛",
    title: { en: "Drinks", es: "Bebidas" },
    blurb: { en: "Juice and milk.", es: "Jugo y leche." },
    kind: "vocab",
    vocabIds: ["juice", "milk"],
    sentenceIds: [],
  },
  {
    id: "market-meals",
    emoji: "🍔",
    title: { en: "At the market", es: "En el mercado" },
    blurb: {
      en: "Pizza, hamburger, hot dog, and sandwich.",
      es: "Pizza, hamburguesa, hot dog y sándwich.",
    },
    kind: "vocab",
    vocabIds: ["pizza", "hamburger", "hot-dog", "sandwich"],
    sentenceIds: [],
  },
  {
    id: "on-the-plate",
    emoji: "🥗",
    title: { en: "On the plate", es: "En el plato" },
    blurb: { en: "Salad, chicken, and pasta.", es: "Ensalada, pollo y fideos." },
    kind: "vocab",
    vocabIds: ["salad", "chicken", "pasta"],
    sentenceIds: [],
  },
  {
    id: "word-review",
    emoji: "⭐",
    title: { en: "Word review", es: "Repaso" },
    blurb: {
      en: "All the food words, mixed together.",
      es: "Todas las palabras de la comida, revueltas.",
    },
    kind: "review",
    vocabIds: [],
    sentenceIds: [],
  },
  {
    id: "menu-sentences",
    emoji: "📋",
    title: { en: "Menu sentences", es: "Oraciones del menú" },
    blurb: {
      en: "Milk and a sandwich. Pasta and orange juice.",
      es: "Leche y un sándwich. Fideos y jugo de naranja.",
    },
    kind: "sentences",
    vocabIds: [],
    sentenceIds: ["milk-sandwich", "pasta-juice", "chicken-salad", "fruit-salad"],
  },
  {
    id: "i-like",
    emoji: "💛",
    title: { en: "I like, I want", es: "Me gusta, quiero" },
    blurb: { en: "I like apples. I want pizza.", es: "Me gustan las manzanas. Quiero pizza." },
    kind: "sentences",
    vocabIds: [],
    sentenceIds: ["like-apples", "want-pizza", "like-milk", "want-hamburger", "want-cookies"],
  },
  {
    id: "write-it",
    emoji: "✏️",
    title: { en: "Write it", es: "Escríbelo" },
    blurb: { en: "Write the menu words.", es: "Escribe las palabras del menú." },
    kind: "writing",
    vocabIds: ["milk", "sandwich", "salad", "chicken", "apple"],
    sentenceIds: ["milk-sandwich", "fruit-salad"],
  },
  {
    id: "my-restaurant",
    emoji: "🏠",
    title: { en: "My restaurant", es: "Mi restaurante" },
    blurb: { en: "My restaurant is called…", es: "Mi restaurante se llama…" },
    kind: "sentences",
    vocabIds: [],
    sentenceIds: ["my-restaurant", "orange-juice", "fruit-salad"],
  },
];

export function isLessonUnlocked(
  lessonIndex: number,
  completedIds: ReadonlySet<string>,
): boolean {
  if (lessonIndex <= 0) return true;
  const previous = lessonCatalog[lessonIndex - 1];
  if (!previous) return false;
  return completedIds.has(previous.id);
}

export function getLesson(id: string): LessonSummary | undefined {
  return lessonCatalog.find((lesson) => lesson.id === id);
}
