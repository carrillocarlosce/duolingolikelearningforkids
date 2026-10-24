import type { Grade } from "@/domain/exercises";

export function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[¿¡?!.,'"’“”]/g, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const next = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      next[j] = Math.min(
        (next[j - 1] ?? 0) + 1,
        (previous[j] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      );
    }
    previous = next;
  }
  return previous[b.length] ?? 0;
}

/** Tiny words must be exact. Longer words allow one or two slips. */
export function typoBudget(length: number): number {
  if (length <= 2) return 0;
  if (length <= 8) return 1;
  return 2;
}

/**
 * Case, accents, and small typos count. An exact alternate (torta, fideos, perro caliente)
 * is correct. A near miss is "almost": still right, and the UI shows the spelling.
 */
export function gradeText(input: string, accepted: readonly string[]): Grade {
  const canonical = accepted[0] ?? "";
  if (!canonical) return { status: "incorrect" };
  const normalizedInput = normalizeAnswer(input);
  if (!normalizedInput) return { status: "incorrect", canonical };

  let best = Number.POSITIVE_INFINITY;
  for (const form of accepted) {
    const normalized = normalizeAnswer(form);
    if (!normalized) continue;
    if (normalizedInput === normalized) return { status: "correct", canonical };
    best = Math.min(best, levenshtein(normalizedInput, normalized));
  }

  const budget = typoBudget(normalizeAnswer(canonical).length);
  if (best <= budget) return { status: "almost", canonical };
  return { status: "incorrect", canonical };
}
