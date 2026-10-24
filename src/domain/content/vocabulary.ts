import type { Lang } from "@/domain/language";

export interface VocabItem {
  id: string;
  en: string;
  es: string;
  enAlternates?: readonly string[];
  esAlternates?: readonly string[];
  emoji: string;
  /** Foods the healthy-menu badge treats as a good choice. */
  healthy: boolean;
}

export const vocabulary: readonly VocabItem[] = [
  { id: "cake", en: "cake", es: "pastel", esAlternates: ["torta", "queque"], emoji: "🍰", healthy: false },
  { id: "apple", en: "apple", es: "manzana", emoji: "🍎", healthy: true },
  {
    id: "ice-cream",
    en: "ice cream",
    es: "helado",
    enAlternates: ["ice-cream"],
    emoji: "🍦",
    healthy: false,
  },
  { id: "juice", en: "juice", es: "jugo", emoji: "🧃", healthy: false },
  { id: "milk", en: "milk", es: "leche", emoji: "🥛", healthy: true },
  { id: "grapes", en: "grapes", es: "uvas", emoji: "🍇", healthy: true },
  { id: "pizza", en: "pizza", es: "pizza", emoji: "🍕", healthy: false },
  { id: "salad", en: "salad", es: "ensalada", emoji: "🥗", healthy: true },
  {
    id: "hamburger",
    en: "hamburger",
    es: "hamburguesa",
    enAlternates: ["burger"],
    emoji: "🍔",
    healthy: false,
  },
  { id: "fruit", en: "fruit", es: "fruta", emoji: "🍓", healthy: true },
  {
    id: "pasta",
    en: "pasta",
    es: "fideos",
    esAlternates: ["pasta", "tallarines"],
    emoji: "🍝",
    healthy: false,
  },
  { id: "orange", en: "orange", es: "naranja", emoji: "🍊", healthy: true },
  {
    id: "sandwich",
    en: "sandwich",
    es: "sándwich",
    esAlternates: ["sandwich"],
    emoji: "🥪",
    healthy: false,
  },
  { id: "chicken", en: "chicken", es: "pollo", emoji: "🍗", healthy: true },
  { id: "cookies", en: "cookies", es: "galletas", emoji: "🍪", healthy: false },
  {
    id: "hot-dog",
    en: "hot dog",
    es: "hot dog",
    enAlternates: ["hotdog", "hot-dog"],
    esAlternates: ["perro caliente"],
    emoji: "🌭",
    healthy: false,
  },
];

const byId = new Map(vocabulary.map((item) => [item.id, item]));

export function getVocab(id: string): VocabItem {
  const item = byId.get(id);
  if (!item) throw new Error(`Unknown word: ${id}`);
  return item;
}

export function acceptedForms(item: VocabItem, lang: Lang): string[] {
  const extras = lang === "en" ? item.enAlternates : item.esAlternates;
  return [item[lang], ...(extras ?? [])];
}
