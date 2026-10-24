import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { BASE_PATH } from "../base-path.mjs";

const port = Number(process.env.PORT || 4173);
const root = join(process.cwd(), "out");

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function resolveFile(pathname) {
  let rel = decodeURIComponent(pathname.slice(BASE_PATH.length));
  if (!rel.startsWith("/")) rel = `/${rel}`;
  if (rel.endsWith("/")) rel += "index.html";
  const file = normalize(join(root, rel));
  if (!file.startsWith(root)) return null;
  return file;
}

if (!existsSync(root)) {
  console.error("Missing out/. Run npm run build first.");
  process.exit(1);
}

createServer((req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
  if (url.pathname === "/" || !url.pathname.startsWith(BASE_PATH)) {
    res.writeHead(302, { Location: `${BASE_PATH}/` });
    res.end();
    return;
  }

  const file = resolveFile(url.pathname);
  if (!file || !existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const type = types[extname(file)] ?? "application/octet-stream";
  res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-cache" });
  res.end(readFileSync(file));
}).listen(port, () => {
  console.log(`Preview: http://127.0.0.1:${port}${BASE_PATH}/`);
});
