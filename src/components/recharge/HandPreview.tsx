import { useEffect, useRef, type MutableRefObject } from "react";
import { COLORS } from "../../config/theme";
import { HAND_CONNECTIONS, type HandPose, type Landmark } from "../../engine/gestures";

interface Props {
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  landmarksRef: MutableRefObject<Landmark[][]>;
  posesRef: MutableRefObject<HandPose[]>;
  visible: boolean;
}

/**
 * Small mirrored camera preview with the tracked hand skeleton drawn on top,
 * so the crew member can see what the camera reads. Frames never leave the browser.
 */
export function HandPreview({ videoRef, landmarksRef, posesRef, visible }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let raf = 0;
    const draw = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const dpr = Math.min(2, window.devicePixelRatio);
      if (canvas.width !== Math.round(w * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const hands = landmarksRef.current;
      const poses = posesRef.current;
      hands.forEach((lm, i) => {
        const pinch = poses[i]?.pinch ?? false;
        const colour = i === 0 ? COLORS.tue : COLORS.cyan;
        ctx.lineWidth = 2;
        ctx.strokeStyle = colour;
        ctx.globalAlpha = 0.9;
        for (const [a, b] of HAND_CONNECTIONS) {
          const p = lm[a];
          const q = lm[b];
          if (!p || !q) continue;
          ctx.beginPath();
          ctx.moveTo(p.x * w, p.y * h);
          ctx.lineTo(q.x * w, q.y * h);
          ctx.stroke();
        }
        for (const p of lm) {
          ctx.beginPath();
          ctx.arc(p.x * w, p.y * h, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = COLORS.ink;
          ctx.fill();
        }
        // Thumb to index: solid when pinching, faint otherwise.
        const t = lm[4];
        const f = lm[8];
        if (t && f) {
          ctx.globalAlpha = pinch ? 1 : 0.35;
          ctx.strokeStyle = pinch ? COLORS.gold : colour;
          ctx.lineWidth = pinch ? 3 : 1.5;
          ctx.beginPath();
          ctx.moveTo(t.x * w, t.y * h);
          ctx.lineTo(f.x * w, f.y * h);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      });
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [visible, landmarksRef, posesRef]);

  return (
    <div className={`pointer-events-none absolute bottom-3 right-3 w-52 overflow-hidden rounded-tile border border-line-strong bg-space ${visible ? "" : "hidden"}`}>
      {/* Video and skeleton share one mirror so the drawing lines up with the hand. */}
      <div className="relative -scale-x-100">
        <video ref={videoRef} muted playsInline aria-label="Your camera, for hand control" className="block aspect-[4/3] w-full object-cover opacity-80" />
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
      </div>
    </div>
  );
}
