import { afterEach, describe, expect, it } from "vitest";
import { bestTranscript, WebSpeechRecognition } from "@/infrastructure/speech/web-speech-recognition";

class FakeRecognition extends EventTarget {
  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  onresult: ((event: { results?: ArrayLike<ArrayLike<{ transcript?: string }>> }) => void) | null = null;
  onerror: (() => void) | null = null;
  onend: (() => void) | null = null;
  started = 0;
  aborted = 0;

  start(): void {
    this.started += 1;
    this.onresult?.({ results: [[{ transcript: "leche" }, { transcript: "Leche" }]] });
    this.onend?.();
  }

  stop(): void {
    this.aborted += 1;
  }

  abort(): void {
    this.aborted += 1;
  }
}

class SilentRecognition extends FakeRecognition {
  override start(): void {
    this.started += 1;
    this.onerror?.();
    this.onend?.();
  }
}

describe("speech recognition", () => {
  const previousWindow = (globalThis as { window?: unknown }).window;

  afterEach(() => {
    if (previousWindow === undefined) delete (globalThis as { window?: unknown }).window;
    else (globalThis as { window?: unknown }).window = previousWindow;
  });

  it("keeps the longest alternative", () => {
    expect(bestTranscript({ results: [[{ transcript: "le" }, { transcript: "leche" }]] })).toBe("leche");
    expect(bestTranscript({})).toBe("");
  });

  it("resolves a transcript when the browser recognizer exists", async () => {
    (globalThis as { window?: unknown }).window = {
      SpeechRecognition: FakeRecognition,
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    };
    const recognition = new WebSpeechRecognition();
    expect(recognition.supported).toBe(true);
    await expect(recognition.listen("es")).resolves.toBe("leche");
  });

  it("resolves an empty transcript when the microphone fails", async () => {
    (globalThis as { window?: unknown }).window = {
      webkitSpeechRecognition: SilentRecognition,
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout: globalThis.clearTimeout.bind(globalThis),
    };
    const recognition = new WebSpeechRecognition();
    await expect(recognition.listen("en")).resolves.toBe("");
  });

  it("reports unsupported when the browser has no recognizer", () => {
    (globalThis as { window?: unknown }).window = {};
    expect(new WebSpeechRecognition().supported).toBe(false);
  });
});
