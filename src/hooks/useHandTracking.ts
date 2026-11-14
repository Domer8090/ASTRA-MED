import { useEffect, useRef, useState } from "react";
import { readHandPose, smoothPoint, type HandPose, type Landmark } from "../engine/gestures";
import { createHandLandmarker } from "../services/handTracking";

export type HandStatus = "off" | "starting" | "tracking" | "no-hand" | "error";

/**
 * Camera hand tracking for the Recharge deck, one or two hands. The latest
 * poses live in refs so games read them in their own animation loop without
 * re-rendering React. Hands are ordered left to right as the crew member sees
 * them on screen.
 */
export function useHandTracking(enabled: boolean, hands: 1 | 2 = 1) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  /** First hand (left-most on screen). Kept for one-hand controls. */
  const poseRef = useRef<HandPose | null>(null);
  /** Every tracked hand, left to right on screen. */
  const posesRef = useRef<HandPose[]>([]);
  /** Raw landmarks per hand, in camera coordinates, for drawing the skeleton. */
  const landmarksRef = useRef<Landmark[][]>([]);
  const [status, setStatus] = useState<HandStatus>("off");
  const [handCount, setHandCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    let landmarker: Awaited<ReturnType<typeof createHandLandmarker>> | null = null;
    let last: HandStatus = "starting";
    let lastCount = -1;
    const report = (s: HandStatus, count: number) => {
      if (cancelled) return;
      if (s !== last) {
        last = s;
        setStatus(s);
      }
      if (count !== lastCount) {
        lastCount = count;
        setHandCount(count);
      }
    };
    queueMicrotask(() => {
      if (!cancelled) {
        setStatus("starting");
        setError(null);
      }
    });

    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error("This browser has no camera access.");
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: "user" }, audio: false });
        if (cancelled) return;
        const video = videoRef.current;
        if (!video) throw new Error("Camera preview is not ready.");
        video.srcObject = stream;
        await video.play();
        landmarker = await createHandLandmarker(hands);
        if (cancelled) return;
        let lastTime = -1;
        const loop = () => {
          if (cancelled || !landmarker) return;
          if (video.readyState >= 2 && video.currentTime !== lastTime) {
            lastTime = video.currentTime;
            const result = landmarker.detectForVideo(video, performance.now());
            // Camera x is mirrored on screen, so the right-most camera hand is left-most for the crew member.
            const raw = result.landmarks.slice(0, hands).toSorted((a, b) => (b[0]?.x ?? 0) - (a[0]?.x ?? 0));
            const prev = posesRef.current;
            const poses: HandPose[] = [];
            raw.forEach((lm, i) => {
              const p = readHandPose(lm, prev[i]?.pinch ?? false);
              if (p) poses.push({ ...p, cursor: smoothPoint(prev[i]?.cursor ?? null, p.cursor) });
            });
            landmarksRef.current = raw;
            posesRef.current = poses;
            poseRef.current = poses[0] ?? null;
            report(poses.length ? "tracking" : "no-hand", poses.length);
          }
          raf = requestAnimationFrame(loop);
        };
        report("no-hand", 0);
        loop();
      } catch (e) {
        if (cancelled) return;
        const name = e instanceof DOMException ? e.name : "";
        setError(
          name === "NotAllowedError"
            ? "Camera permission was declined. Mouse, touch and keyboard controls still work."
            : name === "NotFoundError"
              ? "No camera was found. Mouse, touch and keyboard controls still work."
              : "Hand control could not start on this device. Mouse, touch and keyboard controls still work.",
        );
        report("error", 0);
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
      poseRef.current = null;
      posesRef.current = [];
      landmarksRef.current = [];
      setStatus("off");
      setHandCount(0);
    };
  }, [enabled, hands]);

  return {
    videoRef,
    poseRef,
    posesRef,
    landmarksRef,
    status: enabled ? status : "off",
    handCount: enabled ? handCount : 0,
    error: enabled ? error : null,
  };
}
