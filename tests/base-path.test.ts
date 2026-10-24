import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BASE_PATH, withBasePath } from "@/base-path";

describe("base path", () => {
  it("matches the project site path used by GitHub Pages", () => {
    const shared = readFileSync(new URL("../base-path.mjs", import.meta.url), "utf8");
    const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
    expect(BASE_PATH).toBe("/duolingolikelearningforkids");
    expect(shared).toContain(BASE_PATH);
    expect(config).toContain("basePath: BASE_PATH");
    expect(config).toContain("assetPrefix: BASE_PATH");
  });

  it("prefixes asset urls once", () => {
    expect(withBasePath("/")).toBe("/duolingolikelearningforkids/");
    expect(withBasePath("/icons/icon-192.png")).toBe(
      "/duolingolikelearningforkids/icons/icon-192.png",
    );
    expect(withBasePath("sw.js")).toBe("/duolingolikelearningforkids/sw.js");
  });
});
