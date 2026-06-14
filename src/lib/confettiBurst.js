/**
 * Lightweight canvas confetti — no external deps.
 * @param {HTMLCanvasElement} canvas
 * @param {{ durationMs?: number, colors?: string[] }} [opts]
 * @returns {() => void} stop / cleanup
 */
export function runConfettiBurst(canvas, opts = {}) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};

  const durationMs = opts.durationMs ?? 4200;
  const colors = opts.colors ?? ["#F58426", "#006BB6", "#F5C842", "#FFFFFF", "#1D428A"];
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let width = 0;
  let height = 0;
  let raf = 0;
  let running = true;
  const started = performance.now();

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  resize();
  window.addEventListener("resize", resize);

  const count = Math.min(160, Math.floor((width * height) / 9000));
  const pieces = Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: -20 - Math.random() * height * 0.35,
    w: 6 + Math.random() * 6,
    h: 3 + Math.random() * 5,
    rot: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 0.18,
    vx: (Math.random() - 0.5) * 4.5,
    vy: 2.5 + Math.random() * 5.5,
    color: colors[Math.floor(Math.random() * colors.length)],
    alpha: 0.85 + Math.random() * 0.15,
  }));

  const tick = (now) => {
    if (!running) return;
    ctx.clearRect(0, 0, width, height);
    const elapsed = now - started;
    const fade = elapsed > durationMs - 700 ? Math.max(0, (durationMs - elapsed) / 700) : 1;

    for (const p of pieces) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      p.rot += p.spin;
      if (p.y > height + 24) {
        p.y = -16;
        p.x = Math.random() * width;
        p.vy = 2 + Math.random() * 4;
      }
      ctx.save();
      ctx.globalAlpha = p.alpha * fade;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (elapsed < durationMs) {
      raf = requestAnimationFrame(tick);
    } else {
      ctx.clearRect(0, 0, width, height);
      stop();
    }
  };

  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
  };

  raf = requestAnimationFrame(tick);
  return stop;
}
