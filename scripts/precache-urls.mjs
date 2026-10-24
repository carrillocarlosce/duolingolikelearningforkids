/** Turn exported files into the URLs a project-site service worker must cache. */
export function precacheUrls(relativeFiles, basePath) {
  const urls = new Set();
  for (const rel of relativeFiles) {
    const normalized = String(rel).split("\\").join("/").replace(/^\/+/, "");
    if (!normalized || normalized === "sw.js" || normalized === ".nojekyll") continue;
    if (normalized.endsWith(".map")) continue;
    urls.add(`${basePath}/${encodePath(normalized)}`);
    if (normalized === "index.html" || normalized.endsWith("/index.html")) {
      const directory =
        normalized === "index.html"
          ? `${basePath}/`
          : `${basePath}/${encodePath(normalized.slice(0, -"index.html".length))}`;
      urls.add(directory);
    }
  }
  return [...urls].sort();
}

function encodePath(value) {
  const trailing = value.endsWith("/");
  const encoded = value
    .split("/")
    .filter((part) => part.length > 0)
    .map((part) => encodeURIComponent(part))
    .join("/");
  if (!encoded) return "";
  return trailing ? `${encoded}/` : encoded;
}
