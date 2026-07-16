import { useEffect, useRef } from "react";

// Canvas starfield: twinkling stars with cursor parallax + a local "aura" —
// stars near the pointer brighten and are gently pushed, so the field
// visibly reacts as the cursor moves. Pointer-events: none.
export function StarField({ density = 110, color = "255, 255, 255" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const parent = canvas.parentElement;
    let raf = 0;
    let stars = [];
    // parallax target (-1..1 from center) and smoothed value
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    // cursor position in canvas coords (for the local aura effect)
    const cursor = { x: -9999, y: -9999 };
    let w = 0, h = 0, dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = parent.clientWidth;
      h = parent.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((w * h) / 1_000_000 * density) || density;
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        ox: 0, oy: 0,                              // cursor-push offset (springs back)
        r: Math.random() * 1.3 + 0.35,
        depth: Math.random() * 0.8 + 0.2,          // parallax strength
        tw: Math.random() * Math.PI * 2,
        tws: Math.random() * 0.015 + 0.004,
        vx: (Math.random() - 0.5) * 0.06,
        vy: (Math.random() - 0.5) * 0.06,
      }));
    };

    const onMove = (e) => {
      const rect = parent.getBoundingClientRect();
      const inX = e.clientX - rect.left;
      const inY = e.clientY - rect.top;
      cursor.x = inX;
      cursor.y = inY;
      target.x = (inX / rect.width - 0.5) * 2;
      target.y = (inY / rect.height - 0.5) * 2;
    };
    const onLeave = () => { cursor.x = -9999; cursor.y = -9999; };

    const AURA = 170;        // px radius around the cursor that stars respond to
    const PARALLAX = 60;     // max px shift of the whole field

    const draw = () => {
      current.x += (target.x - current.x) * 0.08;
      current.y += (target.y - current.y) * 0.08;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.tw += s.tws;
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < -4) s.x = w + 4; else if (s.x > w + 4) s.x = -4;
        if (s.y < -4) s.y = h + 4; else if (s.y > h + 4) s.y = -4;

        // base position with parallax
        let px = s.x + current.x * PARALLAX * s.depth;
        let py = s.y + current.y * PARALLAX * s.depth;

        // cursor aura: nearby stars get pushed away and brighten
        const dx = px - cursor.x;
        const dy = py - cursor.y;
        const dist = Math.hypot(dx, dy);
        let boost = 0;
        if (dist < AURA) {
          const force = (1 - dist / AURA); // 0..1, strongest at the cursor
          boost = force;
          const push = force * force * 26 * s.depth;
          s.ox += ((dx / (dist || 1)) * push - s.ox) * 0.12;
          s.oy += ((dy / (dist || 1)) * push - s.oy) * 0.12;
        } else {
          // spring back to rest
          s.ox *= 0.9;
          s.oy *= 0.9;
        }
        px += s.ox;
        py += s.oy;

        const twinkle = 0.25 + (Math.sin(s.tw) + 1) * 0.35 * s.depth;
        const alpha = Math.min(1, twinkle + boost * 0.7);
        const radius = s.r * (1 + boost * 0.9);
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${alpha.toFixed(3)})`;
        ctx.fill();
        // glow on bright/near-cursor stars
        if (boost > 0.15 || (s.depth > 0.75 && s.r > 1)) {
          ctx.beginPath();
          ctx.arc(px, py, radius * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${color}, ${(alpha * (0.1 + boost * 0.15)).toFixed(3)})`;
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseout", onLeave);
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onLeave);
    };
  }, [density, color]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" aria-hidden="true" />;
}
