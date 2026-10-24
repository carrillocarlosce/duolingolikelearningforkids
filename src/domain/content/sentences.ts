import type { Lang } from "@/domain/language";
import { MAP_UNIT_ID, requireUnit } from "@/domain/content/registry";
import type { Sentence, SentenceScene } from "@/domain/content/unit";

export type { Sentence, SentenceScene };

export function otherLang(lang: Lang): Lang {
  return lang === "en" ? "es" : "en";
}

/** Emoji row for the lesson reader. The exercise screen draws Pipo itself. */
export function scenePreview(scene: SentenceScene): string {
  const lead = scene.mascot === "like" ? "💛" : scene.mascot === "want" ? "👉" : scene.mascot === "shop" ? "🏠" : "";
  return `${lead}${scene.emojis.join("")}`;
}

export const sentences: readonly Sentence[] = requireUnit(MAP_UNIT_ID).sentences;

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
