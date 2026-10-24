/** Saved levels for effects and the tablet voice. 1 is the top of each slider. */
export interface AudioLevels {
  sound: boolean;
  /** 0–1. The default is already loud enough for a tablet speaker. */
  effectsVolume: number;
  /** 0–1. Web Speech cannot go above 1. */
  voiceVolume: number;
  /** Multiplier on the lesson rates. 1 keeps the normal and slow buttons as they are. */
  voiceSpeed: number;
}

export const DEFAULT_EFFECTS_VOLUME = 0.8;
export const DEFAULT_VOICE_VOLUME = 1;
export const DEFAULT_VOICE_SPEED = 1;
export const MIN_VOICE_SPEED = 0.8;
export const MAX_VOICE_SPEED = 1.2;

export const DEFAULT_AUDIO_LEVELS: AudioLevels = {
  sound: true,
  effectsVolume: DEFAULT_EFFECTS_VOLUME,
  voiceVolume: DEFAULT_VOICE_VOLUME,
  voiceSpeed: DEFAULT_VOICE_SPEED,
};

export function clampUnit(value: unknown, fallback: number): number {
  const number = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(number)) return fallback;
  return Math.min(1, Math.max(0, number));
}

export function clampVoiceSpeed(value: unknown): number {
  const number = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(number)) return DEFAULT_VOICE_SPEED;
  return Math.min(MAX_VOICE_SPEED, Math.max(MIN_VOICE_SPEED, number));
}

/** Fill missing levels and pull out-of-range numbers back into the slider limits. */
export function readAudioLevels(input: unknown): AudioLevels {
  const raw = input && typeof input === "object" ? (input as Partial<AudioLevels>) : {};
  return {
    sound: typeof raw.sound === "boolean" ? raw.sound : DEFAULT_AUDIO_LEVELS.sound,
    effectsVolume: clampUnit(raw.effectsVolume, DEFAULT_EFFECTS_VOLUME),
    voiceVolume: clampUnit(raw.voiceVolume, DEFAULT_VOICE_VOLUME),
    voiceSpeed: clampVoiceSpeed(raw.voiceSpeed),
  };
}
