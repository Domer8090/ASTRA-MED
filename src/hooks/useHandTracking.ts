import { useEffect, useRef, useState } from "react";
import { readHandPose, smoothPoint, type HandPose } from "../engine/gestures";
import { createHandLandmarker } from "../services/handTracking";

export type HandStatus = "off" | "starting" | "tracking" | "no-hand" | "error";

/**
 * Camera hand tracking for the Recharge deck. The latest pose lives in a ref so
 * games read it in their own animation loop without re-rendering React.
 */
export function useHandTracking(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const poseRef = useRef<HandPose | null>(null);
  const [status, setStatus] = useState<HandStatus>("off");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let raf = 0;
    let stream: MediaStream | null = null;
    let landmarker: Awaited<ReturnType<typeof createHandLandmarker>> | null = null;
    let last: HandStatus = "starting";
    const report = (s: HandStatus) => {
      if (s !== last && !cancelled) {
        last = s;
        setStatus(s);
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
        landmarker = await createHandLandmarker();
        if (cancelled) return;
        let lastTime = -1;
        const loop = () => {
          if (cancelled || !landmarker) return;
          if (video.readyState >= 2 && video.currentTime !== lastTime) {
            lastTime = video.currentTime;
            const result = landmarker.detectForVideo(video, performance.now());
            const hand = result.landmarks[0];
            const prev = poseRef.current;
            const pose = hand ? readHandPose(hand, prev?.pinch ?? false) : null;
            poseRef.current = pose ? { ...pose, cursor: smoothPoint(prev?.cursor ?? null, pose.cursor) } : null;
            report(pose ? "tracking" : "no-hand");
          }
          raf = requestAnimationFrame(loop);
        };
        report("no-hand");
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
        report("error");
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      landmarker?.close();
      poseRef.current = null;
      setStatus("off");
    };
  }, [enabled]);

  return { videoRef, poseRef, status: enabled ? status : "off", error: enabled ? error : null };
}
