import { getVocab, vocabulary, type VocabItem } from "@/domain/content/vocabulary";
import type { Direction, Lang } from "@/domain/language";

/** How many foods go on the menu. */
export const MENU_SIZE = 3;

export type MenuVerdict = "short" | "healthy" | "too-many-treats";

export type FoodRole = "healthy" | "treat" | "everyday";

/**
 * Sweets and heavy snacks. A healthy menu may include one of these.
 * Juice, pizza, pasta, and sandwich are everyday foods: allowed, but they
 * do not count toward the healthy foods.
 */
const TREAT_IDS: readonly string[] = ["cake", "ice-cream", "cookies", "hamburger", "hot-dog"];

const treatIds = new Set(TREAT_IDS);
const vocabIds = new Set(vocabulary.map((item) => item.id));

export interface RestaurantPlan {
  nameItemId: string;
  menuIds: readonly string[];
}

export function isVocabId(id: string): boolean {
  return vocabIds.has(id);
}

/** Treats win over the healthy flag so a sweet never counts as a healthy food. */
export function foodRole(id: string): FoodRole {
  if (!isVocabId(id)) throw new Error(`Unknown word: ${id}`);
  if (treatIds.has(id)) return "treat";
  if (getVocab(id).healthy) return "healthy";
  return "everyday";
}

/**
 * A menu is healthy with at least two healthy foods and at most one treat.
 * Fewer than three different foods is too short to judge.
 */
export function menuVerdict(menuIds: readonly string[]): MenuVerdict {
  const unique: string[] = [];
  for (const id of menuIds) {
    if (!isVocabId(id)) return "short";
    if (!unique.includes(id)) unique.push(id);
  }
  if (unique.length < MENU_SIZE) return "short";
  let healthy = 0;
  let treats = 0;
  for (const id of unique) {
    const role = foodRole(id);
    if (role === "healthy") healthy += 1;
    if (role === "treat") treats += 1;
  }
  if (healthy >= 2 && treats <= 1) return "healthy";
  return "too-many-treats";
}

/** Practice direction decides the language the child names the restaurant in. */
export function restaurantAnswerLang(direction: Direction): Lang {
  switch (direction) {
    case "en":
    case "es-en":
      return "en";
    case "es":
    case "en-es":
      return "es";
  }
}

function titleFood(text: string, lang: Lang): string {
  const locale = lang === "es" ? "es-PE" : "en-US";
  return text
    .split(" ")
    .map((word) => (word ? word.charAt(0).toLocaleUpperCase(locale) + word.slice(1) : word))
    .join(" ");
}

/** Same frame as the Unit 7 sentence "My restaurant is called Sunny Food". */
export function restaurantName(item: VocabItem, lang: Lang): string {
  const food = titleFood(item[lang], lang);
  return lang === "en" ? `My restaurant is called ${food}` : `Mi restaurante se llama ${food}`;
}

function joinFoods(words: readonly string[], lang: Lang): string {
  if (words.length <= 1) return words[0] ?? "";
  if (words.length === 2) {
    return lang === "en" ? `${words[0]} and ${words[1]}` : `${words[0]} y ${words[1]}`;
  }
  const head = words.slice(0, -1).join(", ");
  const last = words[words.length - 1] ?? "";
  return lang === "en" ? `${head}, and ${last}` : `${head} y ${last}`;
}

/** Menu sentence in the language the child is practicing. Words stay in the lesson spelling. */
export function menuSentence(menuIds: readonly string[], lang: Lang): string {
  const words = menuIds.filter(isVocabId).map((id) => getVocab(id)[lang]);
  if (words.length === 0) return "";
  const list = joinFoods(words, lang);
  return lang === "en" ? `The menu has ${list}` : `El menú tiene ${list}`;
}

/** Drop anything that is not three different Unit 7 foods on a healthy menu. */
export function readRestaurant(value: unknown): RestaurantPlan | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as { nameItemId?: unknown; menuIds?: unknown };
  if (typeof raw.nameItemId !== "string" || !isVocabId(raw.nameItemId)) return null;
  if (!Array.isArray(raw.menuIds) || raw.menuIds.length !== MENU_SIZE) return null;
  const menuIds: string[] = [];
  for (const id of raw.menuIds) {
    if (typeof id !== "string" || !isVocabId(id)) return null;
    menuIds.push(id);
  }
  if (new Set(menuIds).size !== MENU_SIZE) return null;
  if (menuVerdict(menuIds) !== "healthy") return null;
  return { nameItemId: raw.nameItemId, menuIds };
}

/**
 * True when the stored value already matches the normalized plan.
 * A missing plan matches null. An invalid saved menu does not, so it can be rewritten.
 */
export function restaurantStorageMatches(stored: unknown, normalized: RestaurantPlan | null): boolean {
  if (stored == null) return normalized === null;
  const cleaned = readRestaurant(stored);
  if (!cleaned || !normalized) return false;
  return (
    cleaned.nameItemId === normalized.nameItemId &&
    cleaned.menuIds.length === normalized.menuIds.length &&
    cleaned.menuIds.every((id, index) => id === normalized.menuIds[index])
  );
}
