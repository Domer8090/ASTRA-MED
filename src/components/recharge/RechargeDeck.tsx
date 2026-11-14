import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Globe2, Hand, Orbit, Wind, X } from "lucide-react";
import { useHandTracking } from "../../hooks/useHandTracking";
import { useMissionModel } from "../../hooks/useMissionModel";
import { useToast } from "../../hooks/useToast";
import { useTuesday, type RechargeMode } from "../../hooks/useTuesday";
import { TuesdayMark } from "../tuesday/TuesdayMark";
import BreatheRing from "./BreatheRing";
import OrbitCatch from "./OrbitCatch";

const EarthView = lazy(() => import("./EarthView"));

const MODES: { id: RechargeMode; label: string; icon: typeof Globe2 }[] = [
  { id: "earth", label: "Earth", icon: Globe2 },
  { id: "game", label: "Orbit Catch", icon: Orbit },
  { id: "breathe", label: "Breathe", icon: Wind },
];

const HAND_TEXT = {
  off: "Hand control off",
  starting: "Starting camera…",
  tracking: "Hand found",
  "no-hand": "Show one hand to the camera",
  error: "Hand control unavailable",
} as const;

/**
 * Full-screen recharge space: NASA Earth view, a light game and paced
 * breathing, with optional camera hand control. Sessions are logged to
 * Tuesday's wellbeing log on this device.
 */
export function RechargeDeck() {
  const { recharge, openRecharge, closeRecharge, store, data } = useTuesday();
  const { day } = useMissionModel();
  const toast = useToast();
  const ref = useRef<HTMLDialogElement>(null);
  const [handOn, setHandOn] = useState(false);
  const { videoRef, poseRef, status, error } = useHandTracking(Boolean(recharge) && handOn);
  const openedAt = useRef(0);
  const earthStart = useRef(0);
  const lastEntry = useRef<string | null>(null);
  const [rating, setRating] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (recharge && !el.open) {
      el.showModal();
      openedAt.current = performance.now();
      lastEntry.current = null;
    }
    if (!recharge && el.open) el.close();
  }, [recharge]);

  useEffect(() => {
    earthStart.current = recharge === "earth" ? performance.now() : 0;
  }, [recharge]);

  const logEarth = useCallback(() => {
    if (!earthStart.current) return;
    const minutes = (performance.now() - earthStart.current) / 60_000;
    earthStart.current = 0;
    if (minutes < 0.25) return;
    lastEntry.current = store.logActivity({ kind: "earth", missionDay: day, minutes: Math.round(minutes * 10) / 10 }).entry.id;
  }, [store, day]);

  const switchMode = (mode: RechargeMode) => {
    if (recharge === "earth" && mode !== "earth") logEarth();
    openRecharge(mode);
  };

  const finish = useCallback(() => {
    logEarth();
    setHandOn(false);
    setRating(false);
    closeRecharge();
  }, [logEarth, closeRecharge]);

  const requestClose = () => {
    logEarth();
    if (lastEntry.current) setRating(true);
    else finish();
  };

  const onGame = useCallback(
    (score: number, seconds: number) => {
      const r = store.logActivity({ kind: "game", missionDay: day, minutes: seconds / 60, score });
      lastEntry.current = r.entry.id;
      if (!r.persisted) toast({ tone: "warning", title: "Score not saved", body: "This browser is not saving data." });
    },
    [store, day, toast],
  );
  const onBreathe = useCallback(
    (seconds: number) => {
      lastEntry.current = store.logActivity({ kind: "breathe", missionDay: day, minutes: seconds / 60 }).entry.id;
    },
    [store, day],
  );
  const onFind = useCallback(
    (found: number) => {
      lastEntry.current = store.logActivity({ kind: "game", missionDay: day, minutes: 0, score: found * 20 }, false).entry.id;
    },
    [store, day],
  );

  const rate = (value: number) => {
    if (lastEntry.current) {
      const ok = store.rateActivity(lastEntry.current, value);
      toast({ tone: ok ? "success" : "warning", title: ok ? "Thanks, noted for your wellbeing log" : "Rating not saved", ...(ok ? {} : { body: "This browser is not saving data." }) });
    }
    finish();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="recharge-title"
      className="fixed inset-0 m-0 h-[100dvh] max-h-none w-full max-w-none bg-space p-0 outline-none"
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
    >
      {recharge ? (
        <div className="flex h-full flex-col gap-3 p-3 md:p-4">
          <header className="flex flex-wrap items-center gap-3">
            <TuesdayMark className="h-7 w-7" />
            <h2 id="recharge-title" className="font-cond text-lg font-bold text-ink">
              Recharge
            </h2>
            <div role="tablist" aria-label="Recharge activity" className="inline-flex rounded-control border border-line-strong bg-panel p-0.5">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={recharge === m.id}
                  className={`flex min-h-[36px] items-center gap-1.5 rounded-[3px] px-3 font-cond text-sm font-semibold ${recharge === m.id ? "bg-raised text-ink ring-1 ring-inset ring-tue-deep" : "text-ink-2 hover:text-ink"}`}
                  onClick={() => switchMode(m.id)}
                >
                  <m.icon aria-hidden="true" className={`h-4 w-4 ${recharge === m.id ? "text-tue" : ""}`} />
                  {m.label}
                </button>
              ))}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button type="button" className="btn btn-secondary" aria-pressed={handOn} onClick={() => setHandOn((v) => !v)}>
                {handOn ? <CameraOff aria-hidden="true" className="h-4 w-4" /> : <Camera aria-hidden="true" className="h-4 w-4" />}
                {handOn ? "Turn off hand control" : "Hand control"}
              </button>
              <button type="button" className="btn btn-ghost min-h-[40px] min-w-[40px] px-2" aria-label="Close Recharge" onClick={requestClose}>
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
          </header>

          <p className="flex items-center gap-2 text-xs text-ink-2" role="status">
            <Hand aria-hidden="true" className={`h-3.5 w-3.5 ${status === "tracking" ? "text-tue" : ""}`} />
            {error ?? HAND_TEXT[status]}
            {handOn && !error ? <span className="text-ink-3">Camera frames are processed in this browser and never leave the device.</span> : null}
            {!handOn ? <span className="text-ink-3">Pinch to grab, move to turn; open hand toward the camera to zoom.</span> : null}
          </p>

          <div className="relative min-h-0 flex-1">
            {recharge === "earth" ? (
              <Suspense fallback={<p className="p-4 text-sm text-ink-2">Loading the Earth view…</p>}>
                <EarthView poseRef={poseRef} onRound={onFind} />
              </Suspense>
            ) : recharge === "game" ? (
              <OrbitCatch poseRef={poseRef} best={data.bestScore} onFinish={onGame} />
            ) : (
              <BreatheRing poseRef={poseRef} handOn={handOn && status === "tracking"} onFinish={onBreathe} />
            )}
            <video
              ref={videoRef}
              muted
              playsInline
              aria-label="Your camera, for hand control"
              className={`pointer-events-none absolute bottom-3 right-3 w-36 -scale-x-100 rounded-tile border border-line-strong ${handOn ? "" : "hidden"}`}
            />
          </div>

          {rating ? (
            <div role="dialog" aria-modal="true" aria-labelledby="rate-title" className="fixed inset-0 grid place-items-center bg-space/80 p-4">
              <div className="panel w-full max-w-sm p-5 text-center">
                <h3 id="rate-title" className="font-cond text-lg font-bold text-ink">
                  How do you feel now?
                </h3>
                <p className="mt-1 text-sm text-ink-2">1 is worse, 5 is much better. Stays on this device.</p>
                <div className="mt-4 flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((v) => (
                    <button key={v} type="button" className="btn btn-secondary num min-h-[44px] min-w-[44px]" onClick={() => rate(v)} data-autofocus={v === 3 ? true : undefined}>
                      {v}
                    </button>
                  ))}
                </div>
                <button type="button" className="btn btn-ghost mt-3" onClick={finish}>
                  Skip
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </dialog>
  );
}
