import { gradeText, normalizeAnswer } from "@/domain/answers";
import type { Answer, Exercise, Grade, GradeStatus } from "@/domain/exercises";
import { starsForMistakes, xpForStatus, XP_LESSON_BONUS, XP_PERFECT_BONUS } from "@/domain/scoring";

export const TRACE_COVERAGE = 0.72;

/** Spell tiles keep accents. "á" is not the same letter as "a". */
export function spellMatches(given: readonly string[], expected: readonly string[]): boolean {
  if (given.length !== expected.length) return false;
  return given.every((token, index) => token.trim().toLowerCase() === (expected[index] ?? "").trim().toLowerCase());
}

export interface SessionState {
  lessonId: string;
  index: number;
  hearts: number;
  xpEarned: number;
  mistakes: number;
  corrects: number;
  almosts: number;
  phase: "question" | "feedback" | "done";
  outcome: "active" | "complete" | "failed";
  lastGrade: Grade | null;
}

export function startSession(lessonId: string, hearts: number): SessionState {
  return {
    lessonId,
    index: 0,
    hearts,
    xpEarned: 0,
    mistakes: 0,
    corrects: 0,
    almosts: 0,
    phase: "question",
    outcome: "active",
    lastGrade: null,
  };
}

export function gradeExercise(exercise: Exercise, answer: Answer): Grade {
  if (answer.type === "skip") return { status: "skipped" };

  switch (exercise.type) {
    case "picture-word":
    case "listen":
      if (answer.type !== "choice") return { status: "incorrect", canonical: exercise.answerText };
      return answer.choiceId === exercise.itemId
        ? { status: "correct", canonical: exercise.answerText }
        : { status: "incorrect", canonical: exercise.answerText };
    case "word-picture":
      if (answer.type !== "choice") return { status: "incorrect", canonical: exercise.promptText };
      return answer.choiceId === exercise.itemId
        ? { status: "correct", canonical: exercise.promptText }
        : { status: "incorrect", canonical: exercise.promptText };
    case "build":
      if (answer.type !== "tokens") return { status: "incorrect", canonical: exercise.answerText };
      if (tokensMatch(answer.tokens, exercise.answerTokens)) {
        return { status: "correct", canonical: exercise.answerText };
      }
      if (isOrderedSubset(answer.tokens, exercise.answerTokens)) {
        return { status: "almost", canonical: exercise.answerText, incomplete: true };
      }
      return { status: "incorrect", canonical: exercise.answerText };
    case "type":
      if (answer.type !== "text") return { status: "incorrect", canonical: exercise.accepted[0] };
      return gradeTyped(exercise, answer.text);
    case "say":
      if (answer.type !== "speech") return { status: "incorrect", canonical: exercise.accepted[0] };
      if (!answer.transcript.trim()) return { status: "skipped", canonical: exercise.accepted[0] };
      return gradeText(answer.transcript, exercise.accepted);
    case "match":
      if (answer.type !== "match") return { status: "incorrect" };
      return answer.total > 0 && answer.matched === answer.total
        ? { status: "correct" }
        : { status: "incorrect" };
    case "trace":
      if (answer.type !== "trace") return { status: "incorrect", canonical: exercise.word };
      return answer.coverage >= TRACE_COVERAGE
        ? { status: "correct", canonical: exercise.word }
        : { status: "incorrect", canonical: exercise.word };
    case "spell":
      if (answer.type !== "tokens") return { status: "incorrect", canonical: exercise.word };
      return spellMatches(answer.tokens, exercise.letters)
        ? { status: "correct", canonical: exercise.word }
        : { status: "incorrect", canonical: exercise.word };
    default: {
      const never: never = exercise;
      return never;
    }
  }
}

function tokensMatch(given: readonly string[], expected: readonly string[]): boolean {
  if (given.length !== expected.length) return false;
  return given.every((token, index) => normalizeToken(token) === normalizeToken(expected[index] ?? ""));
}

/** True when every given token appears, in order, inside the sentence, and at least one token is still missing. */
function isOrderedSubset(given: readonly string[], expected: readonly string[]): boolean {
  if (given.length === 0 || given.length >= expected.length) return false;
  let cursor = 0;
  for (const token of given) {
    const normalized = normalizeToken(token);
    let found = false;
    while (cursor < expected.length) {
      const candidate = expected[cursor] ?? "";
      cursor += 1;
      if (normalizeToken(candidate) === normalized) {
        found = true;
        break;
      }
    }
    if (!found) return false;
  }
  return true;
}

function gradeTyped(exercise: Extract<Exercise, { type: "type" }>, text: string): Grade {
  const graded = gradeText(text, exercise.accepted);
  const canonical = graded.canonical ?? exercise.accepted[0] ?? "";
  if (exercise.sentenceId && graded.status === "incorrect" && canonical) {
    const given = normalizeAnswer(text).split(" ").filter((token) => token.length > 0);
    const expected = normalizeAnswer(canonical).split(" ").filter((token) => token.length > 0);
    if (isOrderedSubset(given, expected)) {
      return { status: "almost", canonical, incomplete: true };
    }
  }
  return graded;
}

function normalizeToken(token: string): string {
  return token
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function costsHeart(exercise: Exercise, status: GradeStatus): boolean {
  if (status !== "incorrect") return false;
  return exercise.type !== "match" && exercise.type !== "trace";
}

export function submitAnswer(state: SessionState, exercise: Exercise, answer: Answer): SessionState {
  if (state.phase !== "question" || state.outcome !== "active") return state;
  const lastGrade = gradeExercise(exercise, answer);
  const heartLoss = costsHeart(exercise, lastGrade.status) ? 1 : 0;
  const hearts = Math.max(0, state.hearts - heartLoss);
  const failed = heartLoss > 0 && hearts === 0;
  return {
    ...state,
    hearts,
    xpEarned: state.xpEarned + xpForStatus(lastGrade.status),
    mistakes: state.mistakes + (lastGrade.status === "incorrect" ? 1 : 0),
    corrects: state.corrects + (lastGrade.status === "correct" ? 1 : 0),
    almosts: state.almosts + (lastGrade.status === "almost" ? 1 : 0),
    phase: "feedback",
    outcome: failed ? "failed" : "active",
    lastGrade,
  };
}

export function continueSession(state: SessionState, exerciseCount: number): SessionState {
  if (state.phase !== "feedback") return state;
  if (state.outcome === "failed") return state;
  const next = state.index + 1;
  if (next >= exerciseCount) {
    return { ...state, phase: "done", outcome: "complete", lastGrade: null };
  }
  return { ...state, index: next, phase: "question", lastGrade: null };
}

export function completionSummary(state: SessionState): {
  xp: number;
  stars: 1 | 2 | 3;
  perfect: boolean;
} {
  const perfect = state.mistakes === 0;
  const stars = starsForMistakes(state.mistakes);
  const bonus = XP_LESSON_BONUS + (perfect ? XP_PERFECT_BONUS : 0);
  return { xp: state.xpEarned + bonus, stars, perfect };
}
