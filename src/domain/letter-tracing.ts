/** Parent choice for the writing lesson. "auto" follows the screen. */
export type LetterTracingMode = "auto" | "on" | "off";

export function readLetterTracing(value: unknown): LetterTracingMode {
  return value === "on" || value === "off" || value === "auto" ? value : "auto";
}

/**
 * Phones leave tracing off until a parent turns it on.
 * `coarsePhone` is true for a small touch screen (see the presentation media query).
 */
export function letterTracingEnabled(mode: LetterTracingMode, coarsePhone: boolean): boolean {
  if (mode === "on") return true;
  if (mode === "off") return false;
  return !coarsePhone;
}
