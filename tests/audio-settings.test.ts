import "fake-indexeddb/auto";
import { openDB } from "idb";
import { afterEach, describe, expect, it, vi } from "vitest";
import { saveAudioSettings } from "@/application/save-audio-settings";
import { recordLessonResult } from "@/application/record-lesson-result";
import {
  DEFAULT_EFFECTS_VOLUME,
  DEFAULT_VOICE_SPEED,
  DEFAULT_VOICE_VOLUME,
  MAX_VOICE_SPEED,
  MIN_VOICE_SPEED,
  clampUnit,
  clampVoiceSpeed,
  readAudioLevels,
} from "@/domain/audio-settings";
import { freshProfile, normalizeProfile } from "@/domain/progress";
import { IndexedDbProgressRepository } from "@/infrastructure/storage/indexed-db-progress-repository";
import { MemoryProgressRepository } from "@/infrastructure/storage/memory-progress-repository";
import { WebSpeechSynth } from "@/infrastructure/speech/web-speech-synth";

const names: string[] = [];

describe("audio level limits", () => {
  it("clamps volumes to 0–1 and speed to the parent slider", () => {
    expect(clampUnit(-0.2, DEFAULT_EFFECTS_VOLUME)).toBe(0);
    expect(clampUnit(4, DEFAULT_EFFECTS_VOLUME)).toBe(1);
    expect(clampUnit(Number.NaN, DEFAULT_EFFECTS_VOLUME)).toBe(DEFAULT_EFFECTS_VOLUME);
    expect(clampUnit(0, DEFAULT_EFFECTS_VOLUME)).toBe(0);
    expect(clampVoiceSpeed(0.1)).toBe(MIN_VOICE_SPEED);
    expect(clampVoiceSpeed(9)).toBe(MAX_VOICE_SPEED);
    expect(clampVoiceSpeed("fast")).toBe(DEFAULT_VOICE_SPEED);

    expect(readAudioLevels(undefined)).toEqual({
      sound: true,
      effectsVolume: DEFAULT_EFFECTS_VOLUME,
      voiceVolume: DEFAULT_VOICE_VOLUME,
      voiceSpeed: DEFAULT_VOICE_SPEED,
    });
    expect(readAudioLevels({ sound: false, effectsVolume: 2, voiceVolume: -1, voiceSpeed: 0.2 })).toEqual({
      sound: false,
      effectsVolume: 1,
      voiceVolume: 0,
      voiceSpeed: MIN_VOICE_SPEED,
    });
  });

  it("fills levels when an older profile has none", () => {
    const legacy = {
      xp: 12,
      hearts: 3,
      streak: 2,
      lastActiveDate: "2026-10-23",
      heartsDate: "2026-10-23",
      uiLang: "es",
      sound: false,
      direction: "en",
    };
    expect(normalizeProfile(legacy, "2026-10-24")).toMatchObject({
      xp: 12,
      hearts: 3,
      sound: false,
      effectsVolume: DEFAULT_EFFECTS_VOLUME,
      voiceVolume: DEFAULT_VOICE_VOLUME,
      voiceSpeed: DEFAULT_VOICE_SPEED,
      letterTracing: "auto",
    });
  });
});

describe("saved audio levels", () => {
  afterEach(async () => {
    await Promise.all(names.splice(0).map((name) => indexedDB.deleteDatabase(name)));
  });

  it("remembers slider values and clamps anything outside the range", async () => {
    const repo = new MemoryProgressRepository(freshProfile("2026-10-24"));
    const saved = await saveAudioSettings(repo, await repo.getProfile(), {
      effectsVolume: 0.35,
      voiceVolume: 0.5,
      voiceSpeed: 0.9,
      sound: false,
    });
    expect(saved).toMatchObject({ effectsVolume: 0.35, voiceVolume: 0.5, voiceSpeed: 0.9, sound: false });
    expect(await repo.getProfile()).toMatchObject(saved);

    await repo.saveProfile({
      ...saved,
      sound: true,
      effectsVolume: 8,
      voiceVolume: -3,
      voiceSpeed: 4,
    });
    expect(await repo.getProfile()).toMatchObject({
      sound: true,
      effectsVolume: 1,
      voiceVolume: 0,
      voiceSpeed: MAX_VOICE_SPEED,
    });
  });

  it("keeps the sliders when a lesson is saved, including an old IndexedDB profile", async () => {
    const name = `pipos-levels-${crypto.randomUUID()}`;
    names.push(name);
    const today = "2026-10-24";
    const repo = new IndexedDbProgressRepository(name, () => today);
    await repo.getProfile();
    await repo.close();

    const database = await openDB(name, 1);
    await database.put(
      "profile",
      {
        xp: 7,
        hearts: 4,
        streak: 1,
        lastActiveDate: null,
        heartsDate: today,
        uiLang: "es",
        sound: true,
        direction: "en",
      },
      "main",
    );
    database.close();

    const reopened = new IndexedDbProgressRepository(name, () => today);
    const migrated = await reopened.getProfile();
    expect(migrated.xp).toBe(7);
    expect(migrated.effectsVolume).toBe(DEFAULT_EFFECTS_VOLUME);
    expect(migrated.voiceVolume).toBe(DEFAULT_VOICE_VOLUME);
    expect(migrated.voiceSpeed).toBe(DEFAULT_VOICE_SPEED);

    const tuned = await saveAudioSettings(reopened, migrated, {
      effectsVolume: 0.45,
      voiceVolume: 0.7,
      voiceSpeed: 1.1,
    });
    const finished = await recordLessonResult(reopened, {
      lessonId: "sweet-treats",
      xpAwarded: 10,
      attemptXp: 10,
      stars: 2,
      today,
    });
    expect(finished.profile).toMatchObject({
      xp: 17,
      effectsVolume: tuned.effectsVolume,
      voiceVolume: tuned.voiceVolume,
      voiceSpeed: tuned.voiceSpeed,
    });
    await reopened.close();

    const again = new IndexedDbProgressRepository(name, () => today);
    expect(await again.getProfile()).toMatchObject({
      effectsVolume: 0.45,
      voiceVolume: 0.7,
      voiceSpeed: 1.1,
    });
    await again.close();
  });
});

describe("voice levels", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("applies volume and speed on the spoken word", () => {
    const spoken: Array<{ volume: number; rate: number; text: string }> = [];
    class Utterance {
      volume = 1;
      rate = 1;
      lang = "";
      voice: unknown = null;
      constructor(public text: string) {}
    }
    vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
    vi.stubGlobal("window", {
      speechSynthesis: {
        speaking: false,
        cancel() {},
        getVoices: () => [],
        speak(utterance: { volume: number; rate: number; text: string }) {
          spoken.push({ volume: utterance.volume, rate: utterance.rate, text: utterance.text });
        },
      },
    });

    const speech = new WebSpeechSynth();
    speech.setVolume(0.4);
    speech.setSpeed(1.2);
    speech.speak("manzana", "es", 0.95);
    expect(spoken).toEqual([{ volume: 0.4, rate: 0.95 * 1.2, text: "manzana" }]);

    speech.setVolume(9);
    speech.setSpeed(0.1);
    speech.speak("apple", "en", 0.95);
    expect(spoken[1]).toMatchObject({ volume: 1, rate: 0.95 * MIN_VOICE_SPEED });
  });
});
