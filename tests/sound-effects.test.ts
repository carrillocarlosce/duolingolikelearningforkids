import { describe, expect, it, vi } from "vitest";
import { DEFAULT_EFFECTS_VOLUME } from "@/domain/audio-settings";
import { NoopSoundEffects } from "@/infrastructure/audio/noop-sound-effects";
import { MAKEUP_GAIN, SPEECH_DUCK, WebAudioEffects } from "@/infrastructure/audio/web-audio-effects";

class FakeParam {
  peak = 0;
  private current = 0;
  get value(): number {
    return this.current;
  }
  set value(next: number) {
    this.current = next;
    if (next > this.peak) this.peak = next;
  }
  setValueAtTime(value: number): void {
    this.value = value;
  }
  exponentialRampToValueAtTime(value: number): void {
    this.value = value;
  }
}

class FakeNode {
  connect(): this {
    return this;
  }
}

class FakeGain extends FakeNode {
  gain = new FakeParam();
}

class FakeOsc extends FakeNode {
  type: OscillatorType = "sine";
  frequency = new FakeParam();
  started = 0;
  start(): void {
    this.started += 1;
  }
  stop(): void {}
}

class FakeSource extends FakeNode {
  buffer: AudioBuffer | null = null;
  started = 0;
  start(): void {
    this.started += 1;
  }
  stop(): void {}
}

class FakeFilter extends FakeNode {
  type = "lowpass";
  frequency = new FakeParam();
}

class FakeCompressor extends FakeNode {
  threshold = new FakeParam();
  knee = new FakeParam();
  ratio = new FakeParam();
  attack = new FakeParam();
  release = new FakeParam();
}

class FakeContext {
  currentTime = 0;
  sampleRate = 8000;
  state: AudioContextState = "suspended";
  destination = {};
  resumes = 0;
  oscillators: FakeOsc[] = [];
  gains: FakeGain[] = [];
  compressors: FakeCompressor[] = [];

  resume(): Promise<void> {
    this.resumes += 1;
    this.state = "running";
    return Promise.resolve();
  }

  createGain(): FakeGain {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }

  createOscillator(): FakeOsc {
    const osc = new FakeOsc();
    this.oscillators.push(osc);
    return osc;
  }

  createBuffer(_channels: number, length: number): AudioBuffer {
    const data = new Float32Array(length);
    return {
      duration: length / this.sampleRate,
      length,
      numberOfChannels: 1,
      sampleRate: this.sampleRate,
      getChannelData: () => data,
      copyFromChannel: () => undefined,
      copyToChannel: () => undefined,
    };
  }

  createBufferSource(): FakeSource {
    return new FakeSource();
  }

  createBiquadFilter(): FakeFilter {
    return new FakeFilter();
  }

  createDynamicsCompressor(): FakeCompressor {
    const compressor = new FakeCompressor();
    this.compressors.push(compressor);
    return compressor;
  }
}

describe("sound effects", () => {
  it("stays silent in the no-op adapter", () => {
    const sound = new NoopSoundEffects();
    expect(() => {
      sound.unlock();
      sound.play("fanfare");
      sound.preview("correct");
      sound.setEnabled(false);
      sound.setVolume(4);
      sound.play("correct");
    }).not.toThrow();
    expect(sound.enabled).toBe(false);
    expect(sound.volume).toBe(1);
  });

  it("synthesizes a chime only while sound is on, and ducks it under speech", () => {
    const ctx = new FakeContext();
    const speaking = vi.fn(() => false);
    const sound = new WebAudioEffects(() => ctx as unknown as AudioContext, speaking);

    sound.play("correct");
    expect(ctx.oscillators.length).toBeGreaterThan(0);
    expect(ctx.resumes).toBe(1);
    expect(ctx.gains[0]?.gain.value).toBe(1);

    const started = ctx.oscillators.length;
    sound.setEnabled(false);
    sound.play("fanfare");
    expect(ctx.oscillators.length).toBe(started);
    expect(ctx.gains[0]?.gain.value).toBe(0);

    sound.setEnabled(true);
    speaking.mockReturnValue(true);
    sound.play("button");
    expect(ctx.gains[0]?.gain.value).toBe(SPEECH_DUCK);
    expect(ctx.oscillators.length).toBeGreaterThan(started);
  });

  it("ducks a note that is already playing when speech starts", () => {
    const ticks: Array<() => void> = [];
    vi.stubGlobal("window", {
      setInterval: (fn: () => void) => {
        ticks.push(fn);
        return ticks.length;
      },
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    });
    try {
      const ctx = new FakeContext();
      const speaking = vi.fn(() => false);
      const sound = new WebAudioEffects(() => ctx as unknown as AudioContext, speaking);
      sound.play("fanfare");
      expect(ctx.gains[0]?.gain.value).toBe(1);

      speaking.mockReturnValue(true);
      ticks.forEach((tick) => tick());
      expect(ctx.gains[0]?.gain.value).toBe(SPEECH_DUCK);

      speaking.mockReturnValue(false);
      ticks.forEach((tick) => tick());
      expect(ctx.gains[0]?.gain.value).toBe(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("raises a single chime through the limiter and follows the effects slider", () => {
    const ctx = new FakeContext();
    const sound = new WebAudioEffects(() => ctx as unknown as AudioContext, () => false);

    sound.play("button");
    expect(ctx.compressors[0]?.threshold.value).toBe(-8);
    expect(ctx.gains[1]?.gain.value).toBe(DEFAULT_EFFECTS_VOLUME);
    expect(ctx.gains[2]?.gain.value).toBe(MAKEUP_GAIN);
    expect(ctx.gains[3]?.gain.peak).toBeGreaterThanOrEqual(0.65);

    sound.setVolume(0.4);
    expect(ctx.gains[1]?.gain.value).toBe(0.4);
    sound.setVolume(5);
    expect(ctx.gains[1]?.gain.value).toBe(1);
    sound.setVolume(-1);
    expect(ctx.gains[1]?.gain.value).toBe(0);

    const started = ctx.oscillators.length;
    sound.setEnabled(false);
    sound.play("correct");
    expect(ctx.oscillators.length).toBe(started);
    sound.preview("correct");
    expect(ctx.oscillators.length).toBeGreaterThan(started);
    expect(ctx.gains[0]?.gain.value).toBe(1);
  });
});
