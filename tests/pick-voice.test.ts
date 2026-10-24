import { describe, expect, it } from "vitest";
import { pickVoice } from "@/infrastructure/speech/pick-voice";

const voices = [
  { lang: "en-GB", name: "Daniel" },
  { lang: "en-US", name: "Samantha" },
  { lang: "es-ES", name: "Monica" },
  { lang: "es-MX", name: "Paulina" },
  { lang: "es-PE", name: "Peru" },
  { lang: "fr-FR", name: "Amelie" },
];

describe("pickVoice", () => {
  it("prefers Peruvian Spanish, then other Spanish, and ignores other languages", () => {
    expect(pickVoice(voices, "es")?.lang).toBe("es-PE");
    expect(pickVoice(voices.filter((voice) => voice.lang !== "es-PE"), "es")?.lang).toBe("es-MX");
    expect(pickVoice([{ lang: "fr-FR" }], "es")).toBeNull();
  });

  it("prefers US English", () => {
    expect(pickVoice(voices, "en")?.lang).toBe("en-US");
    expect(pickVoice([{ lang: "en-GB" }], "en")?.lang).toBe("en-GB");
  });
});
