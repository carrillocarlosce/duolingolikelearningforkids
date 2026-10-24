import type { Lang } from "@/domain/language";
import { MAP_UNIT_ID, requireUnit } from "@/domain/content/registry";
import type { VocabItem } from "@/domain/content/unit";

export type { VocabItem };

export const vocabulary: readonly VocabItem[] = requireUnit(MAP_UNIT_ID).vocabulary;

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
