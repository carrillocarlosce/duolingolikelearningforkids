import type { SpeechSynthPort } from "@/application/ports";
import type { Lang } from "@/domain/language";
import { pickVoice } from "@/infrastructure/speech/pick-voice";

function synthesis(): SpeechSynthesis | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  return window.speechSynthesis;
}

/** Browser text-to-speech. No network service of our own; the device voice does the talking. */
export class WebSpeechSynth implements SpeechSynthPort {
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
    utterance.rate = rate;
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
