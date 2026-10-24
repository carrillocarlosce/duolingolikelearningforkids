import type { SpeechRecognitionPort } from "@/application/ports";
import type { Lang } from "@/domain/language";

interface RecognitionAlternative {
  transcript?: string;
}

interface RecognitionResultEvent {
  results?: ArrayLike<ArrayLike<RecognitionAlternative>>;
}

interface BrowserRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

type RecognitionConstructor = new () => BrowserRecognition;

function recognitionConstructor(): RecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const host = window as Window & {
    SpeechRecognition?: RecognitionConstructor;
    webkitSpeechRecognition?: RecognitionConstructor;
  };
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null;
}

export function bestTranscript(event: RecognitionResultEvent): string {
  const row = event.results?.[0];
  if (!row) return "";
  let best = "";
  for (let index = 0; index < row.length; index += 1) {
    const transcript = row[index]?.transcript?.trim() ?? "";
    if (transcript.length > best.length) best = transcript;
  }
  return best;
}

/** On-device recognizer. Chrome still contacts Google, so this stays optional. */
export class WebSpeechRecognition implements SpeechRecognitionPort {
  readonly supported: boolean;
  private active: BrowserRecognition | null = null;

  constructor() {
    this.supported = recognitionConstructor() !== null;
  }

  listen(lang: Lang): Promise<string> {
    const Ctor = recognitionConstructor();
    if (!Ctor) return Promise.resolve("");
    this.stop();
    const recognition = new Ctor();
    this.active = recognition;
    recognition.lang = lang === "es" ? "es-PE" : "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;
    return new Promise((resolve) => {
      let settled = false;
      const finish = (text: string) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(giveUp);
        resolve(text);
      };
      const giveUp = window.setTimeout(() => finish(""), 8000);
      recognition.onresult = (event) => finish(bestTranscript(event));
      recognition.onerror = () => finish("");
      recognition.onend = () => {
        window.setTimeout(() => finish(""), 40);
      };
      try {
        recognition.start();
      } catch {
        finish("");
      }
    });
  }

  stop(): void {
    const active = this.active;
    this.active = null;
    if (!active) return;
    try {
      active.abort();
    } catch {
      try {
        active.stop();
      } catch {
        // The recognizer had already stopped.
      }
    }
  }
}
