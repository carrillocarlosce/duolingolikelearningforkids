import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { allowsTextSelection } from "@/presentation/touch-selection";

describe("touch selection", () => {
  it("lets a child type in a field and blocks selection everywhere else", () => {
    expect(allowsTextSelection("input", null)).toBe(true);
    expect(allowsTextSelection("INPUT", null)).toBe(true);
    expect(allowsTextSelection("textarea", null)).toBe(true);
    expect(allowsTextSelection("div", "true")).toBe(true);
    expect(allowsTextSelection("div", "")).toBe(true);
    expect(allowsTextSelection("div", "false")).toBe(false);
    expect(allowsTextSelection("p", null)).toBe(false);
    expect(allowsTextSelection("button", null)).toBe(false);
    expect(allowsTextSelection("span", null)).toBe(false);
  });

  it("turns off callouts and selection in the global stylesheet", () => {
    const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toContain("user-select: none");
    expect(css).toContain("-webkit-user-select: none");
    expect(css).toContain("-webkit-touch-callout: none");
    expect(css).toContain("-webkit-tap-highlight-color: transparent");
    expect(css).toContain("touch-action: manipulation");
    expect(css).toContain("-webkit-user-drag: none");
    expect(css).toMatch(/input,\s*textarea,\s*\[contenteditable="true"\][\s\S]*user-select:\s*text/);
    const trace = css.indexOf(".trace-pad");
    const globalTouch = css.indexOf("body *");
    expect(trace).toBeGreaterThan(globalTouch);
    expect(css.slice(trace, trace + 180)).toContain("touch-action: none");
  });
});