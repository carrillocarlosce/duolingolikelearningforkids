import type { Lang } from "@/domain/language";

export interface LearnerProfile {
  uiLang: Lang;
}

/**
 * Storage port. IndexedDB is one adapter; tests use an in-memory one.
 * Nothing in domain or application imports a concrete database.
 */
export interface ProgressRepository {
  getCompletedLessonIds(): Promise<string[]>;
  getProfile(): Promise<LearnerProfile>;
}

export interface SpeechSynthPort {
  speak(text: string, lang: Lang, rate: number): void;
  stop(): void;
  hasVoice(lang: Lang): boolean;
}

export interface SpeechRecognitionPort {
  readonly supported: boolean;
  listen(lang: Lang): Promise<string>;
  stop(): void;
}

export interface AppServices {
  progress: ProgressRepository;
  speech: SpeechSynthPort;
  recognition: SpeechRecognitionPort;
}
