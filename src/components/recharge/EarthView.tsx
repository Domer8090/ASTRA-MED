import { useEffect, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { Crosshair, LocateFixed, Satellite } from "lucide-react";
import { COLORS } from "../../config/theme";
import { handSpread, type HandPose } from "../../engine/gestures";
import { latLonToVector, subsolarPoint } from "../../engine/sunPosition";
import { EARTH_PLACES, fetchLatestEpic, loadEarthTextures, type EarthPlace, type EarthTextures, type EpicImage } from "../../services/earthImagery";

const VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vN;
void main() {
  vUv = uv;
  vN = normal;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAGMENT = /* glsl */ `
uniform sampler2D dayMap;
uniform sampler2D nightMap;
uniform vec3 sunDir;
uniform float hasNight;
varying vec2 vUv;
varying vec3 vN;
void main() {
  float d = dot(normalize(vN), sunDir);
  float t = smoothstep(-0.10, 0.16, d);
  vec3 day = texture2D(dayMap, vUv).rgb;
  vec3 night = texture2D(nightMap, vUv).rgb * hasNight;
  // Blue Marble is a dark texture; lift it so the day side reads as daylight.
  vec3 lit = min(day * 1.25, vec3(1.0)) * (0.62 + 0.55 * max(d, 0.0));
  vec3 dark = day * 0.035 + night * vec3(1.15, 0.95, 0.7);
  gl_FragColor = vec4(mix(dark, lit, t), 1.0);
  #include <colorspace_fragment>
}`;

const FIND_ROUNDS = 5;
const CENTERED_DEG = 7;

interface Props {
  poseRef: MutableRefObject<HandPose | null>;
  /** All tracked hands; two pinching hands zoom and turn together. */
  posesRef: MutableRefObject<HandPose[]>;
  onRound: (found: number, seconds: number) => void;
}

function angleToFront(group: THREE.Group, place: EarthPlace): number {
  const v = new THREE.Vector3(...latLonToVector(place.lat, place.lon)).applyEuler(group.rotation);
  return (Math.acos(Math.min(1, Math.max(-1, v.z))) * 180) / Math.PI;
}

function orientationFor(place: { lat: number; lon: number }): { yaw: number; pitch: number } {
  const [x, , z] = latLonToVector(place.lat, place.lon);
  return { yaw: Math.atan2(-x, z), pitch: (place.lat * Math.PI) / 180 };
}

/** Interactive globe lit by the real Sun position, with NASA imagery from yesterday. */
export default function EarthView({ poseRef, posesRef, onRound }: Props) {
  const mount = useRef<HTMLDivElement>(null);
  const view = useRef({ yaw: 0, pitch: 0.35, dist: 3.1, targetYaw: null as number | null, targetPitch: 0, spin: true });
  const groupRef = useRef<THREE.Group | null>(null);
  const [tex, setTex] = useState<EarthTextures | null>(null);
  const [epic, setEpic] = useState<EpicImage | null | "loading">("loading");
  const [find, setFind] = useState<{ target: EarthPlace; round: number; found: number; startedAt: number } | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [center, setCenter] = useState("Loading Earth imagery");
  const findRef = useRef(find);
  useEffect(() => {
    findRef.current = find;
  }, [find]);

  useEffect(() => {
    let alive = true;
    void loadEarthTextures().then((t) => alive && setTex(t));
    void fetchLatestEpic().then((e) => alive && setEpic(e));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const el = mount.current;
    if (!el || !tex) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.className = "block h-full w-full touch-none";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    const day = new THREE.CanvasTexture(tex.day);
    day.colorSpace = THREE.SRGBColorSpace;
    day.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const nightCanvas = tex.night ?? document.createElement("canvas");
    const night = new THREE.CanvasTexture(nightCanvas);
    night.colorSpace = THREE.SRGBColorSpace;
    const sun = subsolarPoint(new Date());
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        dayMap: { value: day },
        nightMap: { value: night },
        sunDir: { value: new THREE.Vector3(...latLonToVector(sun.lat, sun.lon)) },
        hasNight: { value: tex.night ? 1 : 0 },
      },
    });
    const group = new THREE.Group();
    group.rotation.order = "XYZ";
    groupRef.current = group;
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), material);
    group.add(globe);
    const dots = new THREE.BufferGeometry();
    dots.setAttribute("position", new THREE.Float32BufferAttribute(EARTH_PLACES.flatMap((p) => latLonToVector(p.lat, p.lon).map((c) => c * 1.004)), 3));
    group.add(new THREE.Points(dots, new THREE.PointsMaterial({ color: COLORS.tue, size: 0.028 })));
    scene.add(group);

    const stars = new THREE.BufferGeometry();
    const sp: number[] = [];
    for (let i = 0; i < 900; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(30 + Math.random() * 20);
      sp.push(v.x, v.y, v.z);
    }
    stars.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: COLORS.ink2, size: 0.06, sizeAttenuation: true })));

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // Pointer drag and wheel zoom.
    let drag: { x: number; y: number } | null = null;
    const v = view.current;
    const canvas = renderer.domElement;
    const onDown = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY };
      v.spin = false;
      v.targetYaw = null;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      v.yaw += (e.clientX - drag.x) * 0.006;
      v.pitch = Math.max(-1.4, Math.min(1.4, v.pitch + (e.clientY - drag.y) * 0.005));
      drag = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => {
      drag = null;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      v.dist = Math.max(1.5, Math.min(5, v.dist * (1 + e.deltaY * 0.001)));
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    let raf = 0;
    let pinchFrom: { x: number; y: number } | null = null;
    let palmBase: number | null = null;
    let heldSince = 0;
    let lastLabel = 0;
    let twoFrom: { mid: { x: number; y: number }; spread: number; dist: number } | null = null;
    const tick = (now: number) => {
      const both = posesRef.current;
      const pose = poseRef.current;
      if (both.length >= 2 && both[0]!.pinch && both[1]!.pinch) {
        // Two pinching hands: pull apart to zoom in, move together to turn.
        const [a, b] = both as [HandPose, HandPose];
        const mid = { x: (a.cursor.x + b.cursor.x) / 2, y: (a.cursor.y + b.cursor.y) / 2 };
        const spread = Math.max(0.02, handSpread(a, b));
        v.spin = false;
        v.targetYaw = null;
        if (twoFrom) {
          v.yaw += (mid.x - twoFrom.mid.x) * 5;
          v.pitch = Math.max(-1.4, Math.min(1.4, v.pitch + (mid.y - twoFrom.mid.y) * 4));
          v.dist = Math.max(1.5, Math.min(5, twoFrom.dist * (twoFrom.spread / spread)));
          twoFrom = { ...twoFrom, mid };
        } else twoFrom = { mid, spread, dist: v.dist };
        pinchFrom = null;
        palmBase = null;
      } else if (pose) {
        twoFrom = null;
        if (pose.pinch) {
          v.spin = false;
          v.targetYaw = null;
          if (pinchFrom) {
            v.yaw += (pose.cursor.x - pinchFrom.x) * 5;
            v.pitch = Math.max(-1.4, Math.min(1.4, v.pitch + (pose.cursor.y - pinchFrom.y) * 4));
          }
          pinchFrom = pose.cursor;
          palmBase = null;
        } else {
          pinchFrom = null;
          if (pose.open) {
            // Push an open hand toward the camera to zoom in, pull it back to zoom out.
            palmBase ??= pose.palmSize;
            const want = Math.max(1.5, Math.min(5, 3.1 * (palmBase / pose.palmSize)));
            v.dist += (want - v.dist) * 0.08;
          } else palmBase = null;
        }
      } else {
        twoFrom = null;
        pinchFrom = null;
        palmBase = null;
      }
      if (v.targetYaw !== null) {
        let dy = v.targetYaw - v.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        v.yaw += dy * (reduce ? 1 : 0.08);
        v.pitch += (v.targetPitch - v.pitch) * (reduce ? 1 : 0.08);
        if (Math.abs(dy) < 0.002 && Math.abs(v.targetPitch - v.pitch) < 0.002) v.targetYaw = null;
      } else if (v.spin && !reduce) v.yaw += 0.0007;
      group.rotation.set(v.pitch, v.yaw, 0);
      camera.position.set(0, 0, v.dist);
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);

      const f = findRef.current;
      if (f) {
        if (angleToFront(group, f.target) < CENTERED_DEG) {
          heldSince ||= now;
          if (now - heldSince > 600) {
            heldSince = 0;
            const found = f.found + 1;
            if (f.round >= FIND_ROUNDS) {
              const seconds = Math.round((performance.now() - f.startedAt) / 1000);
              setFind(null);
              setMessage(`Found all ${FIND_ROUNDS} in ${seconds} s.`);
              onRound(found, seconds);
            } else {
              const pool = EARTH_PLACES.filter((p) => p.id !== f.target.id);
              setFind({ ...f, target: pool[Math.floor(Math.random() * pool.length)]!, round: f.round + 1, found });
              setMessage(`Found ${f.target.name}.`);
            }
          }
        } else heldSince = 0;
      }
      if (now - lastLabel > 1000) {
        lastLabel = now;
        // Point on the globe facing the camera, for the text description.
        const front = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(-v.pitch, 0, 0)).applyAxisAngle(new THREE.Vector3(0, 1, 0), -v.yaw);
        const lat = (Math.asin(front.y) * 180) / Math.PI;
        const phi = Math.atan2(front.z, -front.x);
        const lon = ((((phi * 180) / Math.PI - 180 + 540) % 360) - 180);
        const lit = front.dot(material.uniforms.sunDir!.value as THREE.Vector3) > 0;
        setCenter(`Facing ${Math.abs(lat).toFixed(0)}° ${lat >= 0 ? "N" : "S"}, ${Math.abs(lon).toFixed(0)}° ${lon >= 0 ? "E" : "W"}, ${lit ? "in daylight" : "at night"} right now.`);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onKey = (e: KeyboardEvent) => {
      const step = 0.08;
      if (e.key === "ArrowLeft") v.yaw -= step;
      else if (e.key === "ArrowRight") v.yaw += step;
      else if (e.key === "ArrowUp") v.pitch = Math.min(1.4, v.pitch + step);
      else if (e.key === "ArrowDown") v.pitch = Math.max(-1.4, v.pitch - step);
      else if (e.key === "+" || e.key === "=") v.dist = Math.max(1.5, v.dist * 0.9);
      else if (e.key === "-") v.dist = Math.min(5, v.dist * 1.1);
      else return;
      e.preventDefault();
      v.spin = false;
      v.targetYaw = null;
    };
    el.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("keydown", onKey);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
      renderer.dispose();
      day.dispose();
      night.dispose();
      material.dispose();
      globe.geometry.dispose();
      dots.dispose();
      stars.dispose();
      canvas.remove();
      groupRef.current = null;
    };
  }, [tex, poseRef, posesRef, onRound]);

  const flyTo = (p: { lat: number; lon: number }) => {
    const o = orientationFor(p);
    view.current.targetYaw = o.yaw;
    view.current.targetPitch = o.pitch;
    view.current.spin = false;
  };

  const startFind = () => {
    setMessage(null);
    setFind({ target: EARTH_PLACES[Math.floor(Math.random() * EARTH_PLACES.length)]!, round: 1, found: 0, startedAt: performance.now() });
    view.current.dist = Math.min(view.current.dist, 3.1);
  };

  const sourceText =
    tex?.source === "bundled"
      ? "NASA Blue Marble and VIIRS city lights, stored on board with the app. No network needed."
      : tex
        ? "The bundled Earth imagery could not load, so the globe is drawn."
        : "Loading Earth imagery…";

  return (
    <div className="grid h-full min-h-0 gap-3 overflow-y-auto overscroll-contain lg:grid-cols-[minmax(0,1fr)_300px] lg:grid-rows-[minmax(0,1fr)] lg:overflow-visible">
      <div className="relative min-h-[340px] overflow-hidden rounded-panel border border-line bg-space">
        <div ref={mount} tabIndex={0} role="img" aria-label={`Earth globe. ${center} Drag, use arrow keys, or pinch with your hand to turn it; plus and minus zoom.`} className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-tue" />
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-tue/50" />
        {find ? (
          <div className="absolute left-3 top-3 rounded-tile border border-tue/60 bg-panel/90 px-3 py-2">
            <p className="text-2xs font-semibold uppercase tracking-label text-tue">Find it, {find.round} of {FIND_ROUNDS}</p>
            <p className="font-cond text-lg font-bold text-ink">{find.target.name}</p>
            <p className="text-xs text-ink-2">{find.target.detail}. Turn the globe until it sits in the ring.</p>
          </div>
        ) : null}
        <p aria-live="polite" className="absolute bottom-3 left-3 right-3 text-xs text-ink-2">
          {message ? <span className="mr-2 font-semibold text-tue">{message}</span> : null}
          {center}
        </p>
      </div>

      <aside className="flex min-h-0 flex-col gap-3 overscroll-contain lg:overflow-y-auto lg:pr-1 [&>*]:shrink-0">
        <div className="panel p-3">
          <p className="text-sm text-ink">{sourceText}</p>
          <p className="mt-1 text-xs text-ink-3">The day–night line is drawn for the real Sun position right now.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={startFind} disabled={!tex}>
              <Crosshair aria-hidden="true" className="h-4 w-4" />
              {find ? "Restart Find it" : "Play Find it"}
            </button>
            {find ? (
              <button type="button" className="btn btn-ghost" onClick={() => setFind(null)}>
                Stop game
              </button>
            ) : null}
          </div>
        </div>

        <div className="panel p-3">
          <h3 className="font-cond text-sm font-bold text-ink">Fly to</h3>
          <ul className="mt-2 grid grid-cols-2 gap-1.5">
            {EARTH_PLACES.map((p) => (
              <li key={p.id}>
                <button type="button" className="btn btn-secondary w-full justify-start px-2 text-xs" title={p.detail} onClick={() => flyTo(p)}>
                  <LocateFixed aria-hidden="true" className="h-3.5 w-3.5 text-tue" />
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <figure className="panel overflow-hidden">
          {epic === "loading" ? (
            <p className="p-3 text-sm text-ink-2">Checking for a ground link to fetch today's EPIC photo…</p>
          ) : epic ? (
            <>
              <img src={epic.url} alt={`Full disc of Earth photographed by NASA EPIC on ${epic.date} UTC, centred near ${epic.lat.toFixed(0)}°, ${epic.lon.toFixed(0)}°.`} className="aspect-square w-full bg-space object-cover" loading="lazy" />
              <figcaption className="flex items-start gap-2 p-3 text-xs text-ink-2">
                <Satellite aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-tue" />
                <span>
                  Received over the ground link: NASA EPIC on DSCOVR, {epic.date} UTC, the whole sunlit face of Earth from about 1.5 million km.
                  <button type="button" className="link ml-1" onClick={() => flyTo(epic)}>
                    Turn the globe to match
                  </button>
                </span>
              </figcaption>
            </>
          ) : (
            <p className="p-3 text-sm text-ink-2">No ground link right now, so there is no new EPIC photo of Earth. The globe works without one.</p>
          )}
        </figure>
      </aside>
    </div>
  );
}
