import { useEffect, useRef, useState, type MutableRefObject } from "react";
import * as THREE from "three";
import { Crosshair, Globe2, LocateFixed, Minus, Moon, Plus, Satellite } from "lucide-react";
import { COLORS } from "../../config/theme";
import { handSpread, type HandPose } from "../../engine/gestures";
import { latLonToVector, subsolarPoint } from "../../engine/sunPosition";
import { mulberry32 } from "../../utils/prng";
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
/** Camera distance limits, in Earth radii. Far enough out to see the Moon's whole orbit. */
const ZOOM_MIN = 1.4;
const ZOOM_MAX = 200;
const clampZoom = (d: number) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, d));
/** Real scale: the Moon is about 60 Earth radii away and 0.27 Earth radii across. */
const MOON_DISTANCE = 60;
const MOON_RADIUS = 0.273;
const MOON_DIR = new THREE.Vector3(0.82, 0.08, -0.57).normalize();
/** Mars is far beyond this scene; only its direction is shown, as a marker. */
const MARS_DIR = new THREE.Vector3(-0.55, 0.12, -0.83).normalize();
const VIEW_PRESETS = { earth: 3.1, moon: 165, mars: 190 } as const;

/** A grey Moon with craters, drawn on the device (no download). Seeded, so it is the same every time. */
function moonTexture(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 128;
  const g = c.getContext("2d")!;
  g.fillStyle = "#9a9a96";
  g.fillRect(0, 0, c.width, c.height);
  const rnd = mulberry32(7);
  for (let i = 0; i < 140; i++) {
    const r = 1 + rnd() * (i < 12 ? 14 : 5);
    g.fillStyle = `rgba(${rnd() < 0.3 ? "60,60,58" : "185,185,180"},${0.25 + rnd() * 0.35})`;
    g.beginPath();
    g.arc(rnd() * c.width, rnd() * c.height, r, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** An illustrative free-return loop like Artemis II: out from Earth, around the far side of the Moon, back. Not a real trajectory. */
function freeReturnPath(): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  const side = new THREE.Vector3().crossVectors(MOON_DIR, new THREE.Vector3(0, 1, 0)).normalize();
  for (let i = 0; i <= 200; i++) {
    const t = (i / 200) * Math.PI * 2;
    // A figure-eight between Earth and just beyond the Moon.
    const along = (1 - Math.cos(t)) / 2 * (MOON_DISTANCE + 2.2);
    const across = Math.sin(t) * (along < MOON_DISTANCE * 0.9 ? 5 : 2.4) * (t < Math.PI ? 1 : -1) * Math.abs(Math.sin(t));
    pts.push(MOON_DIR.clone().multiplyScalar(along).add(side.clone().multiplyScalar(across)));
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}
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
  const view = useRef({ yaw: 0, pitch: 0.35, dist: 3.1, targetDist: null as number | null, targetYaw: null as number | null, targetPitch: 0, spin: true });
  const moonLabelRef = useRef<HTMLSpanElement>(null);
  const marsLabelRef = useRef<HTMLSpanElement>(null);
  const pathLabelRef = useRef<HTMLSpanElement>(null);
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
    // A capped backing buffer matters far more than antialiasing for a textured
    // globe, especially on iPad/Retina where 2x pixels quadruple GPU work.
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(1.25, window.devicePixelRatio));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(renderer.domElement);
    renderer.domElement.className = "block h-full w-full touch-none";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 2000);
    const day = new THREE.CanvasTexture(tex.day);
    day.colorSpace = THREE.SRGBColorSpace;
    day.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
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
    const globe = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), material);
    group.add(globe);
    const dots = new THREE.BufferGeometry();
    dots.setAttribute("position", new THREE.Float32BufferAttribute(EARTH_PLACES.flatMap((p) => latLonToVector(p.lat, p.lon).map((c) => c * 1.004)), 3));
    globe.add(new THREE.Points(dots, new THREE.PointsMaterial({ color: COLORS.tue, size: 0.028 })));
    // The Moon at true scale distance, its orbit, an illustrative Artemis II-style loop and the direction of Mars.
    const sunVec = new THREE.Vector3(...latLonToVector(sun.lat, sun.lon));
    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.copy(sunVec.clone().multiplyScalar(500));
    group.add(sunLight, new THREE.AmbientLight(0xffffff, 0.12));
    const moonTex = moonTexture();
    const moonMat = new THREE.MeshLambertMaterial({ map: moonTex });
    const moon = new THREE.Mesh(new THREE.SphereGeometry(MOON_RADIUS, 32, 24), moonMat);
    moon.position.copy(MOON_DIR.clone().multiplyScalar(MOON_DISTANCE));
    group.add(moon);
    const orbitPts: THREE.Vector3[] = [];
    const ref = new THREE.Vector3(0, 1, 0);
    const u = MOON_DIR.clone();
    const w = new THREE.Vector3().crossVectors(u, ref).normalize();
    for (let i = 0; i <= 160; i++) {
      const a = (i / 160) * Math.PI * 2;
      orbitPts.push(u.clone().multiplyScalar(Math.cos(a) * MOON_DISTANCE).add(w.clone().multiplyScalar(Math.sin(a) * MOON_DISTANCE)));
    }
    const orbit = new THREE.BufferGeometry().setFromPoints(orbitPts);
    const orbitMat = new THREE.LineBasicMaterial({ color: COLORS.ink2, transparent: true, opacity: 0.25 });
    group.add(new THREE.Line(orbit, orbitMat));
    const path = freeReturnPath();
    const pathMat = new THREE.LineDashedMaterial({ color: COLORS.cyan, dashSize: 1.6, gapSize: 1.1, transparent: true, opacity: 0.85 });
    const pathLine = new THREE.Line(path, pathMat);
    pathLine.computeLineDistances();
    group.add(pathLine);
    const mars = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), new THREE.MeshBasicMaterial({ color: 0xc1440e }));
    mars.position.copy(MARS_DIR.clone().multiplyScalar(80));
    group.add(mars);
    scene.add(group);

    const stars = new THREE.BufferGeometry();
    const sp: number[] = [];
    const rnd = mulberry32(3);
    for (let i = 0; i < 900; i++) {
      const dir = new THREE.Vector3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1).normalize();
      const v = dir.multiplyScalar(700 + rnd() * 300);
      sp.push(v.x, v.y, v.z);
    }
    stars.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
    scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: COLORS.ink2, size: 1.4, sizeAttenuation: false })));

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
      v.targetDist = null;
      // Exponential, so one wheel notch feels the same near Earth and out at the Moon.
      v.dist = clampZoom(v.dist * Math.exp(e.deltaY * 0.0015));
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });

    let raf = 0;
    let lastFrame = 0;
    let inViewport = true;
    const frameInterval = 1000 / 30;
    const intersection = new IntersectionObserver(([entry]) => {
      inViewport = Boolean(entry?.isIntersecting);
    });
    intersection.observe(el);
    let pinchFrom: { x: number; y: number } | null = null;
    let heldSince = 0;
    let lastLabel = 0;
    let twoFrom: { mid: { x: number; y: number }; spread: number; dist: number } | null = null;
    const tick = (now: number) => {
      // Keep the globe smooth enough to manipulate while avoiding a full
      // 60–120 Hz WebGL render loop. Hidden tabs and offscreen views do no work.
      raf = requestAnimationFrame(tick);
      if (document.visibilityState !== "visible" || !inViewport || now - lastFrame < frameInterval) return;
      lastFrame = now;
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
          v.dist = clampZoom(twoFrom.dist * (twoFrom.spread / spread) ** 2);
          twoFrom = { ...twoFrom, mid };
        } else twoFrom = { mid, spread, dist: v.dist };
        pinchFrom = null;
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
        } else {
          // An open or relaxed hand does nothing: only a pinch turns the globe, so resting
          // a hand in view never moves it by accident. Zoom: two pinching hands, or + and −.
          pinchFrom = null;
        }
      } else {
        twoFrom = null;
        pinchFrom = null;
      }
      if (v.targetYaw !== null) {
        let dy = v.targetYaw - v.yaw;
        dy = Math.atan2(Math.sin(dy), Math.cos(dy));
        v.yaw += dy * (reduce ? 1 : 0.08);
        v.pitch += (v.targetPitch - v.pitch) * (reduce ? 1 : 0.08);
        if (Math.abs(dy) < 0.002 && Math.abs(v.targetPitch - v.pitch) < 0.002) v.targetYaw = null;
      } else if (v.spin && !reduce) v.yaw += 0.0007;
      if (v.targetDist !== null) {
        const k = reduce ? 1 : 0.09;
        v.dist = Math.exp(Math.log(v.dist) + (Math.log(v.targetDist) - Math.log(v.dist)) * k);
        if (Math.abs(Math.log(v.targetDist / v.dist)) < 0.01) v.targetDist = null;
      }
      group.rotation.set(v.pitch, v.yaw, 0);
      camera.position.set(0, 0, v.dist);
      camera.lookAt(0, 0, 0);
      const far = v.dist > 12;
      // Real-scale Moon is a dot from far away; enlarge it (and say so in its label) once zoomed out.
      const enlarge = far ? Math.max(1, v.dist / 28) : 1;
      moon.scale.setScalar(enlarge);
      globe.scale.setScalar(far ? Math.max(1, v.dist / 40) : 1);
      pathLine.visible = far;
      mars.visible = far;
      renderer.render(scene, camera);
      // Labels follow the bodies on screen once zoomed out far enough to see them.
      const place = (label: HTMLSpanElement | null, obj: THREE.Object3D, show: boolean) => {
        if (!label) return;
        const p = obj.getWorldPosition(new THREE.Vector3()).project(camera);
        const visible = show && p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05;
        label.style.opacity = visible ? "1" : "0";
        label.style.transform = `translate(${((p.x + 1) / 2) * el.clientWidth}px, ${((1 - p.y) / 2) * el.clientHeight}px)`;
      };
      place(moonLabelRef.current, moon, far);
      place(marsLabelRef.current, mars, far);
      const mid = path.getAttribute("position");
      const midPoint = new THREE.Vector3(mid.getX(60), mid.getY(60), mid.getZ(60)).applyMatrix4(group.matrixWorld);
      const pathProbe = new THREE.Object3D();
      pathProbe.position.copy(midPoint);
      place(pathLabelRef.current, pathProbe, far);

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
    };
    raf = requestAnimationFrame(tick);

    const onKey = (e: KeyboardEvent) => {
      const step = 0.08;
      if (e.key === "ArrowLeft") v.yaw -= step;
      else if (e.key === "ArrowRight") v.yaw += step;
      else if (e.key === "ArrowUp") v.pitch = Math.min(1.4, v.pitch + step);
      else if (e.key === "ArrowDown") v.pitch = Math.max(-1.4, v.pitch - step);
      else if (e.key === "+" || e.key === "=") v.dist = clampZoom(v.dist * 0.85);
      else if (e.key === "-") v.dist = clampZoom(v.dist * 1.18);
      else if (e.key === "Home") v.targetDist = VIEW_PRESETS.earth;
      else return;
      if (e.key !== "Home") v.targetDist = null;
      e.preventDefault();
      v.spin = false;
      v.targetYaw = null;
    };
    el.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      intersection.disconnect();
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
      moonTex.dispose();
      moonMat.dispose();
      moon.geometry.dispose();
      orbit.dispose();
      orbitMat.dispose();
      path.dispose();
      pathMat.dispose();
      mars.geometry.dispose();
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
    view.current.targetDist = Math.min(view.current.dist, VIEW_PRESETS.earth);
  };

  const zoomBy = (factor: number) => {
    view.current.targetDist = clampZoom((view.current.targetDist ?? view.current.dist) * factor);
  };
  const goTo = (preset: keyof typeof VIEW_PRESETS) => {
    view.current.targetDist = VIEW_PRESETS[preset];
    view.current.spin = false;
    if (preset !== "earth") {
      // Turn so the Moon (or the direction of Mars) sits beside Earth, not behind it.
      const dir = preset === "moon" ? MOON_DIR : MARS_DIR;
      // Rotate about the vertical axis so that direction points to the right of Earth on screen.
      view.current.targetYaw = Math.atan2(dir.z, dir.x);
      view.current.targetPitch = 0.12;
    }
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
        <div ref={mount} tabIndex={0} role="img" aria-label={`Earth globe. ${center} Drag, use arrow keys, or pinch with your hand to turn it. Plus and minus keys or the zoom buttons zoom out as far as the Moon; Home returns to Earth.`} className="absolute inset-0 outline-none focus-visible:ring-2 focus-visible:ring-tue" />
        <span ref={moonLabelRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 whitespace-nowrap pl-3 text-xs font-semibold text-ink opacity-0">Moon · 384,400 km away (drawn larger)</span>
        <span ref={marsLabelRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 whitespace-nowrap pl-3 text-xs font-semibold text-[#f08a5d] opacity-0">Mars (direction only, far beyond)</span>
        <span ref={pathLabelRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 whitespace-nowrap pl-2 text-xs text-cyan opacity-0">Artemis II-style free-return loop (illustrative)</span>
        <div className="absolute right-3 top-3 flex flex-col gap-1.5" role="group" aria-label="Zoom and view">
          <button type="button" className="btn btn-secondary min-h-[44px] min-w-[44px] px-0" aria-label="Zoom in" onClick={() => zoomBy(0.6)}>
            <Plus aria-hidden="true" className="h-4 w-4" />
          </button>
          <button type="button" className="btn btn-secondary min-h-[44px] min-w-[44px] px-0" aria-label="Zoom out" onClick={() => zoomBy(1.7)}>
            <Minus aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5" role="group" aria-label="Views" style={find ? { top: "auto", bottom: "2.5rem" } : undefined}>
          <button type="button" className="btn btn-secondary min-h-[40px] px-2.5 text-xs" onClick={() => goTo("earth")}>
            <Globe2 aria-hidden="true" className="h-4 w-4" />
            Earth
          </button>
          <button type="button" className="btn btn-secondary min-h-[40px] px-2.5 text-xs" onClick={() => goTo("moon")}>
            <Moon aria-hidden="true" className="h-4 w-4" />
            Earth and Moon
          </button>
          <button type="button" className="btn btn-secondary min-h-[40px] px-2.5 text-xs" onClick={() => goTo("mars")}>
            Toward Mars
          </button>
        </div>
        {find ? <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-tue/50" /> : null}
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
