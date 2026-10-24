import type { SpeechRecognitionPort, SpeechSynthPort } from "@/application/ports";

/** Placeholder until the Web Speech adapters are wired. */
export class UnavailableSpeechSynth implements SpeechSynthPort {
  speak(): void {}

  stop(): void {}

  hasVoice(): boolean {
    return false;
  }

  setVolume(): void {}

  setSpeed(): void {}
}

export class UnavailableSpeechRecognition implements SpeechRecognitionPort {
  readonly supported = false;

  listen(): Promise<string> {
    return Promise.reject(new Error("Speech recognition is not available on this device."));
  }

  stop(): void {}
}
