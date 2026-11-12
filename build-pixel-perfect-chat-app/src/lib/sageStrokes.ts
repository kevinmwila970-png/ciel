// Pen path for the word "Sage" in connected cursive. The centerlines come from
// the public-domain Hershey "Script Simplex" single-stroke font, laid out so
// the capital S stands alone and "age" flows as one joined stroke with a pen
// lift for the stem of the g. We smooth the sparse points with a centripetal
// Catmull-Rom spline and give them pointed-pen pressure: thick downstrokes and
// hairline upstrokes.

export type PenSample = { x: number; y: number; w: number; t: number };
export type PenStroke = { samples: PenSample[]; time: number; length: number };
export type PenWord = {
  strokes: PenStroke[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
};

const RAW: number[][][] = [
  [[0,22],[2,21],[4,19],[7,15],[9,12],[11,8],[12,5],[12,2],[11,1],[10,1],[9,2],[8,4],[8,6],[9,8],[11,10],[14,12],[16,14],[17,16],[17,18],[16,20],[15,21],[12,22],[8,22],[5,21],[3,19],[2,17],[2,15]],
  [[28,16],[27,14],[25,13],[23,13],[21,14],[20,15],[19,17],[19,19],[20,21],[22,22],[24,22],[26,21],[27,19],[29,13],[28,18],[28,21],[29,22],[30,22],[32,21],[33,20],[35,17]],
  [[45,16],[44,14],[42,13],[40,13],[38,14],[37,15],[36,17],[36,19],[37,21],[39,22],[41,22],[43,21],[44,20]],
  [[46,13],[44,20],[40,31],[39,33],[37,34],[36,33],[36,31],[37,28],[40,25],[43,23],[45,22],[48,20],[51,17],[51,20],[53,19],[54,18],[55,16],[55,14],[54,13],[53,13],[51,14],[50,16],[50,19],[51,21],[53,22],[55,22],[57,21],[58,20],[60,17]],
];

type V = [number, number];

function dist(a: V, b: V) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

function lerp(a: V, b: V, k: number): V {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
}

function crSegment(p0: V, p1: V, p2: V, p3: V, n: number, out: V[]) {
  const e = 1e-4;
  const t0 = 0;
  const t1 = t0 + Math.sqrt(Math.max(dist(p0, p1), e));
  const t2 = t1 + Math.sqrt(Math.max(dist(p1, p2), e));
  const t3 = t2 + Math.sqrt(Math.max(dist(p2, p3), e));
  for (let k = 0; k < n; k++) {
    const t = t1 + ((t2 - t1) * k) / n;
    const a1 = lerp(p0, p1, (t - t0) / (t1 - t0));
    const a2 = lerp(p1, p2, (t - t1) / (t2 - t1));
    const a3 = lerp(p2, p3, (t - t2) / (t3 - t2));
    const b1 = lerp(a1, a2, (t - t0) / (t2 - t0));
    const b2 = lerp(a2, a3, (t - t1) / (t3 - t1));
    out.push(lerp(b1, b2, (t - t1) / (t2 - t1)));
  }
}

function smoothPath(raw: number[][], step: number): V[] {
  const pts = raw.map((p) => [p[0], p[1]] as V);
  const out: V[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p0 = i > 0 ? pts[i - 1] : ([2 * p1[0] - p2[0], 2 * p1[1] - p2[1]] as V);
    const p3 = i + 2 < pts.length ? pts[i + 2] : ([2 * p2[0] - p1[0], 2 * p2[1] - p1[1]] as V);
    crSegment(p0, p1, p2, p3, Math.max(2, Math.ceil(dist(p1, p2) / step)), out);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function movingAverage(values: number[], radius: number): number[] {
  return values.map((_, i) => {
    let sum = 0;
    let count = 0;
    for (let k = -radius; k <= radius; k++) {
      const v = values[i + k];
      if (v !== undefined) {
        sum += v;
        count++;
      }
    }
    return sum / count;
  });
}

let cache: PenWord | null = null;

export function samplePenWord(step = 0.14): PenWord {
  if (cache) return cache;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const strokes: PenStroke[] = RAW.map((raw) => {
    const pts = smoothPath(raw, step);
    const n = pts.length;
    const widths: number[] = [];
    const turns: number[] = [];
    const angles: number[] = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 3)];
      const b = pts[Math.min(n - 1, i + 3)];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      const down = dy / len; // +1 = straight down on screen
      widths.push(0.2 + 0.6 * Math.pow(Math.max(0, down), 1.15) + 0.06 * Math.abs(dx / len) * Math.max(0, down));
      angles.push(Math.atan2(dy, dx));
    }
    for (let i = 0; i < n; i++) {
      const prev = angles[Math.max(0, i - 1)];
      const next = angles[Math.min(n - 1, i + 1)];
      let d = next - prev;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      turns.push(Math.abs(d) / (2 * step));
    }
    const w = movingAverage(widths, 5);
    const turn = movingAverage(turns, 4);
    let t = 0;
    let length = 0;
    const samples: PenSample[] = pts.map((p, i) => {
      if (i > 0) {
        const ds = dist(pts[i - 1], p);
        length += ds;
        t += ds * (1 + 1.5 * turn[i]);
      }
      minX = Math.min(minX, p[0] - w[i]);
      maxX = Math.max(maxX, p[0] + w[i]);
      minY = Math.min(minY, p[1] - w[i]);
      maxY = Math.max(maxY, p[1] + w[i]);
      return { x: p[0], y: p[1], w: w[i], t };
    });
    return { samples, time: t, length };
  });
  cache = { strokes, bounds: { minX, minY, maxX, maxY } };
  return cache;
}
