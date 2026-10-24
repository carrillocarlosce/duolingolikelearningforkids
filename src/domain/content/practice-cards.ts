import { getSentence, scenePreview } from "@/domain/content/sentences";
import { getVocab, vocabulary } from "@/domain/content/vocabulary";
import { lessonCatalog } from "@/domain/lesson-path";

export interface PracticeCard {
  id: string;
  emoji: string;
  en: string;
  es: string;
}

export function practiceCards(lessonId: string): PracticeCard[] {
  const lesson = lessonCatalog.find((item) => item.id === lessonId);
  if (!lesson) return [];

  const vocabIds =
    lesson.kind === "review" && lesson.vocabIds.length === 0
      ? vocabulary.map((item) => item.id)
      : lesson.vocabIds;
  const words = vocabIds.map((id) => {
    const item = getVocab(id);
    return { id: item.id, emoji: item.emoji, en: item.en, es: item.es };
  });
  const lines = lesson.sentenceIds.map((id) => {
    const sentence = getSentence(id);
    const emoji = scenePreview(sentence.scene);
    return { id: sentence.id, emoji, en: sentence.en, es: sentence.es };
  });
  return [...words, ...lines];
}
