import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(dir: string): string[] {
  const absolute = path.join(process.cwd(), dir);
  return readdirSync(absolute).flatMap((entry) => {
    const full = path.join(absolute, entry);
    if (statSync(full).isDirectory()) return sourceFiles(path.join(dir, entry));
    if (/\.(ts|tsx)$/.test(entry)) return [full];
    return [];
  });
}

function importedModules(source: string): string[] {
  return [...source.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1] ?? "");
}

function assertNoImports(dir: string, forbidden: RegExp) {
  const offenders: string[] = [];
  for (const file of sourceFiles(dir)) {
    const source = readFileSync(file, "utf8");
    for (const specifier of importedModules(source)) {
      if (forbidden.test(specifier)) {
        offenders.push(`${path.relative(process.cwd(), file)} -> ${specifier}`);
      }
    }
  }
  expect(offenders).toEqual([]);
}

describe("architecture boundaries", () => {
  it("keeps domain free of application, infrastructure, presentation, and React", () => {
    assertNoImports(
      "src/domain",
      /application|infrastructure|presentation|composition|react|next/,
    );
  });

  it("keeps application pointing only inward at the domain", () => {
    assertNoImports("src/application", /infrastructure|presentation|composition|react|next/);
  });

  it("keeps infrastructure from importing the UI", () => {
    assertNoImports("src/infrastructure", /presentation|next\/|react/);
  });

  it("keeps presentation from importing infrastructure directly", () => {
    assertNoImports("src/presentation", /infrastructure/);
  });
});
