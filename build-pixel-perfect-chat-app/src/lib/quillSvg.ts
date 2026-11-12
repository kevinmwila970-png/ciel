// Realistic quill generator. One source of truth for the sidebar logo, the
// favicon / PWA icons, and the opening animation. Everything is procedural:
// a curved rachis, individual feather barbs, split vanes, a brown-tipped
// vane, a translucent calamus and a silver ink nib.

type Pt = { x: number; y: number };

export type QuillOptions = {
  id: string;
  detail?: "full" | "small";
  drop?: boolean;
};

const P0: Pt = { x: 36, y: 172 };
const P1: Pt = { x: 72, y: 126 };
const P2: Pt = { x: 120, y: 74 };
const P3: Pt = { x: 178, y: 20 };

const T_START = 0.3;
const NIB_LEN = 17;

function bez(t: number): Pt {
  const m = 1 - t;
  return {
    x: m * m * m * P0.x + 3 * m * m * t * P1.x + 3 * m * t * t * P2.x + t * t * t * P3.x,
    y: m * m * m * P0.y + 3 * m * m * t * P1.y + 3 * m * t * t * P2.y + t * t * t * P3.y,
  };
}

function tangent(t: number): Pt {
  const m = 1 - t;
  const x = 3 * m * m * (P1.x - P0.x) + 6 * m * t * (P2.x - P1.x) + 3 * t * t * (P3.x - P2.x);
  const y = 3 * m * m * (P1.y - P0.y) + 6 * m * t * (P2.y - P1.y) + 3 * t * t * (P3.y - P2.y);
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}

function normal(t: number): Pt {
  const tg = tangent(t);
  return { x: -tg.y, y: tg.x };
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// side -1 = upper-left (wide vane), +1 = lower-right (narrow vane)
const SPLITS: { t: number; side: -1 | 1 }[] = [
  { t: 0.5, side: -1 },
  { t: 0.66, side: 1 },
  { t: 0.78, side: -1 },
];

function vaneH(t: number, side: -1 | 1): number {
  const u = (t - T_START) / (1 - T_START);
  if (u <= 0 || u >= 1) return 0;
  const f = Math.pow(Math.sin(Math.PI * Math.pow(u, 0.75)), 0.8);
  let h = (side < 0 ? 23 : 15) * f;
  for (const s of SPLITS) {
    if (s.side === side) h *= 1 - 0.2 * Math.exp(-Math.pow((t - s.t) / 0.011, 2));
  }
  return h;
}

function edge(t: number, side: -1 | 1, extra = 0): Pt {
  const c = bez(t);
  const n = normal(t);
  const h = vaneH(t, side) + extra;
  return { x: c.x + n.x * side * h, y: c.y + n.y * side * h };
}

const f1 = (n: number) => (Math.round(n * 10) / 10).toString();

/** Nib tip in the 200x200 viewBox: where the quill touches the paper. */
export const QUILL_NIB_TIP: Pt = (() => {
  const t0 = tangent(0);
  return { x: P0.x - t0.x * NIB_LEN, y: P0.y - t0.y * NIB_LEN };
})();

/** A point at the upper end of the feather, used for sparkles. */
export const QUILL_FEATHER_TIP: Pt = P3;

export function quillInner(opts: QuillOptions): string {
  const id = opts.id;
  const full = (opts.detail ?? "full") === "full";
  const rnd = mulberry32(full ? 7 : 11);
  const nBarbs = full ? 120 : 46;
  const barbW = full ? 0.62 : 1.5;
  const out: string[] = [];

  const axis = `x1="${P0.x}" y1="${P0.y}" x2="${P3.x}" y2="${P3.y}" gradientUnits="userSpaceOnUse"`;
  out.push(`<defs>
    <linearGradient id="${id}fv" ${axis}>
      <stop offset="0" stop-color="#faf9f5"/><stop offset="0.35" stop-color="#f1efe9"/>
      <stop offset="0.6" stop-color="#dedad1"/><stop offset="0.78" stop-color="#c4b8a4"/>
      <stop offset="0.9" stop-color="#8e7458"/><stop offset="1" stop-color="#4d3322"/>
    </linearGradient>
    <linearGradient id="${id}fl" ${axis}>
      <stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="#f8f6f1"/>
      <stop offset="0.78" stop-color="#e4d8c4"/><stop offset="0.9" stop-color="#b39b7b"/>
      <stop offset="1" stop-color="#6b4a31"/>
    </linearGradient>
    <linearGradient id="${id}fd" ${axis}>
      <stop offset="0" stop-color="#b3aea2"/><stop offset="0.6" stop-color="#a39d90"/>
      <stop offset="0.78" stop-color="#8a7a63"/><stop offset="0.9" stop-color="#5e4630"/>
      <stop offset="1" stop-color="#35231a"/>
    </linearGradient>
    <linearGradient id="${id}nib" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4f7fb"/><stop offset="0.32" stop-color="#b3bac4"/>
      <stop offset="0.56" stop-color="#eceff4"/><stop offset="1" stop-color="#666d77"/>
    </linearGradient>
    <linearGradient id="${id}cal" ${axis}>
      <stop offset="0" stop-color="#e6d8b6"/><stop offset="0.3" stop-color="#f3ead3"/><stop offset="1" stop-color="#f6f0e0"/>
    </linearGradient>
  </defs>`);

  // Vane silhouette (soft body of the feather).
  const left: string[] = [];
  const right: string[] = [];
  const steps = 70;
  for (let i = 0; i <= steps; i++) {
    const t = T_START + ((1 - T_START) * i) / steps;
    const l = edge(t, -1);
    const r = edge(t, 1);
    left.push(`${f1(l.x)} ${f1(l.y)}`);
    right.push(`${f1(r.x)} ${f1(r.y)}`);
  }
  const baseL = bez(T_START);
  out.push(
    `<path d="M${baseL.x.toFixed(1)} ${baseL.y.toFixed(1)} L${left.join(" L")} L${right.reverse().join(" L")} Z" fill="url(#${id}fv)" opacity="0.96"/>`,
  );

  // Individual barbs, both sides.
  for (const side of [-1, 1] as const) {
    const lines: { d: string; kind: number; w: number; o: number }[] = [];
    for (let i = 0; i < nBarbs; i++) {
      const t = T_START + 0.015 + (1 - T_START - 0.03) * (i / (nBarbs - 1));
      const split = SPLITS.find((s) => s.side === side && Math.abs(t - s.t) < 0.0065);
      const c = bez(t);
      const n = normal(t);
      const sx = c.x + n.x * side * 0.8;
      const sy = c.y + n.y * side * 0.8;
      if (split) {
        const e = edge(Math.min(1, t + 0.04), side, 1.5);
        lines.push({ d: `M${f1(sx)} ${f1(sy)} L${f1(e.x)} ${f1(e.y)}`, kind: 2, w: barbW * 1.15, o: 0.55 });
        continue;
      }
      const sweep = 0.065 + rnd() * 0.03;
      const te = Math.min(1, t + sweep);
      const jitter = full ? (rnd() - 0.25) * 1.6 : 0.4;
      const e = edge(te, side, jitter);
      const mx = (sx + e.x) / 2 - n.x * side * 1.1;
      const my = (sy + e.y) / 2 - n.y * side * 1.1;
      const r = rnd();
      const kind = r < 0.38 ? 0 : r < 0.74 ? 3 : 1;
      lines.push({
        d: `M${f1(sx)} ${f1(sy)} Q${f1(mx)} ${f1(my)} ${f1(e.x)} ${f1(e.y)}`,
        kind,
        w: barbW * (0.75 + rnd() * 0.6),
        o: kind === 0 ? 0.85 : kind === 1 ? 0.34 : 0.5,
      });
    }
    for (const kind of [1, 3, 0, 2]) {
      const group = lines.filter((l) => l.kind === kind);
      if (!group.length) continue;
      const stroke = kind === 0 ? `url(#${id}fl)` : kind === 2 ? "#6f6554" : kind === 3 ? `url(#${id}fv)` : `url(#${id}fd)`;
      out.push(
        `<g fill="none" stroke="${stroke}" stroke-linecap="round">${group
          .map((l) => `<path d="${l.d}" stroke-width="${f1(l.w)}" opacity="${l.o}"/>`)
          .join("")}</g>`,
      );
    }
  }

  // Rachis (central shaft of the vane).
  const rL: string[] = [];
  const rR: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = T_START - 0.02 + ((1 - T_START + 0.02) * i) / 40;
    const u = i / 40;
    const hw = 1.55 * Math.pow(1 - u, 0.85) + 0.18;
    const c = bez(t);
    const n = normal(t);
    rL.push(`${f1(c.x - n.x * hw)} ${f1(c.y - n.y * hw)}`);
    rR.push(`${f1(c.x + n.x * hw)} ${f1(c.y + n.y * hw)}`);
  }
  out.push(`<path d="M${rL.join(" L")} L${rR.reverse().join(" L")} Z" fill="#fbf6e6"/>`);
  const hi: string[] = [];
  const sh: string[] = [];
  for (let i = 0; i <= 30; i++) {
    const t = T_START + ((1 - T_START) * i) / 30;
    const u = i / 30;
    const hw = (1.55 * Math.pow(1 - u, 0.85) + 0.18) * 0.55;
    const c = bez(t);
    const n = normal(t);
    hi.push(`${f1(c.x - n.x * hw)} ${f1(c.y - n.y * hw)}`);
    sh.push(`${f1(c.x + n.x * hw)} ${f1(c.y + n.y * hw)}`);
  }
  out.push(`<path d="M${hi.join(" L")}" fill="none" stroke="#ffffff" stroke-width="0.5" opacity="0.9"/>`);
  out.push(`<path d="M${sh.join(" L")}" fill="none" stroke="#8d826c" stroke-width="0.45" opacity="0.6"/>`);

  // Calamus: the bare, translucent hollow quill below the vane.
  const cL: string[] = [];
  const cR: string[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = (T_START * i) / 24;
    const hw = 2.7 - 0.55 * (i / 24);
    const c = bez(t);
    const n = normal(t);
    cL.push(`${f1(c.x - n.x * hw)} ${f1(c.y - n.y * hw)}`);
    cR.push(`${f1(c.x + n.x * hw)} ${f1(c.y + n.y * hw)}`);
  }
  out.push(`<path d="M${cL.join(" L")} L${cR.reverse().join(" L")} Z" fill="url(#${id}cal)" stroke="#c7b68c" stroke-width="0.45"/>`);
  const ch: string[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = (T_START * i) / 24;
    const hw = (2.7 - 0.55 * (i / 24)) * 0.55;
    const c = bez(t);
    const n = normal(t);
    ch.push(`${f1(c.x - n.x * hw)} ${f1(c.y - n.y * hw)}`);
  }
  out.push(`<path d="M${ch.join(" L")}" fill="none" stroke="#ffffff" stroke-width="0.7" opacity="0.85"/>`);

  // Silver ink nib sleeved onto the calamus.
  const t0 = tangent(0);
  const angle = (Math.atan2(-t0.y, -t0.x) * 180) / Math.PI;
  out.push(`<g transform="translate(${P0.x} ${P0.y}) rotate(${f1(angle)})">
    <path d="M-5 -3.3 L7 -3.1 Q13 -1.9 ${NIB_LEN} 0 Q13 1.9 7 3.1 L-5 3.3 Z" fill="url(#${id}nib)" stroke="#575e68" stroke-width="0.35"/>
    <path d="M3 0 L${NIB_LEN - 0.4} 0" stroke="#1d2027" stroke-width="0.5" stroke-linecap="round"/>
    <circle cx="3.4" cy="0" r="0.9" fill="#1d2027"/>
    <path d="M-1 -2.3 L9.5 -1.7" stroke="#ffffff" stroke-width="0.55" stroke-linecap="round" opacity="0.85"/>
    <path d="M-5 -3.3 L-5 3.3" stroke="#3a3f47" stroke-width="0.6" opacity="0.55"/>
  </g>`);

  if (opts.drop) {
    const tip = QUILL_NIB_TIP;
    const dx = tip.x - 1.2;
    out.push(
      `<path d="M${f1(dx)} ${f1(tip.y + 3.6)} C${f1(dx + 1.3)} ${f1(tip.y + 6)} ${f1(dx + 3.1)} ${f1(tip.y + 7)} ${f1(dx + 3.1)} ${f1(tip.y + 8.8)} A3.1 3.1 0 0 1 ${f1(dx - 3.1)} ${f1(tip.y + 8.8)} C${f1(dx - 3.1)} ${f1(tip.y + 7)} ${f1(dx - 1.3)} ${f1(tip.y + 6)} ${f1(dx)} ${f1(tip.y + 3.6)} Z" fill="#0a0c13"/>`,
    );
    out.push(`<circle cx="${f1(dx + 1.2)}" cy="${f1(tip.y + 8)}" r="0.75" fill="#ffffff" opacity="0.8"/>`);
  }

  return out.join("");
}

export function quillSvgDocument(opts: QuillOptions, size = 200): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 200 200">${quillInner(opts)}</svg>`;
}

/** A point on the quill's shaft in the 200x200 viewBox, t in 0..1 (nib -> feather tip). */
export function quillShaftPoint(t: number): Pt {
  return bez(t);
}
