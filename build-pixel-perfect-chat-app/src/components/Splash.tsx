"use client";

import { useEffect, useRef } from "react";
import { quillSvgDocument } from "@/lib/quillSvg";
import { createCinematicScene, SPLASH_SECONDS, type SplashScene } from "@/lib/cinematicScene";

const TURN_START = 6.3;

export function Splash({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const shadeRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const canvas = canvasRef.current;
    const page = pageRef.current;
    const shade = shadeRef.current;
    if (!canvas || !page || !shade) return;
    const ctx = canvas.getContext("2d");
    let finished = false;
    let raf = 0;
    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      doneRef.current();
    };
    const failsafe = window.setTimeout(finish, SPLASH_SECONDS * 1000 + 300);
    if (!ctx) {
      return () => window.clearTimeout(failsafe);
    }

    let scene: SplashScene | null = null;
    let ready = false;
    const img = new Image();

    const build = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      scene = ready
        ? createCinematicScene({
            width,
            height,
            dpr,
            quillImage: img,
            makeSurface: (w, h) => {
              const c = document.createElement("canvas");
              c.width = w;
              c.height = h;
              return c;
            },
          })
        : null;
    };

    img.onload = () => {
      ready = true;
      build();
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(quillSvgDocument({ id: "sp", detail: "full", drop: false }, 400))}`;
    build();

    const onResize = () => build();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);

    const start = performance.now();
    const frame = () => {
      if (finished) return;
      const t = Math.max(0, (performance.now() - start) / 1000);
      if (scene) scene.draw(ctx, Math.min(t, SPLASH_SECONDS));
      const turn = Math.min(1, Math.max(0, (t - TURN_START) / (SPLASH_SECONDS - TURN_START)));
      const e = 0.35 * turn + 0.65 * turn * turn;
      page.style.transform = turn > 0 ? `rotateY(${(-e * 100).toFixed(2)}deg)` : "none";
      shade.style.opacity = (e * 0.9).toFixed(3);
      if (t >= SPLASH_SECONDS) {
        finish();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      finished = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(failsafe);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="splash" role="dialog" aria-label="Opening Sage">
      <div className="splash-page" ref={pageRef}>
        <canvas ref={canvasRef} className="splash-canvas" />
        <div className="splash-shade" ref={shadeRef} />
        <button className="splash-skip" type="button" onClick={() => doneRef.current()}>
          Skip
        </button>
      </div>
    </div>
  );
}
