import type { AppServices, ProgressRepository } from "@/application/ports";
import { freshProfile } from "@/domain/progress";
import { localISODate } from "@/infrastructure/clock";
import {
  UnavailableSpeechRecognition,
  UnavailableSpeechSynth,
} from "@/infrastructure/speech/unavailable-speech";
import { IndexedDbProgressRepository } from "@/infrastructure/storage/indexed-db-progress-repository";
import { MemoryProgressRepository } from "@/infrastructure/storage/memory-progress-repository";

export function todayIsoDate(): string {
  return localISODate();
}

export async function openProgressRepository(): Promise<{
  repo: ProgressRepository;
  persistent: boolean;
}> {
  if (typeof indexedDB === "undefined") {
    return { repo: new MemoryProgressRepository(freshProfile(localISODate())), persistent: false };
  }
  try {
    const repo = new IndexedDbProgressRepository();
    await repo.getProfile();
    return { repo, persistent: true };
  } catch {
    return { repo: new MemoryProgressRepository(freshProfile(localISODate())), persistent: false };
  }
}

export async function createAppServices(): Promise<AppServices> {
  const progress = await openProgressRepository();
  return {
    progress: progress.repo,
    persistent: progress.persistent,
    speech: new UnavailableSpeechSynth(),
    recognition: new UnavailableSpeechRecognition(),
  };
}
