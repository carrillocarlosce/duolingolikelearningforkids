import { acceptedForms, getVocab, vocabulary, type VocabItem } from "@/domain/content/vocabulary";
import {
  acceptedSentenceForms,
  getSentence,
  sentenceTokens,
  type Sentence,
} from "@/domain/content/sentences";
import type { Exercise, MatchSide } from "@/domain/exercises";
import type { Direction, Lang } from "@/domain/language";
import { getLesson, lessonCatalog, type LessonSummary } from "@/domain/lesson-path";

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], rng: () => number): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swap] as T;
    copy[swap] = current as T;
  }
  return copy;
}

function langs(direction: Direction): { prompt: Lang; answer: Lang; translating: boolean } {
  switch (direction) {
    case "en-es":
      return { prompt: "en", answer: "es", translating: true };
    case "es-en":
      return { prompt: "es", answer: "en", translating: true };
    case "en":
      return { prompt: "en", answer: "en", translating: false };
    case "es":
      return { prompt: "es", answer: "es", translating: false };
  }
}

function knownIds(lessonIndex: number): string[] {
  const ids = new Set<string>();
  for (let index = 0; index <= lessonIndex; index += 1) {
    const lesson = lessonCatalog[index];
    if (!lesson) continue;
    if (lesson.kind === "review") vocabulary.forEach((item) => ids.add(item.id));
    lesson.vocabIds.forEach((id) => ids.add(id));
    lesson.sentenceIds.forEach((id) => {
      getSentence(id).imageIds.forEach((imageId) => ids.add(imageId));
    });
  }
  if (ids.size < 4) vocabulary.forEach((item) => ids.add(item.id));
  return [...ids];
}

function choices(correctId: string, pool: readonly string[], rng: () => number): string[] {
  const distractors = shuffled(
    pool.filter((id) => id !== correctId),
    rng,
  ).slice(0, 3);
  return shuffled([correctId, ...distractors], rng);
}

function focusItems(lesson: LessonSummary, rng: () => number): VocabItem[] {
  if (lesson.kind === "review") return shuffled([...vocabulary], rng).slice(0, 6);
  if (lesson.vocabIds.length > 0) return lesson.vocabIds.map((id) => getVocab(id));
  const ids = [...new Set(lesson.sentenceIds.flatMap((id) => [...getSentence(id).imageIds]))];
  return ids.map((id) => getVocab(id));
}

function pictureWord(
  item: VocabItem,
  prompt: Lang,
  answer: Lang,
  translating: boolean,
  pool: readonly string[],
  rng: () => number,
): Exercise {
  return {
    id: "",
    type: "picture-word",
    itemId: item.id,
    choiceIds: choices(item.id, pool, rng),
    answerLang: answer,
    promptLang: translating ? prompt : null,
    showPromptWord: translating,
    promptText: item[prompt],
    answerText: item[answer],
  };
}

function wordPicture(item: VocabItem, prompt: Lang, pool: readonly string[], rng: () => number): Exercise {
  return {
    id: "",
    type: "word-picture",
    itemId: item.id,
    choiceIds: choices(item.id, pool, rng),
    promptLang: prompt,
    promptText: item[prompt],
  };
}

function typeWord(item: VocabItem, prompt: Lang, answer: Lang, translating: boolean): Exercise {
  return {
    id: "",
    type: "type",
    answerLang: answer,
    promptText: translating ? item[prompt] : "",
    hidePromptText: !translating,
    speakText: translating ? item[prompt] : "",
    accepted: acceptedForms(item, answer),
    emoji: item.emoji,
  };
}

function typeSentence(sentence: Sentence, prompt: Lang, answer: Lang, translating: boolean): Exercise {
  return {
    id: "",
    type: "type",
    answerLang: answer,
    promptText: translating ? sentence[prompt] : sentence[answer],
    hidePromptText: false,
    speakText: translating ? sentence[prompt] : sentence[answer],
    accepted: acceptedSentenceForms(sentence, answer),
    emoji: sentence.imageIds.map((id) => getVocab(id).emoji).join(""),
  };
}

function normalizeToken(token: string): string {
  return token.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

function buildSentence(
  sentence: Sentence,
  prompt: Lang,
  answer: Lang,
  translating: boolean,
  pool: readonly string[],
  rng: () => number,
): Exercise {
  const answerTokens = [...sentenceTokens(sentence, answer)];
  const extras = shuffled(
    pool
      .map((id) => getVocab(id)[answer])
      .filter((token) => !answerTokens.some((answerToken) => normalizeToken(answerToken) === normalizeToken(token))),
    rng,
  ).slice(0, 2);
  let tiles = shuffled([...answerTokens, ...extras], rng);
  const alreadySolved =
    tiles.length === answerTokens.length && tiles.every((token, index) => token === answerTokens[index]);
  if (alreadySolved && tiles.length > 1) {
    const [first, second] = tiles;
    tiles = [second as string, first as string, ...tiles.slice(2)];
  }
  return {
    id: "",
    type: "build",
    sentenceId: sentence.id,
    promptLang: prompt,
    answerLang: answer,
    promptText: sentence[prompt],
    showPromptText: translating || answerTokens.length > 5,
    speakText: sentence[answer],
    tiles,
    answerTokens,
    answerText: sentence[answer],
    emoji: sentence.imageIds.map((id) => getVocab(id).emoji).join(""),
  };
}

function matchPairs(items: readonly VocabItem[], direction: Direction, rng: () => number): Exercise {
  const pairs = items.slice(0, 4);
  const translating = direction === "en-es" || direction === "es-en";
  const source: Lang = direction === "es-en" || direction === "es" ? "es" : "en";
  const target: Lang = translating ? (source === "en" ? "es" : "en") : source;
  const left: MatchSide[] = pairs.map((item) =>
    translating ? { pairId: item.id, text: item[source] } : { pairId: item.id, text: "", emoji: item.emoji },
  );
  const right: MatchSide[] = shuffled(pairs, rng).map((item) => ({ pairId: item.id, text: item[target] }));
  return { id: "", type: "match", left, right };
}

/** Core practice for one lesson. Listen, tracing, and speaking are added by later steps. */
export function buildLessonExercises(
  lessonId: string,
  direction: Direction,
  rng: () => number = Math.random,
): Exercise[] {
  const lesson = getLesson(lessonId);
  if (!lesson) return [];
  const lessonIndex = lessonCatalog.findIndex((item) => item.id === lessonId);
  const pool = knownIds(lessonIndex);
  const words = focusItems(lesson, rng);
  const lines = lesson.sentenceIds.map((id) => getSentence(id));
  const { prompt, answer, translating } = langs(direction);
  const steps: Exercise[] = [];

  if (lesson.kind === "sentences") {
    words.slice(0, 2).forEach((word) => steps.push(pictureWord(word, prompt, answer, translating, pool, rng)));
    lines.slice(0, 3).forEach((line) => steps.push(buildSentence(line, prompt, answer, translating, pool, rng)));
    lines.slice(0, 2).forEach((line) => steps.push(typeSentence(line, prompt, answer, translating)));
    if (words.length >= 2) steps.push(matchPairs(words, direction, rng));
  } else if (lesson.kind === "writing") {
    words.slice(0, 3).forEach((word) => steps.push(typeWord(word, prompt, answer, translating)));
    if (lines[0]) steps.push(buildSentence(lines[0], prompt, answer, translating, pool, rng));
    if (lines[1] ?? lines[0]) steps.push(typeSentence((lines[1] ?? lines[0]) as Sentence, prompt, answer, translating));
    words.slice(0, 2).forEach((word) => steps.push(pictureWord(word, prompt, answer, translating, pool, rng)));
  } else {
    words.slice(0, 3).forEach((word) => steps.push(pictureWord(word, prompt, answer, translating, pool, rng)));
    words.slice(0, 2).forEach((word) => steps.push(wordPicture(word, prompt, pool, rng)));
    if (words[0]) steps.push(typeWord(words[0], prompt, answer, translating));
    if (words.length >= 2) steps.push(matchPairs(words, direction, rng));
  }

  return steps.map((step, index) => ({ ...step, id: `${lessonId}-${index}-${step.type}` }));
}
