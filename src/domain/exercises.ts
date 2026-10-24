import type { SentenceScene } from "@/domain/content/sentences";
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
      /** Set when this picture is the food inside a sentence, not a bare "what is this?". */
      sentenceId?: string;
      scene?: SentenceScene;
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
      sentenceId?: string;
      /** Frame such as "I like ___" so the heard sentence is not just a food word. */
      clozeText?: string;
      scene?: SentenceScene;
    }
  | {
      id: string;
      type: "build";
      sentenceId: string;
      promptLang: Lang;
      answerLang: Lang;
      /** Sentence in the other language. This is the model, never the answer text. */
      sourceLang: Lang;
      sourceText: string;
      promptText: string;
      showPromptText: boolean;
      /** Target sentence read aloud in the answer language. */
      speakText: string;
      tiles: string[];
      answerTokens: string[];
      answerText: string;
      scene: SentenceScene;
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
      sentenceId?: string;
      sourceLang?: Lang;
      sourceText?: string;
      scene?: SentenceScene;
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
      sentenceId?: string;
      sourceLang?: Lang;
      sourceText?: string;
      scene?: SentenceScene;
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
  /** The answer is a correct piece of the sentence, not the whole sentence. */
  incomplete?: boolean;
}

/** Sentence the child is building, typing, or saying, with its translation and spoken form. */
export function sentenceSource(exercise: Exercise): {
  sentenceId: string;
  sourceLang: Lang;
  sourceText: string;
  speakText: string;
  scene: SentenceScene;
} | null {
  if (exercise.type === "build") {
    return {
      sentenceId: exercise.sentenceId,
      sourceLang: exercise.sourceLang,
      sourceText: exercise.sourceText,
      speakText: exercise.speakText,
      scene: exercise.scene,
    };
  }
  if ((exercise.type === "type" || exercise.type === "say") && exercise.sentenceId && exercise.sourceLang && exercise.sourceText && exercise.scene) {
    return {
      sentenceId: exercise.sentenceId,
      sourceLang: exercise.sourceLang,
      sourceText: exercise.sourceText,
      speakText: exercise.type === "say" ? exercise.audioText : exercise.speakText,
      scene: exercise.scene,
    };
  }
  return null;
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
