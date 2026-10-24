import type { LessonProgress, Profile } from "@/domain/progress";
import type { Lang } from "@/domain/language";

/**
 * Storage port. IndexedDB is one adapter; tests and private-mode fallback use memory.
 * Domain and application code never import a concrete database.
 */
export interface ProgressRepository {
  getProfile(): Promise<Profile>;
  saveProfile(profile: Profile): Promise<void>;
  getLessonProgress(): Promise<LessonProgress[]>;
  saveLessonProgress(progress: LessonProgress): Promise<void>;
  reset(): Promise<void>;
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
  /** False when IndexedDB could not be opened. Progress lasts for this visit only. */
  persistent: boolean;
}
