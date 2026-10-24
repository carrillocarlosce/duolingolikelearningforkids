export interface Point {
  x: number;
  y: number;
}

export interface LetterStroke {
  /** Polyline in a 0–100 box. The first point is where the stroke starts. */
  points: Point[];
}

/** Share of checkpoints, in order, that finishes a stroke and fills the rest. */
export const TRACE_CHECKPOINT_RATIO = 0.7;
/** Distance in the 0–100 box. Large on purpose so a finger can wobble. */
export const CHECKPOINT_RADIUS = 16;
const CHECKPOINT_SPACING = 10;

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Map a touch into the same 0–100 box the guide is drawn in. */
export function pointerToBox(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): Point {
  const width = rect.width || 1;
  const height = rect.height || 1;
  return {
    x: ((clientX - rect.left) / width) * 100,
    y: ((clientY - rect.top) / height) * 100,
  };
}

/** Bitmap pixels for a CSS box. The pointer stays in CSS pixels, so the two stay aligned. */
export function canvasBitmapSize(
  cssWidth: number,
  cssHeight: number,
  devicePixelRatio: number,
): { width: number; height: number; dpr: number } {
  const raw = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const dpr = Math.min(raw, 3);
  return {
    width: Math.max(1, Math.round(cssWidth * dpr)),
    height: Math.max(1, Math.round(cssHeight * dpr)),
    dpr,
  };
}

export function sampleCheckpoints(points: readonly Point[], spacing = CHECKPOINT_SPACING): Point[] {
  if (points.length === 0) return [];
  const first = points[0];
  if (!first) return [];
  const out: Point[] = [{ x: first.x, y: first.y }];
  let since = 0;
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    if (!start || !end) continue;
    const length = distance(start, end);
    if (length === 0) continue;
    let consumed = 0;
    while (since + (length - consumed) >= spacing - 1e-6) {
      const need = spacing - since;
      consumed += need;
      const t = consumed / length;
      out.push({
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t,
      });
      since = 0;
    }
    since += Math.max(0, length - consumed);
  }
  const end = points[points.length - 1];
  const last = out[out.length - 1];
  if (end && last && distance(last, end) > spacing * 0.35) out.push({ x: end.x, y: end.y });
  return out;
}

/** Mark the next checkpoints the finger is touching. Later ones do not count yet. */
export function advanceCheckpoints(
  checkpoints: readonly Point[],
  covered: number,
  finger: Point,
  radius = CHECKPOINT_RADIUS,
): number {
  let next = covered;
  const limit = radius * radius;
  while (next < checkpoints.length) {
    const target = checkpoints[next];
    if (!target) break;
    const dx = target.x - finger.x;
    const dy = target.y - finger.y;
    if (dx * dx + dy * dy > limit) break;
    next += 1;
  }
  return next;
}

export function coverCheckpoints(
  checkpoints: readonly Point[],
  fingers: readonly Point[],
  radius = CHECKPOINT_RADIUS,
  covered = 0,
): number {
  let next = covered;
  for (const finger of fingers) next = advanceCheckpoints(checkpoints, next, finger, radius);
  return next;
}

/**
 * A fast finger jumps between events. Walk the segment so a checkpoint
 * between the two samples still counts, but only in order.
 */
export function coverAlongSegment(
  checkpoints: readonly Point[],
  covered: number,
  from: Point | null,
  to: Point,
  radius = CHECKPOINT_RADIUS,
): number {
  if (!from) return advanceCheckpoints(checkpoints, covered, to, radius);
  const step = Math.max(4, radius / 2);
  const steps = Math.max(1, Math.ceil(distance(from, to) / step));
  const samples: Point[] = [];
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    samples.push({
      x: from.x + (to.x - from.x) * t,
      y: from.y + (to.y - from.y) * t,
    });
  }
  return coverCheckpoints(checkpoints, samples, radius, covered);
}

export function shouldCompleteStroke(
  covered: number,
  total: number,
  ratio = TRACE_CHECKPOINT_RATIO,
): boolean {
  if (total <= 0) return false;
  return covered / total >= ratio;
}

export function pointsUntil(points: readonly Point[], fraction: number): Point[] {
  if (points.length === 0) return [];
  const first = points[0];
  if (!first) return [];
  if (fraction <= 0) return [{ x: first.x, y: first.y }];
  if (fraction >= 1) return points.map((point) => ({ x: point.x, y: point.y }));
  let total = 0;
  const lengths: number[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const length = distance(points[index - 1]!, points[index]!);
    lengths.push(length);
    total += length;
  }
  if (total === 0) return points.map((point) => ({ x: point.x, y: point.y }));
  let remain = total * fraction;
  const out: Point[] = [{ x: first.x, y: first.y }];
  for (let index = 1; index < points.length; index += 1) {
    const length = lengths[index - 1] ?? 0;
    const prev = points[index - 1]!;
    const next = points[index]!;
    if (remain <= length) {
      const t = length === 0 ? 0 : remain / length;
      out.push({ x: prev.x + (next.x - prev.x) * t, y: prev.y + (next.y - prev.y) * t });
      return out;
    }
    remain -= length;
    out.push({ x: next.x, y: next.y });
  }
  return out;
}

export function pointOnStroke(points: readonly Point[], fraction: number): { point: Point; angle: number } {
  const walked = pointsUntil(points, Math.min(1, Math.max(0, fraction)));
  const point = walked[walked.length - 1] ?? { x: 50, y: 50 };
  const before = walked[walked.length - 2] ?? point;
  return { point, angle: Math.atan2(point.y - before.y, point.x - before.x) };
}

/** Number bubble sits outside the letter, away from the other stroke numbers. */
export function startDot(points: readonly Point[]): Point {
  const start = points[0] ?? { x: 50, y: 50 };
  const next = points[Math.min(1, Math.max(0, points.length - 1))] ?? start;
  const angle = Math.atan2(next.y - start.y, next.x - start.x);
  const center = { x: 50, y: 58 };
  const candidates = [angle - Math.PI / 2, angle + Math.PI / 2].map((dir) => ({
    x: start.x + Math.cos(dir) * 16,
    y: start.y + Math.sin(dir) * 16,
  }));
  candidates.sort((a, b) => distance(b, center) - distance(a, center));
  const chosen = candidates[0] ?? start;
  return { x: clampBox(chosen.x), y: clampBox(chosen.y) };
}

export function layoutStartDots(strokes: readonly { points: readonly Point[] }[]): Point[] {
  const placed: Point[] = [];
  for (const stroke of strokes) {
    let dot = startDot(stroke.points);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      if (!placed.some((other) => distance(other, dot) < 15)) break;
      const away = Math.atan2(dot.y - 58, dot.x - 50);
      dot = {
        x: clampBox(dot.x + Math.cos(away) * 8),
        y: clampBox(dot.y + Math.sin(away) * 8),
      };
    }
    placed.push(dot);
  }
  return placed;
}

function clampBox(value: number): number {
  return Math.min(96, Math.max(4, value));
}

export function lettersOf(word: string): string[] {
  return [...word.normalize("NFC")].filter((letter) => letter.trim().length > 0 && !/\p{M}/u.test(letter));
}

function curve(cx: number, cy: number, radius: number, start: number, end: number, steps = 16): Point[] {
  const points: Point[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const t = start + ((end - start) * index) / steps;
    points.push({ x: cx + Math.cos(t) * radius, y: cy + Math.sin(t) * radius });
  }
  return points;
}

function line(pairs: readonly (readonly [number, number])[]): Point[] {
  return pairs.map(([x, y]) => ({ x, y }));
}

const ACCENT = line([
  [40, 22],
  [64, 12],
]);

const TILDE = line([
  [34, 20],
  [44, 14],
  [54, 20],
  [64, 14],
  [74, 20],
]);

const a = [
  line([
    [62, 48],
    [50, 34],
    [34, 46],
    [32, 64],
    [46, 80],
    [64, 70],
    [66, 56],
  ]),
  line([
    [64, 38],
    [64, 82],
  ]),
];

const n = [
  line([
    [34, 36],
    [34, 82],
  ]),
  line([
    [34, 42],
    [38, 32],
    [52, 30],
    [68, 40],
    [70, 56],
    [70, 82],
  ]),
];

const u = [
  line([
    [32, 36],
    [32, 66],
    [42, 80],
    [58, 80],
    [68, 66],
    [68, 40],
  ]),
  line([
    [68, 36],
    [68, 82],
  ]),
];

const strokes: Record<string, Point[][]> = {
  a,
  b: [
    line([
      [34, 14],
      [34, 82],
    ]),
    line([
      [34, 46],
      [50, 34],
      [68, 48],
      [68, 66],
      [52, 80],
      [34, 72],
    ]),
  ],
  c: [curve(50, 58, 22, -0.55, -0.55 - (Math.PI * 2 - 1.15), 18)],
  d: [
    line([
      [62, 48],
      [48, 34],
      [32, 48],
      [30, 66],
      [44, 80],
      [62, 70],
      [66, 56],
    ]),
    line([
      [66, 14],
      [66, 82],
    ]),
  ],
  e: [
    line([
      [34, 56],
      [66, 56],
      [68, 44],
      [56, 34],
      [38, 36],
      [30, 50],
      [32, 68],
      [48, 80],
      [66, 74],
    ]),
  ],
  f: [
    line([
      [66, 26],
      [50, 14],
      [36, 26],
      [42, 40],
      [42, 98],
    ]),
    line([
      [26, 52],
      [60, 52],
    ]),
  ],
  g: [
    a[0]!,
    line([
      [64, 46],
      [64, 86],
      [48, 96],
      [34, 88],
    ]),
  ],
  h: [
    line([
      [34, 14],
      [34, 82],
    ]),
    line([
      [34, 50],
      [40, 36],
      [56, 34],
      [70, 46],
      [70, 82],
    ]),
  ],
  i: [
    line([
      [50, 40],
      [50, 82],
    ]),
    line([
      [50, 20],
      [50, 28],
    ]),
  ],
  j: [
    line([
      [56, 40],
      [56, 84],
      [42, 96],
      [30, 88],
    ]),
    line([
      [56, 20],
      [56, 28],
    ]),
  ],
  k: [
    line([
      [36, 14],
      [36, 82],
    ]),
    line([
      [66, 40],
      [38, 58],
      [68, 82],
    ]),
  ],
  l: [
    line([
      [48, 14],
      [48, 74],
      [64, 82],
    ]),
  ],
  m: [
    line([
      [24, 36],
      [24, 82],
    ]),
    line([
      [24, 44],
      [30, 32],
      [44, 30],
      [50, 44],
      [50, 82],
    ]),
    line([
      [50, 44],
      [56, 32],
      [70, 30],
      [78, 44],
      [78, 82],
    ]),
  ],
  n,
  o: [curve(50, 58, 22, -Math.PI / 2, -Math.PI / 2 - Math.PI * 2, 22)],
  p: [
    line([
      [34, 36],
      [34, 96],
    ]),
    line([
      [34, 46],
      [52, 34],
      [68, 48],
      [66, 66],
      [48, 78],
      [34, 66],
    ]),
  ],
  q: [
    line([
      [38, 48],
      [52, 34],
      [68, 46],
      [66, 66],
      [50, 80],
      [36, 68],
      [38, 54],
    ]),
    line([
      [66, 36],
      [66, 96],
    ]),
  ],
  r: [
    line([
      [36, 36],
      [36, 82],
    ]),
    line([
      [36, 50],
      [48, 34],
      [66, 36],
      [72, 48],
    ]),
  ],
  s: [
    line([
      [68, 42],
      [52, 32],
      [34, 40],
      [32, 54],
      [46, 62],
      [64, 68],
      [66, 80],
      [48, 88],
      [32, 78],
    ]),
  ],
  t: [
    line([
      [50, 22],
      [50, 74],
      [64, 82],
    ]),
    line([
      [32, 48],
      [68, 48],
    ]),
  ],
  u,
  v: [
    line([
      [30, 36],
      [50, 82],
      [70, 36],
    ]),
  ],
  w: [
    line([
      [16, 36],
      [32, 82],
      [50, 46],
      [68, 82],
      [84, 36],
    ]),
  ],
  x: [
    line([
      [32, 36],
      [70, 82],
    ]),
    line([
      [70, 36],
      [32, 82],
    ]),
  ],
  y: [
    line([
      [30, 36],
      [50, 62],
    ]),
    line([
      [72, 36],
      [50, 62],
      [40, 96],
    ]),
  ],
  z: [
    line([
      [30, 36],
      [72, 36],
      [30, 82],
      [72, 82],
    ]),
  ],
  á: [...a, ACCENT],
  é: [
    line([
      [34, 56],
      [66, 56],
      [68, 44],
      [56, 34],
      [38, 36],
      [30, 50],
      [32, 68],
      [48, 80],
      [66, 74],
    ]),
    ACCENT,
  ],
  í: [
    line([
      [50, 40],
      [50, 82],
    ]),
    ACCENT,
  ],
  ó: [curve(50, 58, 22, -Math.PI / 2, -Math.PI / 2 - Math.PI * 2, 22), ACCENT],
  ú: [...u, ACCENT],
  ñ: [...n, TILDE],
  ü: [
    ...u,
    line([
      [40, 18],
      [40, 26],
    ]),
    line([
      [58, 18],
      [58, 26],
    ]),
  ],
  "-": [
    line([
      [34, 58],
      [66, 58],
    ]),
  ],
};

const fallback: Point[][] = [
  line([
    [32, 58],
    [68, 58],
  ]),
];

export function strokesForLetter(letter: string): LetterStroke[] {
  const key = letter.normalize("NFC").toLowerCase();
  const paths = strokes[key] ?? fallback;
  return paths.map((points) => ({ points }));
}
