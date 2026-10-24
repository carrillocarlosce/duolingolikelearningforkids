import type { LocalizedText } from "@/domain/language";

export type LessonKind = "vocab" | "sentences" | "writing" | "review";

/** One focused step. When it is missing, the lesson keeps the mixed round for its kind. */
export type LessonSkill = "recognize" | "listen" | "spell" | "write" | "sentence" | "checkpoint";

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

export interface LessonSummary {
  id: string;
  emoji: string;
  title: LocalizedText;
  blurb: LocalizedText;
  kind: LessonKind;
  vocabIds: readonly string[];
  sentenceIds: readonly string[];
  skill?: LessonSkill;
}

/** One school unit. Lesson ids are the progress keys stored on the tablet. */
export interface Unit {
  id: string;
  title: LocalizedText;
  vocabulary: readonly VocabItem[];
  sentences: readonly Sentence[];
  lessons: readonly LessonSummary[];
}

const lessonKinds: readonly LessonKind[] = ["vocab", "sentences", "writing", "review"];
const lessonSkills: readonly LessonSkill[] = ["recognize", "listen", "spell", "write", "sentence", "checkpoint"];
const mascots = ["like", "want", "shop"] as const;

function fail(path: string, message: string): never {
  throw new Error(`${path}: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") fail(path, "expected non-empty text");
  return value;
}

function readId(value: unknown, path: string): string {
  const id = readText(value, path);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    fail(path, "use lowercase letters, numbers, and hyphens");
  }
  return id;
}

function readLocalized(value: unknown, path: string): LocalizedText {
  if (!isRecord(value)) fail(path, "expected { en, es }");
  return { en: readText(value.en, `${path}.en`), es: readText(value.es, `${path}.es`) };
}

function readStringList(value: unknown, path: string): string[] {
  if (!Array.isArray(value)) fail(path, "expected a list of strings");
  return value.map((item, index) => readText(item, `${path}[${index}]`));
}

function readOptionalStrings(value: unknown, path: string): string[] | undefined {
  if (value === undefined) return undefined;
  return readStringList(value, path);
}

function uniqueIds(ids: readonly string[], path: string) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) fail(path, `duplicate id "${id}"`);
    seen.add(id);
  }
}

/**
 * Turn one unit file into a Unit, or throw an Error whose message names the field.
 * Called when the registry loads, so a bad file fails tests and the app.
 */
export function parseUnit(value: unknown): Unit {
  if (!isRecord(value)) fail("unit", "expected an object");
  const id = readId(value.id, "unit.id");
  const title = readLocalized(value.title, "unit.title");
  const vocabulary = readVocabulary(value.vocabulary, "unit.vocabulary");
  const wordIds = new Set(vocabulary.map((item) => item.id));
  const sentences = readSentences(value.sentences, wordIds, "unit.sentences");
  const sentenceIds = new Set(sentences.map((item) => item.id));
  const lessons = readLessons(value.lessons, wordIds, sentenceIds, "unit.lessons");
  return { id, title, vocabulary, sentences, lessons };
}

function readVocabulary(value: unknown, path: string): VocabItem[] {
  if (!Array.isArray(value) || value.length === 0) fail(path, "expected at least one word");
  const items = value.map((item, index) => readVocabItem(item, `${path}[${index}]`));
  uniqueIds(items.map((item) => item.id), path);
  return items;
}

function readVocabItem(value: unknown, path: string): VocabItem {
  if (!isRecord(value)) fail(path, "expected a word");
  if (typeof value.healthy !== "boolean") fail(`${path}.healthy`, "expected true or false");
  const item: VocabItem = {
    id: readId(value.id, `${path}.id`),
    en: readText(value.en, `${path}.en`),
    es: readText(value.es, `${path}.es`),
    emoji: readText(value.emoji, `${path}.emoji`),
    healthy: value.healthy,
  };
  const enAlternates = readOptionalStrings(value.enAlternates, `${path}.enAlternates`);
  const esAlternates = readOptionalStrings(value.esAlternates, `${path}.esAlternates`);
  if (enAlternates) item.enAlternates = enAlternates;
  if (esAlternates) item.esAlternates = esAlternates;
  return item;
}

function readSentences(value: unknown, wordIds: ReadonlySet<string>, path: string): Sentence[] {
  if (!Array.isArray(value)) fail(path, "expected a list of sentences");
  const items = value.map((item, index) => readSentence(item, wordIds, `${path}[${index}]`));
  uniqueIds(items.map((item) => item.id), path);
  return items;
}

function readSentence(value: unknown, wordIds: ReadonlySet<string>, path: string): Sentence {
  if (!isRecord(value)) fail(path, "expected a sentence");
  const en = readText(value.en, `${path}.en`);
  const es = readText(value.es, `${path}.es`);
  const enTokens = readStringList(value.enTokens, `${path}.enTokens`);
  const esTokens = readStringList(value.esTokens, `${path}.esTokens`);
  if (enTokens.join(" ") !== en) fail(`${path}.enTokens`, "must join with spaces into the English sentence");
  if (esTokens.join(" ") !== es) fail(`${path}.esTokens`, "must join with spaces into the Spanish sentence");
  const imageIds = readStringList(value.imageIds, `${path}.imageIds`);
  if (imageIds.length === 0) fail(`${path}.imageIds`, "expected at least one word id");
  for (const imageId of imageIds) {
    if (!wordIds.has(imageId)) fail(`${path}.imageIds`, `unknown word "${imageId}"`);
  }
  const sentence: Sentence = {
    id: readId(value.id, `${path}.id`),
    en,
    es,
    enTokens,
    esTokens,
    imageIds,
    scene: readScene(value.scene, path),
  };
  const enAlternates = readOptionalStrings(value.enAlternates, `${path}.enAlternates`);
  const esAlternates = readOptionalStrings(value.esAlternates, `${path}.esAlternates`);
  if (enAlternates) sentence.enAlternates = enAlternates;
  if (esAlternates) sentence.esAlternates = esAlternates;
  if (value.cloze !== undefined) sentence.cloze = readLocalized(value.cloze, `${path}.cloze`);
  return sentence;
}

function readScene(value: unknown, sentencePath: string): SentenceScene {
  const path = `${sentencePath}.scene`;
  if (!isRecord(value)) fail(path, "expected a scene");
  const emojis = readStringList(value.emojis, `${path}.emojis`);
  const scene: SentenceScene = { emojis };
  if (value.mascot !== undefined) {
    if (typeof value.mascot !== "string" || !mascots.includes(value.mascot as (typeof mascots)[number])) {
      fail(`${path}.mascot`, 'expected "like", "want", or "shop"');
    }
    scene.mascot = value.mascot as SentenceScene["mascot"];
  }
  if (emojis.length === 0 && !scene.mascot) fail(path, "needs an emoji or a mascot");
  return scene;
}

function readLessons(
  value: unknown,
  wordIds: ReadonlySet<string>,
  sentenceIds: ReadonlySet<string>,
  path: string,
): LessonSummary[] {
  if (!Array.isArray(value) || value.length === 0) fail(path, "expected at least one lesson");
  const items = value.map((item, index) => readLesson(item, wordIds, sentenceIds, `${path}[${index}]`));
  uniqueIds(items.map((item) => item.id), path);
  return items;
}

function readLesson(
  value: unknown,
  wordIds: ReadonlySet<string>,
  sentenceIds: ReadonlySet<string>,
  path: string,
): LessonSummary {
  if (!isRecord(value)) fail(path, "expected a lesson");
  if (typeof value.kind !== "string" || !lessonKinds.includes(value.kind as LessonKind)) {
    fail(`${path}.kind`, 'expected "vocab", "sentences", "writing", or "review"');
  }
  const vocabIds = readStringList(value.vocabIds, `${path}.vocabIds`);
  const lessonSentenceIds = readStringList(value.sentenceIds, `${path}.sentenceIds`);
  for (const wordId of vocabIds) {
    if (!wordIds.has(wordId)) fail(`${path}.vocabIds`, `unknown word "${wordId}"`);
  }
  for (const sentenceId of lessonSentenceIds) {
    if (!sentenceIds.has(sentenceId)) fail(`${path}.sentenceIds`, `unknown sentence "${sentenceId}"`);
  }
  const lesson: LessonSummary = {
    id: readId(value.id, `${path}.id`),
    emoji: readText(value.emoji, `${path}.emoji`),
    title: readLocalized(value.title, `${path}.title`),
    blurb: readLocalized(value.blurb, `${path}.blurb`),
    kind: value.kind as LessonKind,
    vocabIds,
    sentenceIds: lessonSentenceIds,
  };
  if (value.skill !== undefined) {
    if (typeof value.skill !== "string" || !lessonSkills.includes(value.skill as LessonSkill)) {
      fail(`${path}.skill`, 'expected "recognize", "listen", "spell", "write", "sentence", or "checkpoint"');
    }
    lesson.skill = value.skill as LessonSkill;
  }
  return lesson;
}
