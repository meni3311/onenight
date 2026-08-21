import { useEffect, useRef } from "react";
import { COLORS } from "../../constants/theme.js";

const PALETTE = [COLORS.bordeaux, COLORS.rose, COLORS.cream];
const SPARKLE = "#D4AF37";

const PIECE_COUNT = 80;
const DURATION_MS = 3600;
const FADE_FROM_MS = DURATION_MS * 0.6;

export function Confetti() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const pieces = Array.from({ length: PIECE_COUNT }, () => ({
      x: Math.random() * width,
      y: -20 - Math.random() * height * 0.6,
      size: 5 + Math.random() * 6,
      color: Math.random() < 0.12 ? SPARKLE : PALETTE[Math.floor(Math.random() * PALETTE.length)],
      isSparkle: Math.random() < 0.12,
      speedY: 1.4 + Math.random() * 2.1,
      speedX: (Math.random() - 0.5) * 1.3,
      rotation: Math.random() * 360,
      spin: (Math.random() - 0.5) * 7,
    }));

    const start = performance.now();
    let raf = requestAnimationFrame(function draw(now) {
      const elapsed = now - start;

      if (elapsed >= DURATION_MS) {
        ctx.clearRect(0, 0, width, height);
        return;
      }

      const opacity = elapsed < FADE_FROM_MS
        ? 1
        : 1 - (elapsed - FADE_FROM_MS) / (DURATION_MS - FADE_FROM_MS);

      ctx.clearRect(0, 0, width, height);
      for (const p of pieces) {
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.spin;
        if (p.y > height + 20) p.y = -20;

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        if (p.isSparkle) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx.restore();
      }

      raf = requestAnimationFrame(draw);
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: 120,
      }}
    />
  );
}
