import type { SoundEffect, SoundEffectsPort } from "@/application/ports";

/** Silent stand-in for tests and for browsers without Web Audio. */
export class NoopSoundEffects implements SoundEffectsPort {
  enabled = true;

  unlock(): void {}

  play(effect: SoundEffect): void {
    void effect;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}
