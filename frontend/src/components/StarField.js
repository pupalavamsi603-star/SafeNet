import { useEffect, useRef } from "react";

// Canvas starfield: small twinkling stars with gentle parallax that follows the cursor.
// Renders inside its parent (parent must be position:relative). Pointer-events: none.
export function StarField({ density = 110, color = "255, 255, 255" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const parent = canvas.parentElement;
    let raf = 0;
    let stars = [];
    // mouse target (-1..1 range relative to center) and smoothed current value
    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
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
        r: Math.random() * 1.3 + 0.35,           // radius
        depth: Math.random() * 0.8 + 0.2,        // parallax strength (far = small shift)
        tw: Math.random() * Math.PI * 2,          // twinkle phase
        tws: Math.random() * 0.015 + 0.004,       // twinkle speed
        vx: (Math.random() - 0.5) * 0.06,         // slow drift
        vy: (Math.random() - 0.5) * 0.06,
      }));
    };

    const onMove = (e) => {
      const rect = parent.getBoundingClientRect();
      target.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      target.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };

    const draw = () => {
      // ease the parallax toward the cursor for a smooth, premium feel
      current.x += (target.x - current.x) * 0.045;
      current.y += (target.y - current.y) * 0.045;
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.tw += s.tws;
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < -4) s.x = w + 4; else if (s.x > w + 4) s.x = -4;
        if (s.y < -4) s.y = h + 4; else if (s.y > h + 4) s.y = -4;
        const px = s.x + current.x * 22 * s.depth;
        const py = s.y + current.y * 22 * s.depth;
        const alpha = 0.25 + (Math.sin(s.tw) + 1) * 0.35 * s.depth;
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${alpha.toFixed(3)})`;
        ctx.fill();
        // soft glow on the brightest/closest stars
        if (s.depth > 0.75 && s.r > 1) {
          ctx.beginPath();
          ctx.arc(px, py, s.r * 2.6, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${color}, ${(alpha * 0.12).toFixed(3)})`;
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resize();
    window.addEventListener("resize", resize);
    if (!reduceMotion) {
      window.addEventListener("mousemove", onMove);
      raf = requestAnimationFrame(draw);
    } else {
      // static stars for reduced-motion users
      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color}, ${(0.3 + 0.4 * s.depth).toFixed(3)})`;
        ctx.fill();
      }
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
    };
  }, [density, color]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" aria-hidden="true" />;
}
