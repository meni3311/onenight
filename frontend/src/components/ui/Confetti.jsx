import { useEffect, useRef } from "react";
import { COLORS } from "../../constants/theme.js";

/* Brand palette only — no generic rainbow confetti. A rare gold/champagne
   dot is mixed in as the "sparkle" accent the design asked for. */
const PALETTE = [COLORS.bordeaux, COLORS.rose, COLORS.cream];
const SPARKLE = "#D4AF37"; // champagne/gold, used sparingly (see `shape` below)

const PIECE_COUNT = 80;
// Total lifetime of the burst — spawns once, fades out, never repeats.
const DURATION_MS = 3600;
// Fading begins this far into the run rather than cutting off abruptly.
const FADE_FROM_MS = DURATION_MS * 0.6;

/**
 * One-shot confetti burst for the publish-success page.
 *
 * Canvas + requestAnimationFrame rather than a library: this app has no
 * confetti dependency yet, and ~80 rectangles falling for well under 4
 * seconds is cheap enough to hand-roll without adding one. `aria-hidden`
 * and `pointer-events: none` because it's purely decorative and must never
 * sit between a tap/screen-reader and the real page underneath it.
 *
 * Plays exactly once on mount and stops for good — no interval, no repeat.
 * A `prefers-reduced-motion` visitor gets nothing rendered at all rather
 * than a motion-reduced variant, since the animation is celebratory, not
 * informational, and skipping it entirely is the honest way to respect
 * that preference here.
 */
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
      // Staggered start above the viewport so the burst doesn't land all
      // at once — some pieces are already mid-fall on the first frame.
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
        // Run is over — clear the canvas and stop. No further rAF is
        // scheduled, so this never loops.
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
        // Recycled to the top while the burst is still active, so a tall
        // viewport still looks full for the whole run rather than emptying
        // out early — the run still ends for good at DURATION_MS regardless.
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
