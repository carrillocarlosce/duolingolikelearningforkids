import type { Lang } from "@/domain/language";

export interface VoiceInfo {
  lang: string;
  name?: string;
}

/**
 * Prefer a Peruvian or other Latin American Spanish voice, then any Spanish.
 * English prefers US, then British, then any English voice.
 */
export function pickVoice<T extends VoiceInfo>(voices: readonly T[], lang: Lang): T | null {
  let best: T | null = null;
  let bestScore = 0;
  for (const voice of voices) {
    const score = voiceScore(voice.lang, lang);
    if (score > bestScore) {
      best = voice;
      bestScore = score;
    }
  }
  return best;
}

function voiceScore(voiceLang: string, lang: Lang): number {
  const value = voiceLang.toLowerCase();
  if (lang === "es") {
    if (value.startsWith("es-pe")) return 100;
    if (value.startsWith("es-419")) return 90;
    if (value.startsWith("es-mx") || value.startsWith("es-us")) return 80;
    if (value.startsWith("es-")) return 60;
    if (value === "es") return 50;
    return 0;
  }
  if (value.startsWith("en-us")) return 100;
  if (value.startsWith("en-gb")) return 80;
  if (value.startsWith("en")) return 50;
  return 0;
}
