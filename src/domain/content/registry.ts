import unit7File from "@/domain/content/units/unit-7.json";
import { parseUnit, type Unit } from "@/domain/content/unit";

/**
 * Every unit the app can teach. A new unit is a JSON file in ./units
 * plus one entry in this list.
 */
const unitFiles: readonly { file: string; data: unknown }[] = [{ file: "unit-7.json", data: unit7File }];

function loadUnit(file: string, data: unknown): Unit {
  try {
    return parseUnit(data);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid unit file ${file}. ${detail}`);
  }
}

export const units: readonly Unit[] = unitFiles.map((entry) => loadUnit(entry.file, entry.data));

/** The lesson map still teaches this unit. Its lesson ids are the saved progress keys. */
export const MAP_UNIT_ID = "unit-7";

export function requireUnit(id: string): Unit {
  const unit = units.find((item) => item.id === id);
  if (!unit) throw new Error(`Unknown unit: ${id}`);
  return unit;
}
