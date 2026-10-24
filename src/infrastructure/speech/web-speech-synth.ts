import type { SpeechSynthPort } from "@/application/ports";
import { clampUnit, clampVoiceSpeed, DEFAULT_VOICE_SPEED, DEFAULT_VOICE_VOLUME } from "@/domain/audio-settings";
import type { Lang } from "@/domain/language";
import { pickVoice } from "@/infrastructure/speech/pick-voice";

function synthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  return window.speechSynthesis;
}

/** Browser text-to-speech. No network service of our own; the device voice does the talking. */
export class WebSpeechSynth implements SpeechSynthPort {
  private volume = DEFAULT_VOICE_VOLUME;
  private speed = DEFAULT_VOICE_SPEED;

  setVolume(volume: number): void {
    this.volume = clampUnit(volume, DEFAULT_VOICE_VOLUME);
  }

  setSpeed(speed: number): void {
    this.speed = clampVoiceSpeed(speed);
  }

  speak(text: string, lang: Lang, rate: number): void {
    const synth = synthesis();
    if (!synth || !text.trim()) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(synth.getVoices(), lang);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = lang === "es" ? "es-PE" : "en-US";
    }
    utterance.volume = this.volume;
    utterance.rate = Math.min(1.6, Math.max(0.45, rate * this.speed));
    synth.speak(utterance);
  }

  stop(): void {
    synthesis()?.cancel();
  }

  hasVoice(lang: Lang): boolean {
    const synth = synthesis();
    if (!synth) return false;
    return pickVoice(synth.getVoices(), lang) !== null;
  }
}
