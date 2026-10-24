import type { SoundEffect, SoundEffectsPort } from "@/application/ports";
import { clampUnit, DEFAULT_EFFECTS_VOLUME } from "@/domain/audio-settings";

/**
 * Effects sit under the voice. The bus is louder than the first version,
 * so the duck is deeper and speech still wins on a tablet speaker.
 */
export const SPEECH_DUCK = 0.12;

/** Brings a single chime up after the limiter, without pushing a chord back into clipping. */
export const MAKEUP_GAIN = 1.55;

type AudioContextCtor = typeof AudioContext;

function browserContext(): AudioContext {
  const host = window as Window & { webkitAudioContext?: AudioContextCtor };
  const Ctor = window.AudioContext ?? host.webkitAudioContext;
  if (!Ctor) throw new Error("Web Audio is not available");
  return new Ctor();
}

function speechIsActive(): boolean {
  try {
    return typeof window !== "undefined" && !!window.speechSynthesis?.speaking;
  } catch {
    return false;
  }
}

/**
 * Kid-friendly effects synthesized in the browser. No samples and no network.
 * The master gain drops while speechSynthesis is speaking so a chime does not cover a word.
 */
export class WebAudioEffects implements SoundEffectsPort {
  private ctx: AudioContext | null = null;
  /** Notes sum here. This is the parent-facing effects slider. */
  private effects: GainNode | null = null;
  /** Mute and speech duck, after the limiter and makeup. */
  private output: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private enabledFlag = true;
  private volume = DEFAULT_EFFECTS_VOLUME;
  private level = 1;
  private previewUntil = 0;
  private lastPreview = -10_000;
  private gestureKick: (() => void) | null = null;
  private speechWatch: number | null = null;
  private readonly lastPlayed = new Map<SoundEffect, number>();

  constructor(
    private readonly createContext: () => AudioContext = browserContext,
    private readonly speaking: () => boolean = speechIsActive,
  ) {
    this.listenForGesture();
  }

  unlock(): void {
    const ctx = this.context();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx.resume().then(() => this.dropGesture());
      return;
    }
    this.dropGesture();
  }

  setEnabled(enabled: boolean): void {
    this.enabledFlag = enabled;
    this.applyLevel();
  }

  setVolume(volume: number): void {
    this.volume = clampUnit(volume, DEFAULT_EFFECTS_VOLUME);
    if (!this.ctx || !this.effects) return;
    this.effects.gain.setValueAtTime(this.volume, this.ctx.currentTime);
  }

  play(effect: SoundEffect): void {
    this.start(effect, false);
  }

  preview(effect: SoundEffect): void {
    const nowMs = typeof performance !== "undefined" ? performance.now() : 0;
    if (nowMs - this.lastPreview < 350) return;
    this.lastPreview = nowMs;
    this.previewUntil = nowMs + 900;
    this.start(effect, true);
    if (typeof window !== "undefined" && typeof window.setTimeout === "function") {
      window.setTimeout(() => {
        if ((typeof performance !== "undefined" ? performance.now() : 0) >= this.previewUntil) this.applyLevel();
      }, 950);
    }
  }

  private start(effect: SoundEffect, force: boolean): void {
    if (!this.enabledFlag && !force) return;
    const ctx = this.context();
    if (!ctx || !this.effects) return;
    if (ctx.state === "suspended") void ctx.resume().then(() => this.dropGesture());
    const now = ctx.currentTime;
    if (!this.allow(effect, now)) return;
    this.applyLevel();
    this.voice(effect, ctx, now);
  }

  private allow(effect: SoundEffect, audioNow: number): boolean {
    const gap =
      effect === "fanfare" ? 1.15 : effect === "sparkle" || effect === "unlock" ? 0.35 : effect === "heart" ? 0.22 : 0.045;
    // currentTime stays at 0 until the context is running, which would swallow every later tap on Android.
    const now = typeof performance !== "undefined" ? performance.now() / 1000 : audioNow;
    const previous = this.lastPlayed.get(effect) ?? -10;
    if (now - previous < gap) return false;
    this.lastPlayed.set(effect, now);
    return true;
  }

  private previewing(): boolean {
    return typeof performance !== "undefined" && performance.now() < this.previewUntil;
  }

  private applyLevel(): void {
    if (!this.ctx || !this.output) return;
    const audible = this.enabledFlag || this.previewing();
    const level = audible ? (this.speaking() && !this.previewing() ? SPEECH_DUCK : 1) : 0;
    if (level === this.level) return;
    this.level = level;
    this.output.gain.setValueAtTime(level, this.ctx.currentTime);
  }

  private context(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const ctx = this.createContext();
      const output = ctx.createGain();
      this.level = this.enabledFlag ? 1 : 0;
      output.gain.value = this.level;

      const effects = ctx.createGain();
      effects.gain.value = this.volume;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -8;
      compressor.knee.value = 12;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.008;
      compressor.release.value = 0.2;

      const makeup = ctx.createGain();
      makeup.gain.value = MAKEUP_GAIN;

      effects.connect(compressor);
      compressor.connect(makeup);
      makeup.connect(output);
      output.connect(ctx.destination);

      this.ctx = ctx;
      this.output = output;
      this.effects = effects;
      this.noise = this.makeNoise(ctx);
      this.followSpeech();
      return ctx;
    } catch {
      return null;
    }
  }

  /** Keep the master gain matched to speech even after a note has already started. */
  private followSpeech(): void {
    if (this.speechWatch !== null) return;
    if (typeof window === "undefined" || typeof window.setInterval !== "function") return;
    this.speechWatch = window.setInterval(() => this.applyLevel(), 100);
  }

  private listenForGesture(): void {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
    const kick = () => this.unlock();
    this.gestureKick = kick;
    window.addEventListener("pointerdown", kick, true);
    window.addEventListener("keydown", kick, true);
  }

  private dropGesture(): void {
    if (!this.gestureKick || typeof window === "undefined" || this.ctx?.state !== "running") return;
    window.removeEventListener("pointerdown", this.gestureKick, true);
    window.removeEventListener("keydown", this.gestureKick, true);
    this.gestureKick = null;
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const length = Math.max(1, Math.floor(ctx.sampleRate * 0.2));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    return buffer;
  }

  private tone(
    ctx: AudioContext,
    when: number,
    frequency: number,
    duration: number,
    type: OscillatorType,
    amount: number,
  ): void {
    if (!this.effects) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, when);
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(amount, when + 0.015);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(amp);
    amp.connect(this.effects);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }

  private puff(ctx: AudioContext, when: number, duration: number, amount: number, cutoff: number): void {
    if (!this.effects || !this.noise) return;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, when);
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, when);
    amp.gain.exponentialRampToValueAtTime(amount, when + 0.008);
    amp.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter);
    filter.connect(amp);
    amp.connect(this.effects);
    source.start(when);
    source.stop(when + duration + 0.02);
  }

  private voice(effect: SoundEffect, ctx: AudioContext, now: number): void {
    switch (effect) {
      case "tap":
        this.puff(ctx, now, 0.05, 0.22, 900);
        this.tone(ctx, now, 620, 0.07, "sine", 0.55);
        return;
      case "select":
        this.tone(ctx, now, 784, 0.12, "triangle", 0.72);
        return;
      case "button":
        this.tone(ctx, now, 660, 0.09, "sine", 0.7);
        return;
      case "correct":
        this.tone(ctx, now, 523.25, 0.2, "sine", 0.82);
        this.tone(ctx, now + 0.09, 659.25, 0.2, "sine", 0.74);
        this.tone(ctx, now + 0.18, 783.99, 0.26, "sine", 0.66);
        return;
      case "wrong":
        this.tone(ctx, now, 196, 0.22, "triangle", 0.36);
        this.tone(ctx, now, 208, 0.22, "triangle", 0.3);
        this.puff(ctx, now, 0.14, 0.16, 280);
        return;
      case "heart":
        this.tone(ctx, now, 494, 0.16, "sine", 0.5);
        this.tone(ctx, now + 0.12, 370, 0.22, "sine", 0.42);
        return;
      case "sparkle":
        [784, 988, 1175, 1319].forEach((frequency, index) => {
          this.tone(ctx, now + index * 0.07, frequency, 0.12, "sine", 0.38);
        });
        return;
      case "xp":
        this.tone(ctx, now, 1175, 0.07, "sine", 0.48);
        return;
      case "unlock":
        [392, 523.25, 659.25, 784].forEach((frequency, index) => {
          this.tone(ctx, now + index * 0.11, frequency, 0.2, "triangle", 0.62);
        });
        return;
      case "fanfare":
        [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
          this.tone(ctx, now + index * 0.16, frequency, 0.36, "triangle", 0.7);
        });
        this.tone(ctx, now + 0.62, 783.99, 0.4, "sine", 0.4);
        return;
      default: {
        const never: never = effect;
        return never;
      }
    }
  }
}
