import type { LocalizedText } from "@/domain/language";

export interface LessonSummary {
  id: string;
  emoji: string;
  title: LocalizedText;
  blurb: LocalizedText;
}

/**
 * Unit 7 path. Practice rules arrive with the exercise layer;
 * this catalog is the map the child sees.
 */
export const lessonCatalog: readonly LessonSummary[] = [
  {
    id: "sweet-treats",
    emoji: "🍰",
    title: { en: "Sweet treats", es: "Cosas dulces" },
    blurb: {
      en: "Cake, ice cream, and cookies.",
      es: "Pastel, helado y galletas.",
    },
  },
  {
    id: "fruits",
    emoji: "🍎",
    title: { en: "Fruits", es: "Frutas" },
    blurb: {
      en: "Apple, grapes, orange, and fruit.",
      es: "Manzana, uvas, naranja y fruta.",
    },
  },
  {
    id: "drinks",
    emoji: "🥛",
    title: { en: "Drinks", es: "Bebidas" },
    blurb: { en: "Juice and milk.", es: "Jugo y leche." },
  },
  {
    id: "market-meals",
    emoji: "🍔",
    title: { en: "At the market", es: "En el mercado" },
    blurb: {
      en: "Pizza, hamburger, hot dog, and sandwich.",
      es: "Pizza, hamburguesa, hot dog y sándwich.",
    },
  },
  {
    id: "on-the-plate",
    emoji: "🥗",
    title: { en: "On the plate", es: "En el plato" },
    blurb: {
      en: "Salad, chicken, and pasta.",
      es: "Ensalada, pollo y fideos.",
    },
  },
  {
    id: "word-review",
    emoji: "⭐",
    title: { en: "Word review", es: "Repaso" },
    blurb: {
      en: "All the food words, mixed together.",
      es: "Todas las palabras de la comida, revueltas.",
    },
  },
  {
    id: "menu-sentences",
    emoji: "📋",
    title: { en: "Menu sentences", es: "Oraciones del menú" },
    blurb: {
      en: "Milk and a sandwich. Pasta and orange juice.",
      es: "Leche y un sándwich. Fideos y jugo de naranja.",
    },
  },
  {
    id: "i-like",
    emoji: "💛",
    title: { en: "I like, I want", es: "Me gusta, quiero" },
    blurb: {
      en: "I like apples. I want pizza.",
      es: "Me gustan las manzanas. Quiero pizza.",
    },
  },
  {
    id: "write-it",
    emoji: "✏️",
    title: { en: "Write it", es: "Escríbelo" },
    blurb: {
      en: "Write the menu words.",
      es: "Escribe las palabras del menú.",
    },
  },
  {
    id: "my-restaurant",
    emoji: "🏠",
    title: { en: "My restaurant", es: "Mi restaurante" },
    blurb: {
      en: "My restaurant is called…",
      es: "Mi restaurante se llama…",
    },
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
