import type { AppServices } from "@/application/ports";
import { MemoryProgressRepository } from "@/infrastructure/storage/memory-progress-repository";
import {
  UnavailableSpeechRecognition,
  UnavailableSpeechSynth,
} from "@/infrastructure/speech/unavailable-speech";

export function createAppServices(): AppServices {
  return {
    progress: new MemoryProgressRepository(),
    speech: new UnavailableSpeechSynth(),
    recognition: new UnavailableSpeechRecognition(),
  };
}
