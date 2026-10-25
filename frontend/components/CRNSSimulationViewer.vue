<template>
  <div ref="host" class="relative w-full h-full overflow-hidden" :style="{ background }">
    <canvas ref="canvas" class="block w-full h-full touch-none" :style="{ cursor: hovered ? 'pointer' : 'grab' }" />
    <!-- Etiquettes ancrees sur des noeuds 3D (point + trait + nom), deplacees a chaque rendu. -->
    <div v-show="labelsVisible && status === 'ready'" class="absolute inset-0 pointer-events-none">
      <svg class="absolute inset-0 w-full h-full overflow-visible">
        <g v-for="(l, i) in labels" :key="l.node" :ref="(el) => (labelLines[i] = el as SVGGElement)">
          <line stroke="#0f172a" stroke-width="2" /><circle r="5" fill="#2563eb" stroke="#fff" stroke-width="2" />
        </g>
      </svg>
      <div v-for="(l, i) in labels" :key="l.node" :ref="(el) => (labelBoxes[i] = el as HTMLDivElement)"
           class="absolute left-0 top-0 whitespace-nowrap rounded-md bg-slate-900/90 px-2.5 py-1 text-sm font-semibold text-white shadow">
        {{ l.text }}
      </div>
    </div>
    <div v-if="status !== 'ready'" class="absolute inset-0 flex items-center justify-center text-sm"
         :class="status === 'error' ? 'text-red-600' : 'text-gray-500'">
      {{ status === 'error' ? `Simulation indisponible : ${errorMessage}` : 'Chargement de la simulation...' }}
    </div>
  </div>
</template>

<script setup lang="ts">
// Lecteur 3D interactif CRNS (jalon C1, cdc_extention.md) : charge un .glb compresse
// (Draco, textures cuites) avec three.js embarque, et signale les objets touches.
// La logique du TP (ce qui se passe quand on bascule un levier...) reste dans la page,
// via l'API emise par `ready` : le lecteur ne connait aucun objet en particulier.
//
// Regles de rendu (mesures tablette Adreno 610, 24/10) : pas d'ombres temps reel
// (l'occlusion est cuite dans les textures), DPR plafonne a 1,5, rendu a la demande.

import { loadThree, THREE_DRACO_PATH, type CrnsViewerApi } from '~/composables/useThreeVendor';

const props = withDefaults(defineProps<{
  src: string;
  /** Noms des noeuds touchables (le noeud ou un de ses enfants). */
  pickable?: string[];
  background?: string;
  /** Orientation initiale de la camera autour du modele, en degres. */
  azimuth?: number;
  elevation?: number;
  /** Debattement autorise de la camera autour de la vue initiale, en degres. */
  orbitLimit?: number;
  /** Noeuds a cadrer dans la vue initiale (defaut : tout le modele). */
  frame?: string[];
  /** Etiquettes : nom affiche a cote du centre du noeud, decale de (dx, dy) pixels. */
  labels?: { node: string; text: string; dx: number; dy: number }[];
  labelsVisible?: boolean;
}>(), { pickable: () => [], background: '#e9edf2', azimuth: 18, elevation: 12, orbitLimit: 55, frame: () => [],
  labels: () => [], labelsVisible: false });

const emit = defineEmits<{
  (e: 'ready', api: CrnsViewerApi): void;
  (e: 'pick', name: string): void;
  (e: 'error', message: string): void;
}>();

const host = ref<HTMLDivElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const status = ref<'loading' | 'ready' | 'error'>('loading');
const errorMessage = ref('');
const hovered = ref<string | null>(null);

let T: any;
let renderer: any; let scene: any; let camera: any; let controls: any; let root: any;
let resizeObserver: ResizeObserver | null = null;
let frame = 0; let disposed = false;
const animations = new Set<(now: number) => boolean>();
const highlight = new Map<any, { color: any; intensity: number }>();
let home: { position: any; target: any } | null = null;
const labelLines: SVGGElement[] = [];
const labelBoxes: HTMLDivElement[] = [];
let anchors: any[] = []; // centre (repere monde) du noeud de chaque etiquette

function placeLabels() {
  if (!props.labelsVisible || !anchors.length) return;
  const w = canvas.value!.clientWidth, h = canvas.value!.clientHeight;
  const v = new T.Vector3();
  anchors.forEach((a, i) => {
    const l = props.labels[i]; const g = labelLines[i]; const box = labelBoxes[i];
    if (!a || !g || !box) return;
    v.copy(a).project(camera);
    const hidden = v.z > 1;
    const x = (v.x + 1) / 2 * w, y = (1 - v.y) / 2 * h, lx = x + l.dx, ly = y + l.dy;
    g.style.display = box.style.display = hidden ? 'none' : '';
    const [line, dot] = g.children as unknown as [SVGLineElement, SVGCircleElement];
    line.setAttribute('x1', String(x)); line.setAttribute('y1', String(y));
    line.setAttribute('x2', String(lx)); line.setAttribute('y2', String(ly));
    dot.setAttribute('cx', String(x)); dot.setAttribute('cy', String(y));
    // Boite collee a l'extremite du trait, du cote ou il part.
    box.style.transform = `translate(${l.dx < 0 ? lx - box.offsetWidth : lx}px, ${ly - box.offsetHeight / 2}px)`;
  });
}

watch(() => props.labelsVisible, () => nextTick(requestRender));

function requestRender() {
  if (!frame && !disposed) frame = requestAnimationFrame(tick);
}

function tick(now: number) {
  frame = 0;
  for (const step of [...animations]) if (!step(now)) animations.delete(step);
  const moving = controls.update(); // amortissement : continue tant que la camera glisse
  renderer.render(scene, camera);
  placeLabels();
  if (moving || animations.size) requestRender();
}

function resize() {
  if (!host.value || !renderer) return;
  const { clientWidth: w, clientHeight: h } = host.value;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  requestRender();
}

function pickableOf(object: any): string | null {
  for (let o = object; o; o = o.parent) if (props.pickable.includes(o.name)) return o.name;
  return null;
}

const raycaster = { ray: null as any, pointer: null as any };
function pickAt(ev: PointerEvent): string | null {
  const rect = canvas.value!.getBoundingClientRect();
  raycaster.pointer.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.ray.setFromCamera(raycaster.pointer, camera);
  for (const hit of raycaster.ray.intersectObject(root, true)) {
    const name = pickableOf(hit.object);
    if (name) return name;
  }
  return null;
}

function meshesOf(name: string): any[] {
  const node = root?.getObjectByName(name);
  const out: any[] = [];
  node?.traverse((o: any) => { if (o.isMesh) out.push(o); });
  return out;
}

// Materiau propre au noeud avant de le modifier (le GLB peut partager des materiaux).
function ownMaterials(name: string): any[] {
  return meshesOf(name).map((m) => {
    if (!m.userData.crnsOwnMaterial) {
      m.material = m.material.clone();
      m.userData.crnsOwnMaterial = true;
    }
    return m.material;
  });
}

function setHover(name: string | null) {
  if (name === hovered.value) return;
  for (const [mat, saved] of highlight) { mat.emissive.copy(saved.color); mat.emissiveIntensity = saved.intensity; }
  highlight.clear();
  hovered.value = name;
  if (name) {
    for (const mat of ownMaterials(name)) {
      highlight.set(mat, { color: mat.emissive.clone(), intensity: mat.emissiveIntensity });
      mat.emissive.setHex(0x2a6df4);
      mat.emissiveIntensity = 0.35;
    }
  }
  requestRender();
}

let down: { x: number; y: number } | null = null;
function onPointerDown(ev: PointerEvent) { down = { x: ev.clientX, y: ev.clientY }; }
function onPointerUp(ev: PointerEvent) {
  // Un clic ou un toucher (deplacement < 8 px) ; au-dela, c'est une rotation de camera.
  if (!down || Math.hypot(ev.clientX - down.x, ev.clientY - down.y) > 8) { down = null; return; }
  down = null;
  const name = pickAt(ev);
  if (name) emit('pick', name);
}
function onPointerMove(ev: PointerEvent) {
  if (ev.pointerType === 'mouse' && !down) setHover(pickAt(ev));
}

const api: CrnsViewerApi = {
  getNode: (name) => root?.getObjectByName(name) ?? null,
  animateRotation(name, axis, toRad, ms = 220) {
    const node = root?.getObjectByName(name);
    if (!node) return Promise.resolve();
    const from = node.rotation[axis];
    const start = performance.now();
    return new Promise((resolve) => {
      animations.add((now) => {
        const k = Math.min(1, (now - start) / ms);
        const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; // acceleration puis freinage
        node.rotation[axis] = from + (toRad - from) * e;
        if (k >= 1) resolve();
        return k < 1;
      });
      requestRender();
    });
  },
  setColor(name, hex) {
    for (const mat of ownMaterials(name)) mat.color.setHex(hex);
    requestRender();
  },
  setEmissive(name, hex, intensity = 1) {
    for (const mat of ownMaterials(name)) {
      const saved = highlight.get(mat);
      if (saved) { saved.color.setHex(hex); saved.intensity = intensity; continue; }
      mat.emissive.setHex(hex);
      mat.emissiveIntensity = intensity;
    }
    requestRender();
  },
  setOpacity(names, value) {
    for (const name of names) {
      for (const mat of ownMaterials(name)) {
        mat.transparent = value < 1;
        mat.opacity = value;
        mat.depthWrite = value >= 1; // l'interieur reste visible a travers le capot
        mat.needsUpdate = true;
      }
    }
    requestRender();
  },
  animateOpacity(names, to, ms = 600) {
    const mats = names.flatMap((n) => ownMaterials(n));
    const from = mats[0]?.opacity ?? 1;
    const start = performance.now();
    return new Promise((resolve) => {
      animations.add((now) => {
        const k = Math.min(1, (now - start) / ms);
        api.setOpacity(names, from + (to - from) * (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2));
        if (k >= 1) resolve();
        return k < 1;
      });
      requestRender();
    });
  },
  resetView() {
    if (!home) return;
    camera.position.copy(home.position);
    controls.target.copy(home.target);
    controls.update();
    requestRender();
  },
};

async function init() {
  const kit = await loadThree();
  if (disposed) return;
  T = kit.THREE;
  renderer = new T.WebGLRenderer({ canvas: canvas.value, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.toneMapping = T.NeutralToneMapping;
  scene = new T.Scene();
  scene.background = new T.Color(props.background);
  const pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new kit.RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.add(new T.HemisphereLight(0xffffff, 0x8a8f98, 0.6));
  const sun = new T.DirectionalLight(0xffffff, 1.4);
  sun.position.set(0.4, 1, 1.2);
  scene.add(sun);

  camera = new T.PerspectiveCamera(32, 1, 0.005, 50);
  controls = new kit.OrbitControls(camera, canvas.value);
  controls.enableDamping = true;
  controls.dampingFactor = 0.12;
  controls.enablePan = false;
  controls.addEventListener('change', requestRender);
  raycaster.ray = new T.Raycaster();
  raycaster.pointer = new T.Vector2();

  const draco = new kit.DRACOLoader();
  draco.setDecoderPath(THREE_DRACO_PATH);
  const loader = new kit.GLTFLoader();
  loader.setDRACOLoader(draco);
  const gltf = await loader.loadAsync(props.src);
  draco.dispose();
  if (disposed) return;
  root = gltf.scene;
  scene.add(root);

  // Cadrage : les noeuds `frame` (ou le modele entier), vus legerement de cote et d'en haut.
  const framed = props.frame.map((n) => root.getObjectByName(n)).filter(Boolean);
  const box = new T.Box3();
  for (const o of framed.length ? framed : [root]) box.expandByObject(o);
  const center = box.getCenter(new T.Vector3());
  const radius = box.getBoundingSphere(new T.Sphere()).radius;
  const dist = radius / Math.sin(T.MathUtils.degToRad(camera.fov / 2)) * 1.05;
  const az = T.MathUtils.degToRad(props.azimuth);
  const el = T.MathUtils.degToRad(props.elevation);
  camera.position.set(center.x + dist * Math.sin(az) * Math.cos(el), center.y + dist * Math.sin(el), center.z + dist * Math.cos(az) * Math.cos(el));
  camera.near = dist / 100;
  camera.far = dist * 10;
  controls.target.copy(center);
  const lim = T.MathUtils.degToRad(props.orbitLimit);
  controls.minAzimuthAngle = az - lim;
  controls.maxAzimuthAngle = az + lim;
  controls.minPolarAngle = Math.max(0.1, Math.PI / 2 - el - lim);
  controls.maxPolarAngle = Math.min(Math.PI - 0.1, Math.PI / 2 - el + lim);
  controls.minDistance = dist * 0.45;
  controls.maxDistance = dist * (framed.length ? 3 : 1.6);
  home = { position: camera.position.clone(), target: center.clone() };
  anchors = props.labels.map((l) => {
    const node = root.getObjectByName(l.node);
    return node ? new T.Box3().setFromObject(node).getCenter(new T.Vector3()) : null;
  });

  const c = canvas.value!;
  c.addEventListener('pointerdown', onPointerDown);
  c.addEventListener('pointerup', onPointerUp);
  c.addEventListener('pointermove', onPointerMove);
  c.addEventListener('pointerleave', () => setHover(null));
  resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(host.value!);
  resize();
  status.value = 'ready';
  emit('ready', api);
}

onMounted(() => {
  init().catch((err) => {
    status.value = 'error';
    errorMessage.value = err?.message || String(err);
    emit('error', errorMessage.value);
  });
});

onBeforeUnmount(() => {
  disposed = true;
  if (frame) cancelAnimationFrame(frame);
  resizeObserver?.disconnect();
  controls?.dispose();
  root?.traverse((o: any) => {
    if (!o.isMesh) return;
    o.geometry.dispose();
    for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap']) o.material[key]?.dispose();
    o.material.dispose();
  });
  scene?.environment?.dispose();
  renderer?.dispose();
});
</script>
