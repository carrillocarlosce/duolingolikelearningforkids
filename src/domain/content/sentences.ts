import type { Lang } from "@/domain/language";

/** Picture that carries the sentence meaning. A single food emoji is not enough for "I like" or "I want". */
export interface SentenceScene {
  emojis: readonly string[];
  mascot?: "like" | "want" | "shop";
}

export interface Sentence {
  id: string;
  en: string;
  es: string;
  enTokens: readonly string[];
  esTokens: readonly string[];
  enAlternates?: readonly string[];
  esAlternates?: readonly string[];
  imageIds: readonly string[];
  scene: SentenceScene;
  /** Answer-language frame with a blank, used when the child picks the food inside a sentence. */
  cloze?: { en: string; es: string };
}

export function otherLang(lang: Lang): Lang {
  return lang === "en" ? "es" : "en";
}

/** Emoji row for the lesson reader. The exercise screen draws Pipo itself. */
export function scenePreview(scene: SentenceScene): string {
  const lead = scene.mascot === "like" ? "💛" : scene.mascot === "want" ? "👉" : scene.mascot === "shop" ? "🏠" : "";
  return `${lead}${scene.emojis.join("")}`;
}

export const sentences: readonly Sentence[] = [
  {
    id: "milk-sandwich",
    en: "Milk and a sandwich",
    es: "Leche y un sándwich",
    enTokens: ["Milk", "and", "a", "sandwich"],
    esTokens: ["Leche", "y", "un", "sándwich"],
    imageIds: ["milk", "sandwich"],
    scene: { emojis: ["🥛", "🥪"] },
  },
  {
    id: "pasta-juice",
    en: "Pasta and orange juice",
    es: "Fideos y jugo de naranja",
    enTokens: ["Pasta", "and", "orange", "juice"],
    esTokens: ["Fideos", "y", "jugo", "de", "naranja"],
    esAlternates: ["Pasta y jugo de naranja", "Tallarines y jugo de naranja"],
    imageIds: ["pasta", "orange", "juice"],
    scene: { emojis: ["🍝", "🍊", "🧃"] },
  },
  {
    id: "chicken-salad",
    en: "Chicken and salad",
    es: "Pollo y ensalada",
    enTokens: ["Chicken", "and", "salad"],
    esTokens: ["Pollo", "y", "ensalada"],
    imageIds: ["chicken", "salad"],
    scene: { emojis: ["🍗", "🥗"] },
  },
  {
    id: "fruit-salad",
    en: "Fruit salad",
    es: "Ensalada de frutas",
    enTokens: ["Fruit", "salad"],
    esTokens: ["Ensalada", "de", "frutas"],
    imageIds: ["fruit", "salad"],
    scene: { emojis: ["🍓", "🥗"] },
  },
  {
    id: "like-apples",
    en: "I like apples",
    es: "Me gustan las manzanas",
    enTokens: ["I", "like", "apples"],
    esTokens: ["Me", "gustan", "las", "manzanas"],
    imageIds: ["apple"],
    scene: { mascot: "like", emojis: ["🍎"] },
    cloze: { en: "I like ___", es: "Me gustan las ___" },
  },
  {
    id: "want-pizza",
    en: "I want pizza",
    es: "Quiero pizza",
    enTokens: ["I", "want", "pizza"],
    esTokens: ["Quiero", "pizza"],
    imageIds: ["pizza"],
    scene: { mascot: "want", emojis: ["🍕"] },
    cloze: { en: "I want ___", es: "Quiero ___" },
  },
  {
    id: "like-milk",
    en: "I like milk",
    es: "Me gusta la leche",
    enTokens: ["I", "like", "milk"],
    esTokens: ["Me", "gusta", "la", "leche"],
    imageIds: ["milk"],
    scene: { mascot: "like", emojis: ["🥛"] },
    cloze: { en: "I like ___", es: "Me gusta la ___" },
  },
  {
    id: "want-hamburger",
    en: "I want a hamburger",
    es: "Quiero una hamburguesa",
    enTokens: ["I", "want", "a", "hamburger"],
    esTokens: ["Quiero", "una", "hamburguesa"],
    imageIds: ["hamburger"],
    scene: { mascot: "want", emojis: ["🍔"] },
    cloze: { en: "I want a ___", es: "Quiero una ___" },
  },
  {
    id: "want-cookies",
    en: "I want cookies",
    es: "Quiero galletas",
    enTokens: ["I", "want", "cookies"],
    esTokens: ["Quiero", "galletas"],
    imageIds: ["cookies"],
    scene: { mascot: "want", emojis: ["🍪"] },
    cloze: { en: "I want ___", es: "Quiero ___" },
  },
  {
    id: "orange-juice",
    en: "Orange juice",
    es: "Jugo de naranja",
    enTokens: ["Orange", "juice"],
    esTokens: ["Jugo", "de", "naranja"],
    imageIds: ["orange", "juice"],
    scene: { emojis: ["🍊", "🧃"] },
  },
  {
    id: "my-restaurant",
    en: "My restaurant is called Sunny Food",
    es: "Mi restaurante se llama Sunny Food",
    enTokens: ["My", "restaurant", "is", "called", "Sunny", "Food"],
    esTokens: ["Mi", "restaurante", "se", "llama", "Sunny", "Food"],
    imageIds: ["fruit", "salad"],
    scene: { mascot: "shop", emojis: ["🍽️"] },
  },
];

const byId = new Map(sentences.map((sentence) => [sentence.id, sentence]));

export function getSentence(id: string): Sentence {
  const sentence = byId.get(id);
  if (!sentence) throw new Error(`Unknown sentence: ${id}`);
  return sentence;
}

export function acceptedSentenceForms(sentence: Sentence, lang: Lang): string[] {
  const extras = lang === "en" ? sentence.enAlternates : sentence.esAlternates;
  return [sentence[lang], ...(extras ?? [])];
}

export function sentenceTokens(sentence: Sentence, lang: Lang): readonly string[] {
  return lang === "en" ? sentence.enTokens : sentence.esTokens;
}
