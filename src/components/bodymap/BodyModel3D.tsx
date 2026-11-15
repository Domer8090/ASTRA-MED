import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { BODY_SYSTEM_IDS, type BodySystemId, type BodySystemState } from "../../types/health";
import { STATUS_COLOR } from "../../config/theme";
import { BODY_SYSTEMS } from "../../data/bodySystems";

interface Props {
  systems: Record<BodySystemId, BodySystemState>;
  selected: BodySystemId;
  onSelect: (id: BodySystemId) => void;
  onControlsReady: (controls: BodyViewControls | null) => void;
}

export interface BodyViewControls {
  zoom: (factor: number) => void;
  reset: () => void;
}

// Order matters: a mesh takes the first system whose pattern matches its name,
// so the broad musculoskeletal pattern comes last.
const MATCH_ORDER: readonly BodySystemId[] = ["cardiovascular", "neuroOcular", "immuneRadiation", "metabolicCircadian", "musculoskeletal"];

const KEYWORDS: Record<BodySystemId, RegExp> = {
  neuroOcular: /brain|cerebr|eye|optic|retina|nerve|cranial|visual|orbit|ear|spinal cord/i,
  cardiovascular: /heart|arter|vein|aorta|atri(?:um|al|oventricular)|(?:left|right) ventricle|papillary muscle|cardiac|capillar|vascular|blood/i,
  musculoskeletal: /bone|skeleton|muscl|cartilage|joint|tendon|ligament|vertebr|rib|femur|skull/i,
  immuneRadiation: /lymph|thymus|spleen|tonsil|marrow|immune/i,
  metabolicCircadian: /liver|stomach|intestin|pancrea|adrenal|thyroid|kidney|digest|endocrin|gallbladder/i,
};

// Reproductive anatomy is outside this crew-health view's scope. Keep the
// attributed source model intact, but omit external genital structures and
// testes from the rendered scene.
const HIDDEN_ANATOMY = /corpus cavernosum|corpus spongiosum|glans penis|penis|epididymis|testis/i;

// Calibrated in the centered 4.7-unit model space. These points are transformed
// with the model every frame, so the controls stay attached through rotation.
const MODEL_ANCHORS: Record<BodySystemId, THREE.Vector3> = {
  neuroOcular: new THREE.Vector3(0, 2.12, 0.18),
  cardiovascular: new THREE.Vector3(0.12, 1.25, 0.24),
  musculoskeletal: new THREE.Vector3(-0.32, -1.15, 0.16),
  immuneRadiation: new THREE.Vector3(0.3, 0.55, 0.2),
  metabolicCircadian: new THREE.Vector3(-0.3, 0.55, 0.2),
};

type MarkerPosition = { x: number; y: number };

/** Loads the attributed Z-Anatomy meshes locally and supports drag rotation / wheel zoom. */
export function BodyModel3D({ systems, selected, onSelect, onControlsReady }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<{ zoom: (factor: number) => void; reset: () => void } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [markerPositions, setMarkerPositions] = useState<Partial<Record<BodySystemId, MarkerPosition>>>({});
  const anchorsRef = useRef<Partial<Record<BodySystemId, THREE.Vector3>>>({});
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const systemsRef = useRef(systems);
  systemsRef.current = systems;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: "low-power" }); } catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(31, 1, 0.01, 100);
    camera.position.set(0, 0, 5);
    scene.add(new THREE.HemisphereLight(0xddeeff, 0x17283c, 2.2));
    const key = new THREE.DirectionalLight(0xf0f7ff, 2.8); key.position.set(-3, 4, 5); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.8); fill.position.set(3, 0, -3); scene.add(fill);
    const model = new THREE.Group(); scene.add(model);
    const modelSize = new THREE.Vector3();
    let loaded = false;
    let fitDistance = 10;
    let zoom = 1;
    const updateMarkerPositions = () => {
      if (!loaded) return;
      const width = host.clientWidth, height = host.clientHeight;
      if (!width || !height) return;
      model.updateMatrixWorld(true);
      camera.updateMatrixWorld(true);
      const next: Partial<Record<BodySystemId, MarkerPosition>> = {};
      for (const id of BODY_SYSTEM_IDS) {
        const anchor = anchorsRef.current[id];
        if (!anchor) continue;
        const projected = model.localToWorld(anchor.clone()).project(camera);
        if (projected.z < -1 || projected.z > 1 || Math.abs(projected.x) > 1.1 || Math.abs(projected.y) > 1.1) continue;
        next[id] = { x: (projected.x * 0.5 + 0.5) * width, y: (-projected.y * 0.5 + 0.5) * height };
      }
      setMarkerPositions(next);
    };
    const applyZoom = () => {
      camera.position.set(0, 0, fitDistance / zoom);
      camera.lookAt(0, 0, 0);
      if (loaded) {
        updateMarkerPositions();
        requestRender();
      }
    };
    controlsRef.current = {
      zoom: (factor) => { zoom = THREE.MathUtils.clamp(zoom * factor, 0.82, 1.28); applyZoom(); },
      reset: () => { zoom = 1; model.rotation.set(0, 0, 0); fitCamera(); },
    };
    onControlsReady(controlsRef.current);
    let renderFrame = 0;
    const requestRender = () => {
      if (renderFrame) return;
      renderFrame = requestAnimationFrame(() => { renderFrame = 0; renderer.render(scene, camera); });
    };

    // One material per status, shared by every mesh of that status. The selected
    // system keeps its full status colour with shading and a glow of the same hue,
    // drawn on top so it reads through the skin; the others are muted toward grey.
    // (An unlit flat material washed the selection out to near white.)
    const statusMaterials = new Map<string, THREE.Material>();
    const statusMaterial = (status: keyof typeof STATUS_COLOR, active: boolean) => {
      const key = `${status}:${active}`;
      let material = statusMaterials.get(key);
      if (!material) {
        const color = new THREE.Color(STATUS_COLOR[status]);
        material = active
          ? new THREE.MeshStandardMaterial({ color, emissive: color.clone().multiplyScalar(0.45), roughness: 0.55, metalness: 0, side: THREE.DoubleSide, depthTest: false, depthWrite: false })
          : new THREE.MeshStandardMaterial({ color: color.clone().lerp(new THREE.Color(0x5b6675), 0.6), roughness: 0.85, metalness: 0, transparent: true, opacity: 0.55 });
        statusMaterials.set(key, material);
      }
      return material;
    };

    const shell = new THREE.MeshStandardMaterial({ color: 0xc7d2dc, roughness: 0.9, transparent: true, opacity: 0.14, depthWrite: false });

    const updateHighlight = () => {
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        if (HIDDEN_ANATOMY.test(object.name)) {
          object.visible = false;
          return;
        }
        if (!object.userData.astraSourceMaterial) object.userData.astraSourceMaterial = object.material;
        const system = MATCH_ORDER.find((id) => KEYWORDS[id].test(object.name));
        const active = system === selectedRef.current;
        object.visible = true;
        object.renderOrder = active ? 10 : 0;
        // Skin and other unmapped tissue is a faint neutral shell so the coloured systems show through.
        object.material = system ? statusMaterial(systemsRef.current[system].status, active) : shell;
      });
      if (loaded) requestRender();
    };

    const fitCamera = () => {
      const rotation = new THREE.Matrix4().makeRotationFromEuler(model.rotation);
      const bounds = new THREE.Box3().makeEmpty();
      for (const x of [-0.5, 0.5]) for (const y of [-0.5, 0.5]) for (const z of [-0.5, 0.5]) {
        bounds.expandByPoint(new THREE.Vector3(x * modelSize.x, y * modelSize.y, z * modelSize.z).applyMatrix4(rotation));
      }
      const size = bounds.getSize(new THREE.Vector3());
      const verticalFov = THREE.MathUtils.degToRad(camera.fov);
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
      fitDistance = Math.max(
        size.y / (2 * Math.tan(verticalFov / 2)),
        size.x / (2 * Math.tan(horizontalFov / 2)),
      ) * 1.18;
      applyZoom();
    };

    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, true);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (loaded) fitCamera();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const draco = new DRACOLoader();
    draco.setDecoderPath("/models/draco/");
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    loader.load("/models/z-anatomy-systems.glb", (gltf) => {
      // Center the source scene itself before scaling. Scaling a translated parent
      // also scales its offset, which made the figure drift during zoom/resize.
      model.add(gltf.scene);
      host.dataset.modelError = "";
      setLoadError(false);
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      const center = bounds.getCenter(new THREE.Vector3());
      const maxDimension = Math.max(size.x, size.y, size.z);
      gltf.scene.position.sub(center);
      const modelScale = 4.7 / maxDimension;
      model.scale.setScalar(modelScale);
      modelSize.copy(size).multiplyScalar(modelScale);
      model.position.set(0, 0, 0);
      model.updateMatrixWorld(true);
      // These anchor points are calibrated after normalization. Undo the
      // parent scale here so their rendered world positions stay exact.
      anchorsRef.current = Object.fromEntries(BODY_SYSTEM_IDS.map((id) => [id, MODEL_ANCHORS[id].clone().multiplyScalar(1 / modelScale)]));
      loaded = true;
      updateHighlight();
      resize();
    }, undefined, () => { host.dataset.modelError = "true"; setLoadError(true); });

    let down = false, lastX = 0, lastY = 0;
    const canvas = renderer.domElement;
    const pointerDown = (event: PointerEvent) => { down = true; lastX = event.clientX; lastY = event.clientY; canvas.setPointerCapture(event.pointerId); };
    const pointerMove = (event: PointerEvent) => {
      if (!down) return;
      model.rotation.y += (event.clientX - lastX) * 0.008;
      model.rotation.x = THREE.MathUtils.clamp(model.rotation.x + (event.clientY - lastY) * 0.004, -0.3, 0.3);
      lastX = event.clientX; lastY = event.clientY;
      if (loaded) fitCamera();
    };
    const pointerUp = () => { down = false; };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      zoom = THREE.MathUtils.clamp(zoom * (event.deltaY < 0 ? 1.06 : 0.94), 0.82, 1.28);
      applyZoom();
    };
    canvas.addEventListener("pointerdown", pointerDown); canvas.addEventListener("pointermove", pointerMove);
    canvas.addEventListener("pointerup", pointerUp); canvas.addEventListener("pointercancel", pointerUp);
    canvas.addEventListener("wheel", wheel, { passive: false });
    const onSelection = (event: Event) => { selectedRef.current = (event as CustomEvent<BodySystemId>).detail; updateHighlight(); };
    host.addEventListener("body-selection", onSelection);

    return () => {
      controlsRef.current = null;
      onControlsReady(null);
      anchorsRef.current = {};
      setMarkerPositions({});
      host.removeEventListener("body-selection", onSelection); observer.disconnect();
      canvas.removeEventListener("pointerdown", pointerDown); canvas.removeEventListener("pointermove", pointerMove);
      canvas.removeEventListener("pointerup", pointerUp); canvas.removeEventListener("pointercancel", pointerUp); canvas.removeEventListener("wheel", wheel);
      if (renderFrame) cancelAnimationFrame(renderFrame);
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const source = object.userData.astraSourceMaterial as THREE.Material | THREE.Material[] | undefined;
        for (const material of Array.isArray(source) ? source : source ? [source] : []) material.dispose();
      });
      for (const material of statusMaterials.values()) material.dispose();
      shell.dispose();
      draco.dispose();
      renderer.dispose(); renderer.domElement.remove();
    };
  }, [onControlsReady]);

  useEffect(() => {
    hostRef.current?.dispatchEvent(new CustomEvent("body-selection", { detail: selected }));
  }, [selected, systems]);

  return (
    <div className="relative h-full w-full">
      <div ref={hostRef} className="h-full w-full touch-none" role="img" aria-label="Interactive 3D Z-Anatomy model. Reproductive anatomy is hidden. Drag to rotate; scroll or use the controls to zoom." />
      {BODY_SYSTEM_IDS.map((id) => {
        const position = markerPositions[id];
        if (!position) return null;
        const status = systems[id].status;
        const statusColor = STATUS_COLOR[status];
        const isSelected = selected === id;
        return (
          <button
            key={id}
            type="button"
            aria-label={`${BODY_SYSTEMS[id].name}: ${status}. ${isSelected ? "Selected." : "Select system."}`}
            aria-pressed={isSelected}
            title={`${BODY_SYSTEMS[id].shortName}: ${status}`}
            onClick={() => onSelect(id)}
            className="absolute z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan"
            style={{ left: position.x, top: position.y }}
          >
            <span
              aria-hidden="true"
              className={`block rounded-full border border-space ${isSelected ? "h-4 w-4 outline outline-2 outline-offset-2 outline-cyan" : "h-3 w-3"}`}
              style={{ backgroundColor: statusColor }}
            />
          </button>
        );
      })}
      {loadError ? <p className="absolute inset-x-2 bottom-2 rounded-control border border-line bg-panel/95 px-2 py-1 text-center text-xs text-ink-2" role="status">3D anatomy could not load. Status hotspots remain available.</p> : null}
    </div>
  );
}
