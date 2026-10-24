import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "icons");

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let k = 0; k < 8; k += 1) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function inRoundRect(x, y, left, top, right, bottom, radius) {
  if (x < left || y < top || x > right || y > bottom) return false;
  const cx = Math.min(Math.max(x, left + radius), right - radius);
  const cy = Math.min(Math.max(y, top + radius), bottom - radius);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= radius * radius;
}

function circle(x, y, cx, cy, r) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function paint(nx, ny) {
  const margin = 0.04;
  if (!inRoundRect(nx, ny, margin, margin, 1 - margin, 1 - margin, 0.22)) {
    return [0, 0, 0, 0];
  }

  let color = [88, 204, 2, 255];
  if (ny > 0.82) color = [70, 163, 2, 255];

  const leaf =
    circle(nx, ny, 0.56, 0.3, 0.09) ||
    (nx > 0.48 && nx < 0.64 && ny > 0.18 && ny < 0.36 && Math.abs(nx - 0.56) + Math.abs(ny - 0.27) < 0.12);
  if (leaf) color = [46, 140, 40, 255];

  if (circle(nx, ny, 0.5, 0.58, 0.26)) color = [255, 176, 46, 255];
  if (circle(nx, ny, 0.39, 0.48, 0.07)) color = [255, 214, 130, 255];
  if (circle(nx, ny, 0.41, 0.55, 0.035) || circle(nx, ny, 0.59, 0.55, 0.035)) {
    color = [74, 44, 24, 255];
  }
  if (circle(nx, ny, 0.34, 0.62, 0.03) || circle(nx, ny, 0.66, 0.62, 0.03)) {
    color = [255, 140, 150, 255];
  }

  const sx = (nx - 0.5) / 0.11;
  const sy = (ny - 0.66) / 0.07;
  const smileDist = Math.sqrt(sx * sx + sy * sy);
  if (Math.abs(smileDist - 1) < 0.18 && ny >= 0.66 && nx > 0.4 && nx < 0.6) {
    color = [74, 44, 24, 255];
  }

  return color;
}

function png(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < size; x += 1) {
      const [r, g, b, a] = paint((x + 0.5) / size, (y + 0.5) / size);
      const i = row + 1 + x * 4;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
      raw[i + 3] = a;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(root, { recursive: true });
writeFileSync(join(root, "icon-192.png"), png(192));
writeFileSync(join(root, "icon-512.png"), png(512));
console.log("Wrote public/icons/icon-192.png and icon-512.png");
