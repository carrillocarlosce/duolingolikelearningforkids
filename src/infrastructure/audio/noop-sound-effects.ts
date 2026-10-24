import type { SoundEffect, SoundEffectsPort } from "@/application/ports";
import { clampUnit, DEFAULT_EFFECTS_VOLUME } from "@/domain/audio-settings";

/** Silent stand-in for tests and for browsers without Web Audio. */
export class NoopSoundEffects implements SoundEffectsPort {
  enabled = true;
  volume = DEFAULT_EFFECTS_VOLUME;

  unlock(): void {}

  play(effect: SoundEffect): void {
    void effect;
  }

  preview(effect: SoundEffect): void {
    this.play(effect);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setVolume(volume: number): void {
    this.volume = clampUnit(volume, DEFAULT_EFFECTS_VOLUME);
  }
}
