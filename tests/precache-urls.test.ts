import { describe, expect, it } from "vitest";
import { precacheUrls } from "../scripts/precache-urls.mjs";

const base = "/duolingolikelearningforkids";

describe("precacheUrls", () => {
  it("prefixes the project site and keeps the directory URL for each index", () => {
    const urls = precacheUrls(
      [
        "index.html",
        "_next/static/chunks/app.js",
        "icons/icon-192.png",
        "manifest.webmanifest",
        "_not-found/index.html",
        "sw.js",
        ".nojekyll",
        "legacy.js.map",
      ],
      base,
    );

    expect(urls).toContain(`${base}/`);
    expect(urls).toContain(`${base}/index.html`);
    expect(urls).toContain(`${base}/_next/static/chunks/app.js`);
    expect(urls).toContain(`${base}/icons/icon-192.png`);
    expect(urls).toContain(`${base}/manifest.webmanifest`);
    expect(urls).toContain(`${base}/_not-found/`);
    expect(urls).toContain(`${base}/_not-found/index.html`);
    expect(urls.some((url) => url.endsWith("/sw.js"))).toBe(false);
    expect(urls.some((url) => url.includes("nojekyll"))).toBe(false);
    expect(urls.some((url) => url.endsWith(".map"))).toBe(false);
    expect(urls.every((url) => url.startsWith(`${base}/`))).toBe(true);
  });
});
