import { describe, expect, it, vi } from "vitest";
import { NoopSoundEffects } from "@/infrastructure/audio/noop-sound-effects";
import { SPEECH_DUCK, WebAudioEffects } from "@/infrastructure/audio/web-audio-effects";

class FakeParam {
  value = 0;
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

class FakeContext {
  currentTime = 0;
  sampleRate = 8000;
  state: AudioContextState = "suspended";
  destination = {};
  resumes = 0;
  oscillators: FakeOsc[] = [];
  gains: FakeGain[] = [];

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
}

describe("sound effects", () => {
  it("stays silent in the no-op adapter", () => {
    const sound = new NoopSoundEffects();
    expect(() => {
      sound.unlock();
      sound.play("fanfare");
      sound.setEnabled(false);
      sound.play("correct");
    }).not.toThrow();
    expect(sound.enabled).toBe(false);
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
});
