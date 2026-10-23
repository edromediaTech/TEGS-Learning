// Moteur de particules pour les simulations CRNS, version "cross-instance safe".
//
// `<model-viewer>` 3.5 charge sa propre instance de three.js (~0.163) via CDN.
// Importer `three` cote Nuxt (meme version exacte) cree une SECONDE instance JS,
// et le renderer interne ne sait pas compiler les materiaux issus de la copie
// importee (les Points etaient invisibles -- cf. warning "Multiple instances of
// Three.js").
//
// Strategie : ne creer AUCUN nouvel objet three depuis l'exterieur. On clone un
// Mesh deja present dans la scene (donc cree par le THREE de model-viewer) et
// on s'en sert comme template de particule. Une RAF locale anime la position,
// la velocite et l'opacite via les methodes natives de Object3D / Material.

interface ThreeNode {
  isMesh?: boolean;
  geometry?: any;
  material?: any;
  position?: { x: number; y: number; z: number; set: (x: number, y: number, z: number) => any };
  scale?: { setScalar: (v: number) => any };
  visible?: boolean;
  matrixAutoUpdate?: boolean;
  traverse?: (cb: (n: ThreeNode) => void) => void;
}

interface SceneLike {
  add: (obj: any) => void;
  remove: (obj: any) => void;
  traverse?: (cb: (n: ThreeNode) => void) => void;
}

interface Emitter {
  mesh: any;
  vx: number; vy: number; vz: number;
  age: number;
  lifeTime: number;
  gravity: number;
  startOpacity: number;
}

export interface SmokeOptions {
  count?: number;
  spread?: number;
  rise?: number;
  lifeTime?: number;
  size?: number;
  color?: number;
  opacity?: number;
}

export interface SparkOptions {
  count?: number;
  speed?: number;
  lifeTime?: number;
  size?: number;
  color?: number;
  opacity?: number;
  gravity?: number;
}

export function useParticleEffects() {
  let scene: SceneLike | null = null;
  let template: any | null = null;
  const emitters: Emitter[] = [];
  let rafId: number | null = null;
  let lastT = 0;

  /** Cherche le Mesh template ideal pour servir de particule :
   *  forme la plus "cubique" (ratio dims max/min minimal), excluant les
   *  planes qui rendraient des particules-feuilles. */
  function findTemplate(s: SceneLike): any | null {
    let best: any = null;
    let bestRatio = Infinity;
    let firstMesh: any = null;
    s.traverse?.((n) => {
      if (!n.isMesh || !n.geometry || !n.material) return;
      if (!firstMesh) firstMesh = n;
      const g = n.geometry;
      if (typeof g.computeBoundingBox === 'function' && !g.boundingBox) g.computeBoundingBox();
      const bb = g.boundingBox;
      if (!bb) return;
      const dx = bb.max.x - bb.min.x;
      const dy = bb.max.y - bb.min.y;
      const dz = bb.max.z - bb.min.z;
      const dims = [dx, dy, dz].map((v) => Math.max(0.001, v));
      const max = Math.max(...dims);
      const min = Math.min(...dims);
      const ratio = max / min;
      // ecarte les planes (ratio > 50) et les tres allonges (cylindres scale [0.05, 0.05, 2])
      if (ratio > 20) return;
      if (ratio < bestRatio) {
        bestRatio = ratio;
        best = n;
      }
    });
    return best || firstMesh;
  }

  function attach(threeScene: SceneLike): void {
    scene = threeScene;
    template = findTemplate(threeScene);
    if (!template) {
      console.warn('[crns-particles] aucun Mesh template trouve dans la scene');
    }
  }

  function makeParticle(color: number, size: number, opacity: number, emissive: boolean): any | null {
    if (!template) return null;
    // Clone shallow : geometrie partagee (gain memoire), materiau a cloner.
    const p = template.clone(false);
    p.material = template.material.clone ? template.material.clone() : template.material;
    const mat = p.material;
    if (mat.color) mat.color.setHex(color);
    if (mat.map !== undefined) mat.map = null;
    if (mat.normalMap !== undefined) mat.normalMap = null;
    if (mat.roughnessMap !== undefined) mat.roughnessMap = null;
    if (mat.metalnessMap !== undefined) mat.metalnessMap = null;
    if ('roughness' in mat) mat.roughness = 1;
    if ('metalness' in mat) mat.metalness = 0;
    if (emissive && mat.emissive) {
      mat.emissive.setHex(color);
      if ('emissiveIntensity' in mat) mat.emissiveIntensity = 2.0;
      if ('emissiveMap' in mat) mat.emissiveMap = null;
      // AdditiveBlending = 2 (constante stable three.js)
      mat.blending = 2;
    } else if (mat.emissive) {
      mat.emissive.setHex(0x000000);
      if ('emissiveMap' in mat) mat.emissiveMap = null;
      // NormalBlending = 1
      mat.blending = 1;
    }
    mat.transparent = true;
    mat.opacity = opacity;
    if ('depthWrite' in mat) mat.depthWrite = false;
    mat.needsUpdate = true;
    p.scale.setScalar(size);
    if ('castShadow' in p) p.castShadow = false;
    if ('receiveShadow' in p) p.receiveShadow = false;
    return p;
  }

  function spawnSmoke(
    position: { x: number; y: number; z: number },
    options: SmokeOptions = {}
  ): void {
    if (!scene || !template) return;
    const count = options.count ?? 80;
    const spread = options.spread ?? 0.3;
    const rise = options.rise ?? 0.7;
    const lifeTime = options.lifeTime ?? 1.8;
    const size = options.size ?? 0.07;
    const color = options.color ?? 0x9aa0a8;
    const opacity = options.opacity ?? 0.55;

    for (let i = 0; i < count; i++) {
      const p = makeParticle(color, size, opacity, false);
      if (!p) return;
      p.position.set(
        position.x + (Math.random() - 0.5) * spread,
        position.y + (Math.random() - 0.5) * spread * 0.5,
        position.z + (Math.random() - 0.5) * spread,
      );
      const angle = Math.random() * Math.PI * 2;
      const horiz = Math.random() * 0.3;
      scene.add(p);
      emitters.push({
        mesh: p,
        vx: Math.cos(angle) * horiz,
        vy: rise * (0.7 + Math.random() * 0.6),
        vz: Math.sin(angle) * horiz,
        age: Math.random() * 0.2,
        lifeTime,
        gravity: -0.15,
        startOpacity: opacity,
      });
    }
    ensureRaf();
  }

  function spawnSparks(
    position: { x: number; y: number; z: number },
    options: SparkOptions = {}
  ): void {
    if (!scene || !template) return;
    const count = options.count ?? 80;
    const speed = options.speed ?? 1.6;
    const lifeTime = options.lifeTime ?? 0.7;
    const size = options.size ?? 0.04;
    const color = options.color ?? 0xffd24a;
    const opacity = options.opacity ?? 1.0;
    const gravity = options.gravity ?? -2.5;

    for (let i = 0; i < count; i++) {
      const p = makeParticle(color, size, opacity, true);
      if (!p) return;
      p.position.set(position.x, position.y, position.z);
      const u = Math.random() * 2 - 1;
      const phi = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const v = speed * (0.4 + Math.random() * 0.8);
      scene.add(p);
      emitters.push({
        mesh: p,
        vx: r * Math.cos(phi) * v,
        vy: u * v + 0.5,
        vz: r * Math.sin(phi) * v,
        age: 0,
        lifeTime,
        gravity,
        startOpacity: opacity,
      });
    }
    ensureRaf();
  }

  function ensureRaf() {
    if (rafId !== null) return;
    lastT = performance.now() / 1000;
    const tick = () => {
      const now = performance.now() / 1000;
      const dt = Math.min(0.05, now - lastT);
      lastT = now;

      for (let i = emitters.length - 1; i >= 0; i--) {
        const e = emitters[i];
        e.age += dt;
        if (e.age >= e.lifeTime) {
          scene?.remove(e.mesh);
          if (e.mesh.material && typeof e.mesh.material.dispose === 'function') {
            e.mesh.material.dispose();
          }
          emitters.splice(i, 1);
          continue;
        }
        e.vy += e.gravity * dt;
        if (e.mesh.position) {
          e.mesh.position.set(
            e.mesh.position.x + e.vx * dt,
            e.mesh.position.y + e.vy * dt,
            e.mesh.position.z + e.vz * dt,
          );
        }
        // fade
        if (e.mesh.material) {
          const t = e.age / e.lifeTime;
          e.mesh.material.opacity = e.startOpacity * (1 - t);
        }
      }

      if (emitters.length === 0) {
        rafId = null;
        return;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  function dispose(): void {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    for (const e of emitters) {
      scene?.remove(e.mesh);
      if (e.mesh.material && typeof e.mesh.material.dispose === 'function') {
        e.mesh.material.dispose();
      }
    }
    emitters.length = 0;
    template = null;
    scene = null;
  }

  function activeCount(): number {
    return emitters.length;
  }

  return { attach, spawnSmoke, spawnSparks, dispose, activeCount };
}
