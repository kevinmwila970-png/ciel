// Cinematic 7-second opening. A realistic quill falls onto aged paper, an ink
// bottle reloads the nib, the quill writes "Sage" in cursive, the letters turn
// to gold and lift, becoming a book (S), a lightbulb (A), a graduation cap (G)
// and a speech bubble with a question mark (E). They orbit, merge into the Sage
// logotype, then burst into golden particles and the page turns away.
//
// Pure canvas 2D. One clock `t` in seconds. No DOM, no network.

import { QUILL_NIB_TIP } from "./quillSvg";
import { samplePenWord } from "./sageStrokes";

export const SPLASH_SECONDS = 7;

export type SceneOptions = {
  width: number;
  height: number;
  dpr: number;
  makeSurface: (w: number, h: number) => HTMLCanvasElement;
  quillImage: CanvasImageSource;
};

export type SplashScene = { draw: (ctx: CanvasRenderingContext2D, t: number) => void };

type Pt = { x: number; y: number };
type Pose = { cx: number; cy: number; theta: number; sx: number };

const INK = "#1a120c";
const GOLD = "#e9c46a";
const GOLD_HI = "#fff3cf";

const T_LAND = 0.95;
const T_PAPER0 = 0.55;
const T_PAPER1 = 1.15;
const T_BOTTLE_IN = 1.05;
const T_BOTTLE_OUT1 = 2.05;
const T_DROP_FALL = 1.5;
const T_IMPACT = 1.92;
const T_WRITE0 = 2.0;
const T_WRITE1 = 2.78;
const T_GLOW = 2.55;
const T_ORBIT0 = 3.65;
const T_MERGE0 = 4.85;
const T_MERGE1 = 5.4;
const T_LOGO = 5.35;
const T_SUB = 5.62;
const T_TAG = 5.95;
const T_BURST = 6.0;
const T_FLOURISH0 = 5.3;
const T_FLOURISH1 = 5.72;
const LIFT = 0.1;
const REST = -0.05;
const LETTERS = ["S", "A", "G", "E"] as const;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (v: number) => {
  const x = clamp(v);
  return x * x * (3 - 2 * x);
};
const easeSine = (v: number) => -(Math.cos(Math.PI * clamp(v)) - 1) / 2;
const easeOut = (v: number) => 1 - Math.pow(1 - clamp(v), 3);

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

export function createCinematicScene(o: SceneOptions): SplashScene {
  const W = o.width;
  const H = o.height;
  const dpr = o.dpr;
  const u = clamp(Math.min(W, H) / 780, 0.55, 1.2);

  // ---- quill raster -------------------------------------------------------
  const S = clamp(Math.min(W, H) * 0.46, 205, 380);
  const k = S / 200;
  const r0 = { x: QUILL_NIB_TIP.x * k - S / 2, y: QUILL_NIB_TIP.y * k - S / 2 };
  const quillSurf = o.makeSurface(Math.ceil(S * dpr), Math.ceil(S * dpr));
  quillSurf.getContext("2d")!.drawImage(o.quillImage, 0, 0, quillSurf.width, quillSurf.height);

  // ---- layout -------------------------------------------------------------
  const pw = Math.min(W * 0.86, 780);
  const ph = Math.min(H * 0.72, 470);
  const px = (W - pw) / 2;
  const py = (H - ph) / 2;
  const M = 46;

  const word = samplePenWord();
  const b = word.bounds;
  const bw = b.maxX - b.minX;
  const bh = b.maxY - b.minY;
  const s = Math.min((pw * 0.7) / bw, (ph * 0.46) / bh);
  const ox = px + pw / 2 - (b.minX + bw / 2) * s;
  const oy = py + ph * 0.44 - (b.minY + bh / 2) * s;
  const mapX = (x: number) => ox + x * s;
  const mapY = (y: number) => oy + y * s;
  const strokes = word.strokes;

  const startPt = (i: number): Pt => ({ x: mapX(strokes[i].samples[0].x), y: mapY(strokes[i].samples[0].y) });
  const endPt = (i: number): Pt => {
    const sm = strokes[i].samples;
    const p = sm[sm.length - 1];
    return { x: mapX(p.x), y: mapY(p.y) };
  };
  const nibStart = startPt(0);

  const wordLeft = mapX(b.minX);
  const wordRight = mapX(b.maxX);
  const baseline = mapY(b.maxY);
  const wordMid = (wordLeft + wordRight) / 2;
  const letterAnchors: Pt[] = LETTERS.map((_, i) => ({
    x: wordLeft + ((i + 0.5) * (wordRight - wordLeft)) / 4,
    y: baseline - (bh * s) * 0.45,
  }));

  const orbitC: Pt = { x: W / 2, y: H * 0.47 };
  const orbitR = Math.min(W, H) * 0.215;
  const logoFont = Math.round(clamp(Math.min(W, H) * 0.13, 44, 108));
  const logoTop = Math.round(H * 0.415);
  const quillLogoScale = clamp(Math.min(W, H) * 0.3, 150, 280) / S;

  // ---- paper --------------------------------------------------------------
  const paper = (() => {
    const rnd = mulberry32(42);
    const tw = Math.ceil(pw * dpr);
    const th = Math.ceil(ph * dpr);
    const tex = o.makeSurface(tw, th);
    const g = tex.getContext("2d")!;
    g.scale(dpr, dpr);
    const base = g.createLinearGradient(0, 0, pw, ph);
    base.addColorStop(0, "#f0e4c9");
    base.addColorStop(0.55, "#eadcbd");
    base.addColorStop(1, "#e0cfab");
    g.fillStyle = base;
    g.fillRect(0, 0, pw, ph);
    // coffee rings
    for (let c = 0; c < 3; c++) {
      const cx = pw * (0.18 + 0.3 * c) + (rnd() - 0.5) * 40;
      const cy = ph * (0.2 + 0.28 * c) + (rnd() - 0.5) * 40;
      const r = 34 + rnd() * 38;
      const ring = g.createRadialGradient(cx, cy, r * 0.55, cx, cy, r);
      ring.addColorStop(0, "rgba(140,98,48,0.05)");
      ring.addColorStop(0.78, "rgba(132,90,42,0.14)");
      ring.addColorStop(0.92, "rgba(112,72,32,0.22)");
      ring.addColorStop(1, "rgba(112,72,32,0)");
      g.fillStyle = ring;
      g.beginPath();
      g.arc(cx, cy, r, 0, Math.PI * 2);
      g.fill();
    }
    for (let i = 0; i < 900; i++) {
      const x = rnd() * pw;
      const y = rnd() * ph;
      g.strokeStyle = rnd() < 0.6 ? `rgba(120,90,55,${0.05 + rnd() * 0.09})` : `rgba(255,250,235,${0.08 + rnd() * 0.1})`;
      g.lineWidth = 0.5 + rnd() * 0.6;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + (rnd() - 0.5) * 12, y + (rnd() - 0.5) * 12, x + (rnd() - 0.5) * 24, y + (rnd() - 0.5) * 24);
      g.stroke();
    }
    const vg = g.createRadialGradient(pw / 2, ph / 2, Math.min(pw, ph) * 0.25, pw / 2, ph / 2, Math.max(pw, ph) * 0.72);
    vg.addColorStop(0, "rgba(110,78,40,0)");
    vg.addColorStop(1, "rgba(110,78,40,0.36)");
    g.fillStyle = vg;
    g.fillRect(0, 0, pw, ph);
    g.setTransform(1, 0, 0, 1, 0, 0);
    const img = g.getImageData(0, 0, tw, th);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (rnd() - 0.5) * 13;
      d[i] += n;
      d[i + 1] += n;
      d[i + 2] += n * 0.9;
    }
    g.putImageData(img, 0, 0);
    g.globalCompositeOperation = "destination-in";
    const rr = 5 * dpr;
    g.beginPath();
    g.moveTo(rr, 0);
    g.arcTo(tw, 0, tw, th, rr);
    g.arcTo(tw, th, 0, th, rr);
    g.arcTo(0, th, 0, 0, rr);
    g.arcTo(0, 0, tw, 0, rr);
    g.closePath();
    g.fillStyle = "#000";
    g.fill();
    const out = o.makeSurface(Math.ceil((pw + 2 * M) * dpr), Math.ceil((ph + 2 * M) * dpr));
    const og = out.getContext("2d")!;
    og.scale(dpr, dpr);
    og.shadowColor = "rgba(0,0,0,0.6)";
    og.shadowBlur = 34 * dpr;
    og.shadowOffsetY = 14 * dpr;
    og.drawImage(tex, M, M, pw, ph);
    return out;
  })();

  // ---- ink layer ----------------------------------------------------------
  const inkSurf = o.makeSurface(Math.ceil(W * dpr), Math.ceil(H * dpr));
  const ictx = inkSurf.getContext("2d")!;
  ictx.scale(dpr, dpr);
  const drawn = strokes.map(() => -1);

  function inkSegment(i: number, idx: number) {
    const st = strokes[i].samples;
    const p = st[idx];
    const a = idx > 0 ? st[idx - 1] : p;
    const wpx = Math.max(1.1, p.w * s);
    ictx.save();
    ictx.lineCap = "round";
    ictx.lineJoin = "round";
    ictx.strokeStyle = INK;
    ictx.fillStyle = INK;
    if (idx === 0) {
      ictx.beginPath();
      ictx.arc(mapX(p.x), mapY(p.y), wpx * 0.5, 0, Math.PI * 2);
      ictx.fill();
    } else {
      ictx.lineWidth = wpx;
      ictx.beginPath();
      ictx.moveTo(mapX(a.x), mapY(a.y));
      ictx.lineTo(mapX(p.x), mapY(p.y));
      ictx.stroke();
    }
    ictx.restore();
  }

  // ---- pen schedule -------------------------------------------------------
  const totalEffort = strokes.reduce((a, st) => a + st.time, 0);
  const writeTime = T_WRITE1 - T_WRITE0 - LIFT * (strokes.length - 1);
  type Seg = { kind: "stroke" | "lift"; i: number; t0: number; t1: number };
  const segs: Seg[] = [];
  {
    let cursor = T_WRITE0;
    strokes.forEach((st, i) => {
      const dur = (writeTime * st.time) / totalEffort;
      segs.push({ kind: "stroke", i, t0: cursor, t1: cursor + dur });
      cursor += dur;
      if (i < strokes.length - 1) {
        segs.push({ kind: "lift", i, t0: cursor, t1: cursor + LIFT });
        cursor += LIFT;
      }
    });
  }

  type Pen = { x: number; y: number; lift: number; targets: number[]; active: number; sf: number };

  function penAt(t: number): Pen {
    const targets = strokes.map(() => -1);
    if (t < T_WRITE0) return { x: nibStart.x, y: nibStart.y, lift: 0, targets, active: -1, sf: 0 };
    for (const seg of segs) {
      if (t >= seg.t1) {
        if (seg.kind === "stroke") targets[seg.i] = strokes[seg.i].samples.length - 1;
        continue;
      }
      if (seg.kind === "stroke") {
        const st = strokes[seg.i];
        const tau = clamp((t - seg.t0) / (seg.t1 - seg.t0));
        const e = 0.35 * tau + 0.65 * easeSine(tau);
        const effort = e * st.time;
        let lo = 0;
        let hi = st.samples.length - 1;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (st.samples[mid].t < effort) lo = mid + 1;
          else hi = mid;
        }
        const j = Math.max(1, lo);
        const a = st.samples[j - 1];
        const c = st.samples[j];
        const f = clamp((effort - a.t) / (c.t - a.t || 1));
        targets[seg.i] = Math.floor(j - 1 + f);
        return { x: mapX(a.x + (c.x - a.x) * f), y: mapY(a.y + (c.y - a.y) * f), lift: 0, targets, active: seg.i, sf: j - 1 + f };
      }
      const from = endPt(seg.i);
      const to = startPt(seg.i + 1);
      const tau = clamp((t - seg.t0) / (seg.t1 - seg.t0));
      const lift = Math.sin(Math.PI * tau) * 24 * u;
      return { x: from.x + (to.x - from.x) * easeSine(tau), y: from.y + (to.y - from.y) * easeSine(tau) - lift, lift, targets, active: -1, sf: 0 };
    }
    const last = endPt(strokes.length - 1);
    return { x: last.x, y: last.y, lift: 0, targets, active: -1, sf: 0 };
  }

  // ---- quill pose ---------------------------------------------------------
  function poseFromNib(nx: number, ny: number, theta: number, sc = 1): Pose {
    const c = Math.cos(theta);
    const sn = Math.sin(theta);
    const rx = r0.x * sc;
    return { cx: nx - (c * rx - sn * r0.y), cy: ny - (sn * rx + c * r0.y), theta, sx: sc };
  }

  const restPose = poseFromNib(nibStart.x, nibStart.y, REST);
  const logoNib: Pt = { x: W / 2 - Math.min(W, H) * 0.055, y: logoTop - logoFont * 0.82 };
  const restNib: Pt = {
    x: Math.min(W - 30 * u, W / 2 + logoFont * 1.5 + 22 * u),
    y: logoTop + logoFont * 0.2,
  };

  function quillPose(t: number, pen: Pen): Pose {
    if (t < T_LAND) {
      const p = clamp(t / T_LAND);
      const rem = 1 - Math.pow(p, 1.25);
      const damp = Math.pow(1 - p, 0.9);
      const tau = Math.PI * 2;
      return {
        cx: restPose.cx + Math.sin(t * tau * 1.1 + 0.5) * 62 * u * damp,
        cy: restPose.cy - rem * (restPose.cy + S * 0.75),
        theta: REST + (0.5 * Math.sin(t * tau * 1.45 + 0.3) + 0.14 * Math.sin(t * tau * 3.1)) * damp,
        sx: 1 - 0.1 * Math.abs(Math.sin(t * tau * 1.25)) * damp,
      };
    }
    if (t < T_WRITE0) {
      const q = t - T_LAND;
      const bounce = 14 * u * Math.exp(-7 * q) * Math.abs(Math.sin(2 * Math.PI * 1.7 * q));
      return poseFromNib(nibStart.x, nibStart.y - bounce, REST + 0.05 * Math.exp(-5 * q) * Math.sin(2 * Math.PI * 2.3 * q));
    }
    if (t < T_WRITE1) {
      const wob = 0.015 * Math.sin(t * Math.PI * 2 * 3.2) - 0.05 * (pen.lift / (22 * u));
      return poseFromNib(pen.x - pen.lift * 0.3, pen.y - pen.lift * 0.85, REST + wob);
    }
    if (t < T_ORBIT0 - 0.25) {
      const e = smooth((t - T_WRITE1) / (T_ORBIT0 - 0.25 - T_WRITE1));
      const from = endPt(strokes.length - 1);
      return poseFromNib(from.x + (orbitC.x - from.x) * e, from.y + (orbitC.y - from.y) * e - Math.sin(Math.PI * e) * 26 * u, REST + 0.2 * e, 1 - 0.3 * e);
    }
    if (t < T_MERGE0) {
      const q = (t - (T_ORBIT0 - 0.25)) * 2.0;
      const drift = Math.sin(q * 1.1) * 0.05;
      return { cx: orbitC.x, cy: orbitC.y + Math.sin(q) * 6 * u, theta: REST + 0.22 + q * 0.22 + drift, sx: 0.7 };
    }
    if (t < T_FLOURISH0) {
      const e = smooth((t - T_MERGE0) / (T_MERGE1 - T_MERGE0));
      const spin = REST + 0.22 + (T_MERGE0 - T_ORBIT0 + 0.25) * 2 * 0.22 + (1 - e) * 1.6;
      return poseFromNib(
        orbitC.x + (logoNib.x - orbitC.x) * e,
        orbitC.y + (logoNib.y - orbitC.y) * e,
        spin,
        0.7 + (quillLogoScale - 0.7) * e,
      );
    }
    // flourish: underline sweep beneath the logotype, then set the quill down
    // beside it so the feather never covers the word.
    const e = clamp((t - T_FLOURISH0) / (T_FLOURISH1 - T_FLOURISH0));
    const lineY = logoTop + logoFont * 0.42;
    const left = W / 2 - logoFont * 1.55;
    const right = W / 2 + logoFont * 1.55;
    const x = left + (right - left) * easeSine(e);
    const y = lineY + Math.sin(e * Math.PI * 1.05) * 5 * u;
    const settle = smooth((t - T_FLOURISH1) / 0.26);
    const nx = x + (restNib.x - x) * settle;
    const ny = y + (restNib.y - y) * settle;
    // Rotate toward upright as it settles so the feather rises clear of the text.
    const th = REST - 0.12 + 0.1 * Math.sin(e * Math.PI) + settle * 0.42;
    const sc = quillLogoScale * (0.92 - 0.34 * settle);
    const bob = settle > 0 ? Math.sin((t - T_FLOURISH1) * 1.7) * 2 * u : 0;
    return poseFromNib(nx, ny - bob, th, sc);
  }

  function drawQuill(ctx: CanvasRenderingContext2D, pose: Pose, lift: number, glow = 0) {
    ctx.save();
    if (glow > 0) {
      ctx.shadowColor = `rgba(233,196,106,${0.55 * glow})`;
      ctx.shadowBlur = 26 * u * dpr;
    } else {
      ctx.shadowColor = "rgba(0,0,0,0.42)";
      ctx.shadowBlur = (12 + lift * 0.4) * u * dpr;
      ctx.shadowOffsetX = 11 * u * dpr;
      ctx.shadowOffsetY = (15 + lift * 0.6) * u * dpr;
    }
    ctx.translate(pose.cx, pose.cy);
    ctx.rotate(pose.theta);
    ctx.scale(pose.sx, 1);
    ctx.drawImage(quillSurf, -S / 2, -S / 2, S, S);
    ctx.restore();
  }

  // ---- ink bottle, drop ---------------------------------------------------
  function drawBottle(ctx: CanvasRenderingContext2D, mx: number, my: number, theta: number, alpha: number) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(mx, my);
    ctx.rotate(theta);
    ctx.scale(u, u);
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(-7, 0);
      ctx.lineTo(-7, 12);
      ctx.quadraticCurveTo(-7, 20, -20, 24);
      ctx.quadraticCurveTo(-28, 27, -28, 38);
      ctx.lineTo(-28, 74);
      ctx.quadraticCurveTo(-28, 86, -16, 86);
      ctx.lineTo(16, 86);
      ctx.quadraticCurveTo(28, 86, 28, 74);
      ctx.lineTo(28, 38);
      ctx.quadraticCurveTo(28, 27, 20, 24);
      ctx.quadraticCurveTo(7, 20, 7, 12);
      ctx.lineTo(7, 0);
      ctx.closePath();
    };
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 16 * dpr;
    ctx.shadowOffsetY = 7 * dpr;
    body();
    ctx.fillStyle = "#0b0d14";
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.save();
    body();
    ctx.clip();
    const ink = ctx.createLinearGradient(0, 14, 0, 86);
    ink.addColorStop(0, "#050609");
    ink.addColorStop(1, "#1d2232");
    ctx.fillStyle = ink;
    ctx.fillRect(-30, 14, 60, 74);
    const glass = ctx.createLinearGradient(-28, 0, 28, 0);
    glass.addColorStop(0, "rgba(230,242,250,0.32)");
    glass.addColorStop(0.35, "rgba(200,220,235,0.04)");
    glass.addColorStop(0.8, "rgba(200,220,235,0.1)");
    glass.addColorStop(1, "rgba(230,242,250,0.26)");
    ctx.fillStyle = glass;
    ctx.fillRect(-30, 0, 60, 90);
    ctx.restore();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "rgba(225,238,248,0.55)";
    body();
    ctx.stroke();
    ctx.fillStyle = "rgba(236,224,196,0.9)";
    ctx.fillRect(-18, 50, 36, 22);
    ctx.fillStyle = "rgba(40,28,20,0.65)";
    ctx.fillRect(-12, 56, 24, 1.5);
    ctx.fillRect(-9, 62, 18, 1.1);
    const collar = ctx.createLinearGradient(-9, 0, 9, 0);
    collar.addColorStop(0, "#9aa2ab");
    collar.addColorStop(0.5, "#eef1f4");
    collar.addColorStop(1, "#8b939c");
    ctx.fillStyle = collar;
    ctx.fillRect(-9, -5, 18, 8);
    ctx.restore();
  }

  function drawDrop(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, stretch: number) {
    ctx.save();
    ctx.fillStyle = "#0a0c13";
    ctx.beginPath();
    ctx.moveTo(x, y - r * (1.1 + stretch * 1.8));
    ctx.bezierCurveTo(x + r * 0.35, y - r * 0.4, x + r, y - r * 0.2, x + r, y);
    ctx.arc(x, y, r, 0, Math.PI, false);
    ctx.bezierCurveTo(x - r, y - r * 0.2, x - r * 0.35, y - r * 0.4, x, y - r * (1.1 + stretch * 1.8));
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.beginPath();
    ctx.arc(x + r * 0.35, y - r * 0.15, Math.max(0.5, r * 0.22), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---- gold helpers -------------------------------------------------------
  function goldFill(ctx: CanvasRenderingContext2D, size: number) {
    const g = ctx.createLinearGradient(0, -size, 0, size);
    g.addColorStop(0, "#fff6dc");
    g.addColorStop(0.42, GOLD);
    g.addColorStop(1, "#a97b2c");
    return g;
  }

  function star(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, a: number) {
    if (a <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(x, y, 0, x, y, size);
    g.addColorStop(0, `rgba(255,244,214,${0.8 * a})`);
    g.addColorStop(1, "rgba(255,244,214,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    const L = size * 0.85;
    const w = size * 0.1;
    ctx.fillStyle = `rgba(255,252,240,${Math.min(1, a * 1.25)})`;
    ctx.beginPath();
    ctx.moveTo(x, y - L);
    ctx.quadraticCurveTo(x + w, y - w, x + L, y);
    ctx.quadraticCurveTo(x + w, y + w, x, y + L);
    ctx.quadraticCurveTo(x - w, y + w, x - L, y);
    ctx.quadraticCurveTo(x - w, y - w, x, y - L);
    ctx.fill();
    ctx.restore();
  }

  // ---- the four icons -----------------------------------------------------
  function drawBook(ctx: CanvasRenderingContext2D, size: number, open: number) {
    const w = size;
    const h = size * 0.72;
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = size * 0.22;
    for (const dir of [-1, 1]) {
      ctx.save();
      ctx.scale(dir, 1);
      ctx.translate(0, -h * 0.12);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(w * 0.5, -h * 0.16);
      ctx.lineTo(w * 0.5, h * 0.58);
      ctx.lineTo(0, h * 0.72);
      ctx.closePath();
      ctx.fillStyle = dir < 0 ? "#f7ecd2" : "#efe1c2";
      ctx.fill();
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = Math.max(1.2, size * 0.035);
      ctx.stroke();
      ctx.clip();
      ctx.strokeStyle = "rgba(120,90,52,0.55)";
      ctx.lineWidth = Math.max(0.8, size * 0.018);
      for (let i = 0; i < 4; i++) {
        const y = h * (0.06 + i * 0.15);
        ctx.beginPath();
        ctx.moveTo(w * 0.1, y);
        ctx.lineTo(w * 0.42, y - h * 0.06);
        ctx.stroke();
      }
      if (dir < 0) {
        ctx.fillStyle = "rgba(233,196,106,0.55)";
        ctx.beginPath();
        ctx.moveTo(w * 0.44, -h * 0.14 + (h * 0.74 - h * 0.14) * 0.18 * (1 - open));
        ctx.lineTo(w * 0.5, -h * 0.16);
        ctx.lineTo(w * 0.5, h * 0.58);
        ctx.lineTo(w * 0.44, h * 0.56);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  function drawBulb(ctx: CanvasRenderingContext2D, size: number, on: number) {
    const r = size * 0.34;
    ctx.save();
    if (on > 0) {
      const g = ctx.createRadialGradient(0, -size * 0.1, 0, 0, -size * 0.1, size * 0.5);
      g.addColorStop(0, `rgba(255,222,140,${0.3 * on})`);
      g.addColorStop(0.55, `rgba(255,214,120,${0.12 * on})`);
      g.addColorStop(1, "rgba(255,214,120,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -size * 0.1, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(0, -size * 0.1, r, Math.PI * 1.12, Math.PI * -0.12);
    ctx.lineTo(size * 0.11, size * 0.28);
    ctx.lineTo(-size * 0.11, size * 0.28);
    ctx.closePath();
    ctx.fillStyle = on > 0.4 ? "#fff4cf" : "rgba(247,236,210,0.9)";
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = Math.max(1.2, size * 0.04);
    ctx.stroke();
    ctx.strokeStyle = on > 0.4 ? "#c98a13" : "#8a7440";
    ctx.lineWidth = Math.max(1, size * 0.026);
    ctx.beginPath();
    ctx.moveTo(-size * 0.06, size * 0.05);
    ctx.quadraticCurveTo(size * 0.04, size * 0.14, -size * 0.02, size * 0.22);
    ctx.stroke();
    ctx.fillStyle = "#b9a06a";
    ctx.fillRect(-size * 0.11, size * 0.3, size * 0.22, size * 0.05);
    ctx.fillRect(-size * 0.09, size * 0.37, size * 0.18, size * 0.045);
    if (on > 0) {
      ctx.strokeStyle = `rgba(255,232,160,${0.85 * on})`;
      ctx.lineWidth = Math.max(1.1, size * 0.03);
      for (let i = 0; i < 6; i++) {
        const a = -Math.PI * 0.85 + (i * Math.PI) / 5;
        const r1 = r * 1.25;
        const r2 = r * (1.5 + 0.1 * on);
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r1, -size * 0.1 + Math.sin(a) * r1);
        ctx.lineTo(Math.cos(a) * r2, -size * 0.1 + Math.sin(a) * r2);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawCap(ctx: CanvasRenderingContext2D, size: number) {
    const w = size * 0.62;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = size * 0.18;
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.22);
    ctx.lineTo(w, -size * 0.04);
    ctx.lineTo(0, size * 0.14);
    ctx.lineTo(-w, -size * 0.04);
    ctx.closePath();
    ctx.fillStyle = goldFill(ctx, size);
    ctx.fill();
    ctx.strokeStyle = "#9c7420";
    ctx.lineWidth = Math.max(1, size * 0.022);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-size * 0.28, size * 0.05);
    ctx.lineTo(-size * 0.28, size * 0.3);
    ctx.quadraticCurveTo(0, size * 0.44, size * 0.28, size * 0.3);
    ctx.lineTo(size * 0.28, size * 0.05);
    ctx.strokeStyle = "#7a5a18";
    ctx.lineWidth = Math.max(1.2, size * 0.03);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.92, -size * 0.02);
    ctx.lineTo(w * 0.95, size * 0.36);
    ctx.strokeStyle = GOLD;
    ctx.stroke();
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.arc(w * 0.95, size * 0.4, size * 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBubble(ctx: CanvasRenderingContext2D, size: number) {
    const w = size * 0.92;
    const h = size * 0.66;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = size * 0.2;
    const r = h * 0.3;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + r, -h / 2);
    ctx.lineTo(w / 2 - r, -h / 2);
    ctx.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    ctx.lineTo(w / 2, h / 2 - r);
    ctx.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    ctx.lineTo(-w * 0.08, h / 2);
    ctx.lineTo(-w * 0.2, h / 2 + h * 0.26);
    ctx.lineTo(-w * 0.22, h / 2);
    ctx.lineTo(-w / 2 + r, h / 2);
    ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    ctx.lineTo(-w / 2, -h / 2 + r);
    ctx.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    ctx.closePath();
    ctx.fillStyle = "rgba(250,242,222,0.97)";
    ctx.fill();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = Math.max(1.3, size * 0.038);
    ctx.stroke();
    ctx.fillStyle = "#8a5c10";
    ctx.font = `700 ${size * 0.42}px "Times New Roman", Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("?", 0, h * 0.02);
    ctx.restore();
  }

  const icons = [drawBook, drawBulb, drawCap, drawBubble];

  // ---- starfield + floating books -----------------------------------------
  const rndS = mulberry32(2026);
  const stars = Array.from({ length: 110 }, () => ({
    x: rndS() * W,
    y: rndS() * H,
    r: (0.6 + rndS() * 1.7) * u,
    ph: rndS() * Math.PI * 2,
    sp: 0.6 + rndS() * 1.4,
  }));
  const floaters = Array.from({ length: 7 }, (_, i) => ({
    x: (i + 0.5) / 7 * W + (rndS() - 0.5) * 90,
    y: rndS() * H,
    sc: (0.5 + rndS() * 0.8) * u,
    ph: rndS() * Math.PI * 2,
    sp: 0.25 + rndS() * 0.4,
  }));

  // ---- particles ----------------------------------------------------------
  const rndP = mulberry32(77);
  const burst = Array.from({ length: 90 }, () => {
    const a = rndP() * Math.PI * 2;
    const sp = (140 + rndP() * 380) * u;
    return { a, sp, r: (1.2 + rndP() * 2.6) * u, ph: rndP() * 6 };
  });

  // ---- splash droplets ----------------------------------------------------
  const droplets = Array.from({ length: 14 }, () => {
    const a = -Math.PI * (0.1 + 0.8 * rndP());
    const sp = (70 + 150 * rndP()) * u;
    return { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: (1 + 1.5 * rndP()) * u, life: 0.35 + rndP() * 0.3 };
  });

  // ---- letter schedule ----------------------------------------------------
  const letterStart = (i: number) => 2.3 + i * 0.12;
  const transformStart = (i: number) => 3.25 + i * 0.1;
  const orbitAngle0 = [-Math.PI * 0.75, -Math.PI * 0.25, Math.PI * 0.25, Math.PI * 0.75];

  function letterState(i: number, t: number) {
    const lift = smooth((t - letterStart(i)) / 0.55);
    const morph = smooth((t - transformStart(i)) / 0.5);
    const orbit = smooth((t - T_ORBIT0) / 0.5);
    const merge = smooth((t - T_MERGE0) / (T_MERGE1 - T_MERGE0));
    const rise = 105 * u * lift;
    const spin = (t - T_ORBIT0) * 0.75;
    const ang = orbitAngle0[i] + orbit * spin;
    const ox = orbitC.x + Math.cos(ang) * orbitR;
    const oy = orbitC.y + Math.sin(ang) * orbitR * 0.8;
    const from: Pt = { x: letterAnchors[i].x, y: letterAnchors[i].y - rise };
    const x = from.x + (ox - from.x) * orbit + (orbitC.x - (from.x + (ox - from.x) * orbit)) * merge;
    const y = from.y + (oy - from.y) * orbit + (orbitC.y - (from.y + (oy - from.y) * orbit)) * merge;
    const size = clamp(Math.min(W, H) * 0.085, 30, 64) * (1 + 0.18 * morph) * (1 - 0.55 * merge);
    return { x, y, lift, morph, merge, ang, size, alpha: lift > 0 ? 1 - merge : 0 };
  }

  // ---- logo type ----------------------------------------------------------
  const logoTyped = "Sage";
  const subtitle = "A room for curious minds";
  const tagline = "Socratic AI study tutor that teaches you how to think not what to think";
  const subPx = Math.round(clamp(Math.min(W, H) * 0.033, 15, 26));
  const tagPx = Math.round(clamp(Math.min(W, H) * 0.019, 11, 15));

  function textLine(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, font: string, color: string, progress: number, stagger = 0.018) {
    ctx.font = font;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const total = ctx.measureText(text).width;
    const x0 = cx - total / 2;
    for (let i = 0; i < text.length; i++) {
      const a = clamp((progress - i * stagger) / 0.18);
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = color;
      const prefix = ctx.measureText(text.slice(0, i)).width;
      ctx.fillText(text[i], x0 + prefix, y + (1 - a) * 4);
    }
    ctx.globalAlpha = 1;
  }

  let blotted = false;
  let stamped = false;

  return {
    draw(ctx, t) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      // night background with warm aura
      ctx.fillStyle = "#0f0f0f";
      ctx.fillRect(0, 0, W, H);
      const glow = clamp((t - 0.4) / 1.4);
      const lg = ctx.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H * 0.46, Math.max(W, H) * 0.7);
      lg.addColorStop(0, `rgba(96,74,40,${0.32 * glow})`);
      lg.addColorStop(1, "rgba(96,74,40,0)");
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, W, H);

      // starfield fades in as the paper fades out
      const starA = smooth((t - 4.55) / 1.1);
      if (starA > 0) {
        for (const st of stars) {
          const tw = 0.45 + 0.55 * Math.sin(t * st.sp + st.ph);
          ctx.globalAlpha = starA * tw;
          ctx.fillStyle = st.r > 1.5 * u ? "#fff6dd" : "#cfd6e0";
          ctx.beginPath();
          ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        for (const fb of floaters) {
          const y = fb.y + Math.sin(t * fb.sp + fb.ph) * 16 * u;
          const a = starA * 0.5;
          ctx.save();
          ctx.globalAlpha = a;
          ctx.translate(fb.x, y);
          ctx.rotate(Math.sin(t * fb.sp + fb.ph) * 0.08);
          drawBook(ctx, fb.sc * 46, 0.4);
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      }

      // paper fades out into the night
      const paperOut = smooth((t - 4.9) / 0.9);
      const paperIn = smooth((t - T_PAPER0) / (T_PAPER1 - T_PAPER0));
      if (paperIn > 0 && paperOut < 1) {
        const sc = 0.985 + 0.015 * paperIn;
        ctx.save();
        ctx.globalAlpha = paperIn * (1 - paperOut);
        ctx.translate(W / 2, H / 2);
        ctx.scale(sc, sc);
        ctx.translate(-W / 2, -H / 2);
        ctx.drawImage(paper, px - M, py - M, pw + 2 * M, ph + 2 * M);
        ctx.restore();
      }

      // ink strokes
      const pen = penAt(t);
      for (let i = 0; i < strokes.length; i++) {
        while (drawn[i] < pen.targets[i]) {
          drawn[i]++;
          inkSegment(i, drawn[i]);
        }
      }
      if (t >= T_IMPACT && !blotted) {
        blotted = true;
        ictx.save();
        ictx.fillStyle = INK;
        ictx.beginPath();
        ictx.arc(nibStart.x, nibStart.y, 3 * u, 0, Math.PI * 2);
        ictx.fill();
        ictx.restore();
      }
      const inkFade = 1 - smooth((t - 2.9) / 0.55) * 0.72;
      ctx.save();
      ctx.globalAlpha = inkFade * (1 - paperOut * 0.6);
      ctx.drawImage(inkSurf, 0, 0, W, H);
      ctx.restore();

      // ink wash behind the lifting letters
      if (t > T_GLOW && t < T_MERGE0) {
        const wa = smooth((t - T_GLOW) / 0.6) * (1 - smooth((t - 4.5) / 0.4));
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        const wg = ctx.createRadialGradient(wordMid, baseline - 40 * u, 0, wordMid, baseline - 40 * u, Math.max(pw * 0.4, 160) * u);
        wg.addColorStop(0, `rgba(233,196,106,${0.14 * wa})`);
        wg.addColorStop(1, "rgba(233,196,106,0)");
        ctx.fillStyle = wg;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }

      // the four letters / icons
      for (let i = 0; i < LETTERS.length; i++) {
        const st = letterState(i, t);
        if (st.alpha <= 0) continue;
        ctx.save();
        ctx.globalAlpha = st.alpha;
        ctx.translate(st.x, st.y);
        // sparkle trail while rising
        if (st.lift > 0 && st.merge < 1 && t < T_ORBIT0 + 0.3) {
          for (let k = 0; k < 3; k++) {
            const ky = -k * 13 * u;
            star(ctx, (k - 1) * 7 * u, ky, (5 - k * 1.2) * u, 0.5 * st.lift * (1 - k / 3));
          }
        }
        const iconScale = 1.9 * u;
        if (st.morph < 1) {
          ctx.globalAlpha = st.alpha * (1 - st.morph);
          ctx.font = `700 ${st.size}px "Times New Roman", Georgia, serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.shadowColor = "rgba(233,196,106,0.85)";
          ctx.shadowBlur = 22 * u * dpr;
          ctx.fillStyle = goldFill(ctx, st.size);
          ctx.fillText(LETTERS[i], 0, 0);
          ctx.shadowBlur = 0;
        }
        if (st.morph > 0) {
          const pop = 0.6 + 0.4 * easeOut(st.morph);
          ctx.globalAlpha = st.alpha * st.morph;
          ctx.scale(pop, pop);
          ctx.rotate(Math.sin(t * 1.4 + i) * 0.06);
          icons[i](ctx, st.size * iconScale * 0.62, st.morph);
        }
        ctx.restore();
      }

      // merge flash
      if (t >= T_MERGE0 && t < T_BURST + 0.1) {
        const q = clamp((t - T_MERGE0) / 0.55);
        const burstOut = smooth((t - T_MERGE1) / 0.4);
        const a = Math.sin(Math.PI * q) * (1 - burstOut);
        if (a > 0) {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          const g = ctx.createRadialGradient(orbitC.x, orbitC.y, 0, orbitC.x, orbitC.y, 220 * u);
          g.addColorStop(0, `rgba(255,246,214,${0.75 * a})`);
          g.addColorStop(0.5, `rgba(233,196,106,${0.28 * a})`);
          g.addColorStop(1, "rgba(233,196,106,0)");
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
        }
      }

      // bottle + falling drop
      if (t >= T_BOTTLE_IN && t < T_BOTTLE_OUT1) {
        const a = smooth((t - T_BOTTLE_IN) / 0.5);
        const out = smooth((t - 1.95) / 0.25);
        const bx = nibStart.x + (pw * 0.36);
        const by = nibStart.y - (170 + 40 * (1 - a) + 60 * out) * u;
        drawBottle(ctx, bx, by, ((118 + 34 * a) * Math.PI) / 180, smooth((t - T_BOTTLE_IN) / 0.25) * (1 - out));
        if (t >= 1.42 && t < T_IMPACT) {
          const rr = 4.2 * u;
          const y0 = by + 4 * u;
          if (t < T_DROP_FALL) {
            const f = smooth((t - 1.42) / (T_DROP_FALL - 1.42));
            drawDrop(ctx, bx, y0 + 20 * u * f, rr * f, 0.1 * f);
          } else {
            const q = clamp((t - T_DROP_FALL) / (T_IMPACT - T_DROP_FALL));
            drawDrop(ctx, bx + (nibStart.x - bx) * q, y0 + 20 * u + (nibStart.y - y0 - 20 * u) * q * q, rr * (1 - 0.1 * q), 0.35 + 0.6 * q);
          }
        }
      }

      // impact ripple + droplets
      const ti = t - T_IMPACT;
      if (ti >= 0 && ti < 0.8) {
        ctx.save();
        for (const d of droplets) {
          if (ti > d.life) continue;
          ctx.globalAlpha = 1 - ti / d.life;
          ctx.fillStyle = "#0a0c13";
          ctx.beginPath();
          ctx.arc(nibStart.x + d.vx * ti, nibStart.y + d.vy * ti + 0.5 * 900 * u * ti * ti, d.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
        const q = clamp(ti / 0.55);
        ctx.strokeStyle = `rgba(255,232,170,${0.5 * (1 - q)})`;
        ctx.lineWidth = 1.4 * u;
        ctx.beginPath();
        ctx.ellipse(nibStart.x, nibStart.y + 2 * u, 4 * u + 34 * u * easeOut(q), (4 * u + 34 * u * easeOut(q)) * 0.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.strokeStyle = `rgba(233,196,106,${0.35 * (1 - q)})`;
        ctx.beginPath();
        ctx.ellipse(nibStart.x, nibStart.y + 2 * u, (4 * u + 34 * u * easeOut(q)) * 0.62, (4 * u + 34 * u * easeOut(q)) * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // nib golden glow after the drop lands
      const nibGlow = smooth((t - T_IMPACT) / 0.35) * (1 - smooth((t - T_ORBIT0) / 0.6));
      if (nibGlow > 0) {
        const pose = quillPose(t, pen);
        const c = Math.cos(pose.theta);
        const sn = Math.sin(pose.theta);
        const gx = pose.cx + c * r0.x - sn * r0.y;
        const gy = pose.cy + sn * r0.x + c * r0.y;
        const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 40 * u);
        g.addColorStop(0, `rgba(255,240,190,${0.8 * nibGlow})`);
        g.addColorStop(1, "rgba(255,240,190,0)");
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(gx, gy, 40 * u, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // the quill
      const pose = quillPose(t, pen);
      const magicGlow = smooth((t - T_GLOW) / 0.4) * (1 - smooth((t - 5.7) / 0.4)) * 0.8;
      drawQuill(ctx, pose, pen.lift, magicGlow);

      // freshly written sheen
      if (pen.active >= 0 && t < T_WRITE1 + 0.15) {
        const st = strokes[pen.active].samples;
        const end = Math.floor(pen.sf);
        const begin = Math.max(1, end - 22);
        ctx.save();
        ctx.lineCap = "round";
        for (let j = begin; j <= end; j++) {
          const recent = (j - begin) / Math.max(1, end - begin);
          ctx.strokeStyle = `rgba(225,232,248,${0.3 * recent})`;
          ctx.lineWidth = Math.max(0.7, st[j].w * s * 0.26);
          ctx.beginPath();
          ctx.moveTo(mapX(st[j - 1].x) - 0.5, mapY(st[j - 1].y) - 0.5);
          ctx.lineTo(mapX(st[j].x) - 0.5, mapY(st[j].y) - 0.5);
          ctx.stroke();
        }
        ctx.restore();
      }

      // ---- logo reveal + typewriter ----
      const logoA = smooth((t - T_LOGO) / 0.45);
      if (logoA > 0) {
        const pop = 0.94 + 0.06 * easeOut((t - T_LOGO) / 0.5);
        ctx.save();
        ctx.globalAlpha = logoA;
        ctx.translate(W / 2, logoTop);
        ctx.scale(pop, pop);
        ctx.translate(-W / 2, -logoTop);
        ctx.font = `700 ${logoFont}px "Times New Roman", Times, Georgia, serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "alphabetic";
        ctx.shadowColor = "rgba(255,236,170,0.35)";
        ctx.shadowBlur = 30 * u * dpr;
        ctx.fillStyle = "#fbf7ec";
        ctx.fillText(logoTyped, W / 2, logoTop);
        ctx.restore();
      }

      if (t >= T_SUB) {
        const p = clamp((t - T_SUB) / 0.55);
        textLine(ctx, subtitle, W / 2, logoTop + logoFont * 0.72, `italic 400 ${subPx}px "Times New Roman", Georgia, serif`, "rgba(240,231,211,0.92)", p * subtitle.length, 0.028);
      }
      if (t >= T_TAG) {
        ctx.font = `400 ${tagPx}px "Times New Roman", Georgia, serif`;
        const maxW = Math.min(W * 0.82, 620);
        const words = tagline.split(" ");
        const lines: string[] = [];
        let cur = "";
        for (const w of words) {
          const nx = cur ? `${cur} ${w}` : w;
          if (ctx.measureText(nx).width > maxW && cur) {
            lines.push(cur);
            cur = w;
          } else cur = nx;
        }
        if (cur) lines.push(cur);
        let offset = 0;
        lines.forEach((line, li) => {
          const p = clamp((t - T_TAG - li * 0.06) / 0.4);
          textLine(ctx, line, W / 2, logoTop + logoFont * 0.72 + subPx * 1.25 + li * tagPx * 1.5, `400 ${tagPx}px "Times New Roman", Georgia, serif`, "rgba(214,206,188,0.8)", p * line.length, 0.008);
          offset += line.length;
        });
        void offset;
      }

      // flourish underline drawn by the nib
      if (t >= T_FLOURISH0) {
        const e = clamp((t - T_FLOURISH0) / (T_FLOURISH1 - T_FLOURISH0));
        const lineY = logoTop + logoFont * 0.42;
        const left = W / 2 - logoFont * 1.55;
        const right = W / 2 + logoFont * 1.55;
        const xEnd = left + (right - left) * easeSine(e);
        ctx.save();
        ctx.strokeStyle = "rgba(233,196,106,0.95)";
        ctx.lineWidth = Math.max(1.6, 2.4 * u);
        ctx.lineCap = "round";
        ctx.shadowColor = "rgba(233,196,106,0.8)";
        ctx.shadowBlur = 12 * u * dpr;
        ctx.beginPath();
        for (let x = left; x <= xEnd; x += 3) {
          const q = (x - left) / (right - left);
          const y = lineY + Math.sin(q * Math.PI * 1.05) * 5 * u;
          if (x === left) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // ---- golden burst ----
      if (t >= T_BURST) {
        const q = (t - T_BURST) / 0.95;
        if (q < 1) {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (const p of burst) {
            const d = p.sp * easeOut(q) * 0.9;
            const a = (1 - q) * 0.95;
            const x = orbitC.x + Math.cos(p.a) * d;
            const y = orbitC.y + Math.sin(p.a) * d * 0.85;
            ctx.globalAlpha = a;
            ctx.fillStyle = p.r > 2.4 * u ? GOLD_HI : GOLD;
            ctx.beginPath();
            ctx.arc(x, y, p.r * (1 - q * 0.5), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
          for (let i = 0; i < 6; i++) {
            const a = i / 6;
            const x = W / 2 + Math.cos(a * Math.PI * 2 + q) * 90 * u;
            const y = logoTop - logoFont * 0.4 + Math.sin(a * Math.PI * 2 + q) * 60 * u;
            star(ctx, x, y, 16 * u * (1 - q), 1 - q);
          }
        }
      }

      // ink bleed into the page turn
      if (t > 6.55) {
        const q = clamp((t - 6.55) / 0.45);
        ctx.save();
        const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.1, W / 2, H / 2, Math.max(W, H) * (0.35 + 0.75 * q));
        g.addColorStop(0, `rgba(8,10,12,0)`);
        g.addColorStop(0.55, `rgba(8,10,12,${0.55 * q})`);
        g.addColorStop(1, `rgba(8,10,12,${0.92 * q})`);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
        ctx.restore();
        if (!stamped) stamped = true;
      }
    },
  };
}
