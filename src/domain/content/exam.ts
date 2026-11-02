import { MAP_UNIT_ID, requireUnit } from "@/domain/content/registry";
import type { ExamLine } from "@/domain/content/unit";

export type { ExamLine };

/** Menu lines from the unit file. The map turns each one into a writing lesson. */
export function examLines(): readonly ExamLine[] {
  return requireUnit(MAP_UNIT_ID).examLines;
}

export function examLine(id: string): ExamLine {
  const line = examLines().find((item) => item.id === id);
  if (!line) throw new Error(`Unknown exam line: ${id}`);
  return line;
}
