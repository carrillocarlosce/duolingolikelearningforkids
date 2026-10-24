export type Lang = "en" | "es";

/** Which language the child hears or reads, and which language they answer in. */
export type Direction = "en-es" | "es-en" | "en" | "es";

export interface LocalizedText {
  en: string;
  es: string;
}
