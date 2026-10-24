import { normalizeAnswer } from "@/domain/answers";
import { getSentence, scenePreview, sentences } from "@/domain/content/sentences";
import { acceptedForms, getVocab, vocabulary } from "@/domain/content/vocabulary";
import type { Exercise, GradeStatus } from "@/domain/exercises";
import type { Lang } from "@/domain/language";

export type ReviewKind = "word" | "sentence";

export interface ReviewPick {
  kind: ReviewKind;
  id: string;
}

/** One word or sentence the child has practiced. `due` is the next local day it should return. */
export interface ReviewRecord {
  id: string;
  kind: ReviewKind;
  wrongs: number;
  correctStreak: number;
  lastSeen: string;
  due: string;
}

export interface ReviewCard {
  id: string;
  emoji: string;
  en: string;
  es: string;
}

export const REVIEW_LIMIT = 5;

const GAPS = [1, 3, 7] as const;

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isDay(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function whole(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function known(kind: ReviewKind, id: string): boolean {
  if (kind === "word") return vocabulary.some((item) => item.id === id);
  return sentences.some((item) => item.id === id);
}

function wordId(text: string, lang: Lang): string | undefined {
  const normalized = normalizeAnswer(text);
  return vocabulary.find((item) =>
    acceptedForms(item, lang).some((form) => normalizeAnswer(form) === normalized),
  )?.id;
}

/** Drop broken rows. Unknown ids are ignored so an old tablet does not revive a removed word. */
export function readReviews(value: unknown): ReviewRecord[] {
  if (!Array.isArray(value)) return [];
  const byKey = new Map<string, ReviewRecord>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Partial<ReviewRecord>;
    if (row.kind !== "word" && row.kind !== "sentence") continue;
    if (typeof row.id !== "string" || !known(row.kind, row.id)) continue;
    const wrongs = whole(row.wrongs);
    const correctStreak = whole(row.correctStreak);
    if (wrongs === null || correctStreak === null || !isDay(row.lastSeen) || !isDay(row.due)) continue;
    byKey.set(`${row.kind}:${row.id}`, {
      id: row.id,
      kind: row.kind,
      wrongs,
      correctStreak,
      lastSeen: row.lastSeen,
      due: row.due,
    });
  }
  return [...byKey.values()];
}

function gapFor(correctStreak: number): number {
  return GAPS[Math.min(Math.max(correctStreak, 1), GAPS.length) - 1] ?? 7;
}

/** A miss is due again today. A hit waits 1 day, then 3, then 7. */
export function applyReviewResult(
  records: readonly ReviewRecord[],
  pick: ReviewPick,
  result: "correct" | "incorrect",
  today: string,
): ReviewRecord[] {
  const current = records.find((record) => record.kind === pick.kind && record.id === pick.id);
  const next: ReviewRecord =
    result === "incorrect"
      ? {
          id: pick.id,
          kind: pick.kind,
          wrongs: (current?.wrongs ?? 0) + 1,
          correctStreak: 0,
          lastSeen: today,
          due: today,
        }
      : {
          id: pick.id,
          kind: pick.kind,
          wrongs: current?.wrongs ?? 0,
          correctStreak: (current?.correctStreak ?? 0) + 1,
          lastSeen: today,
          due: addDays(today, gapFor((current?.correctStreak ?? 0) + 1)),
        };
  return [...records.filter((record) => record.kind !== pick.kind || record.id !== pick.id), next];
}

/**
 * Words and sentences that are due: never seen, answered wrong, or last practiced long enough ago.
 * Misses come first. At most five, so the daily round stays short.
 */
export function dueReviewItems(records: readonly ReviewRecord[], today: string): ReviewPick[] {
  const saved = new Map(records.map((record) => [`${record.kind}:${record.id}`, record]));
  const candidates = [
    ...vocabulary.map((item) => ({ kind: "word" as const, id: item.id })),
    ...sentences.map((item) => ({ kind: "sentence" as const, id: item.id })),
  ].map((pick) => {
    const record = saved.get(`${pick.kind}:${pick.id}`);
    return {
      pick,
      wrongs: record?.wrongs ?? 0,
      unseen: !record,
      lastSeen: record?.lastSeen ?? "",
      due: !record || record.due <= today,
    };
  });
  return candidates
    .filter((item) => item.due)
    .sort((a, b) => b.wrongs - a.wrongs || Number(b.unseen) - Number(a.unseen) || a.lastSeen.localeCompare(b.lastSeen))
    .slice(0, REVIEW_LIMIT)
    .map((item) => item.pick);
}

export function reviewCards(picks: readonly ReviewPick[]): ReviewCard[] {
  return picks.map((pick) => {
    if (pick.kind === "word") {
      const item = getVocab(pick.id);
      return { id: item.id, emoji: item.emoji, en: item.en, es: item.es };
    }
    const sentence = getSentence(pick.id);
    return { id: sentence.id, emoji: scenePreview(sentence.scene), en: sentence.en, es: sentence.es };
  });
}

/** The word or sentence this exercise was about. Matching is skipped. */
export function reviewTarget(exercise: Exercise): ReviewPick | null {
  if ("sentenceId" in exercise && exercise.sentenceId) {
    return sentences.some((item) => item.id === exercise.sentenceId)
      ? { kind: "sentence", id: exercise.sentenceId }
      : null;
  }
  if ("itemId" in exercise && exercise.itemId) {
    return vocabulary.some((item) => item.id === exercise.itemId) ? { kind: "word", id: exercise.itemId } : null;
  }
  if (exercise.type === "trace" || exercise.type === "spell") {
    const id = wordId(exercise.word, exercise.answerLang);
    return id ? { kind: "word", id } : null;
  }
  if (exercise.type === "type") {
    const id = wordId(exercise.accepted[0] ?? "", exercise.answerLang);
    return id ? { kind: "word", id } : null;
  }
  if (exercise.type === "say") {
    const id = wordId(exercise.promptText, exercise.answerLang);
    return id ? { kind: "word", id } : null;
  }
  return null;
}

/** Update the schedule from one graded exercise. Skips and unrelated screens leave the same list. */
export function scheduleFromGrade(
  records: readonly ReviewRecord[],
  exercise: Exercise,
  status: GradeStatus,
  today: string,
): readonly ReviewRecord[] {
  if (status !== "correct" && status !== "almost" && status !== "incorrect") return records;
  const target = reviewTarget(exercise);
  if (!target) return records;
  return applyReviewResult(records, target, status === "incorrect" ? "incorrect" : "correct", today);
}
