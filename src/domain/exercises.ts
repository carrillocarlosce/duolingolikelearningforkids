import type { Lang } from "@/domain/language";

export interface MatchSide {
  pairId: string;
  text: string;
  emoji?: string;
}

export type Exercise =
  | {
      id: string;
      type: "picture-word";
      itemId: string;
      choiceIds: string[];
      answerLang: Lang;
      promptLang: Lang | null;
      showPromptWord: boolean;
      promptText: string;
      answerText: string;
    }
  | {
      id: string;
      type: "word-picture";
      itemId: string;
      choiceIds: string[];
      promptLang: Lang;
      promptText: string;
    }
  | {
      id: string;
      type: "listen";
      itemId: string;
      choiceIds: string[];
      audioLang: Lang;
      answerLang: Lang;
      audioText: string;
      answerText: string;
    }
  | {
      id: string;
      type: "build";
      sentenceId: string;
      promptLang: Lang;
      answerLang: Lang;
      promptText: string;
      showPromptText: boolean;
      speakText: string;
      tiles: string[];
      answerTokens: string[];
      answerText: string;
      emoji?: string;
    }
  | {
      id: string;
      type: "type";
      /** Language of the sentence or word shown above the box, when it is shown. */
      promptLang: Lang;
      answerLang: Lang;
      promptText: string;
      hidePromptText: boolean;
      speakText: string;
      accepted: string[];
      emoji: string;
    }
  | {
      id: string;
      type: "match";
      left: MatchSide[];
      right: MatchSide[];
    }
  | {
      id: string;
      type: "trace";
      word: string;
      answerLang: Lang;
      emoji: string;
    }
  | {
      id: string;
      type: "say";
      promptText: string;
      audioText: string;
      answerLang: Lang;
      accepted: string[];
      emoji: string;
    };

export type Answer =
  | { type: "choice"; choiceId: string }
  | { type: "tokens"; tokens: string[] }
  | { type: "text"; text: string }
  | { type: "match"; matched: number; total: number }
  | { type: "trace"; coverage: number }
  | { type: "speech"; transcript: string }
  | { type: "skip" };

export type GradeStatus = "correct" | "almost" | "incorrect" | "skipped";

export interface Grade {
  status: GradeStatus;
  /** The form we show after an almost or a miss. */
  canonical?: string;
}

/**
 * Language the child must write, build, trace, or say.
 * Choice exercises (picture, listen, match) return null even when they store an answer language for the options.
 */
export function answerLanguage(exercise: Exercise): Lang | null {
  switch (exercise.type) {
    case "type":
    case "build":
    case "trace":
    case "say":
      return exercise.answerLang;
    case "picture-word":
    case "word-picture":
    case "listen":
    case "match":
      return null;
    default: {
      const unexpected: never = exercise;
      void unexpected;
      return null;
    }
  }
}
