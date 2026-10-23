// Effets sur materiaux pour les simulations CRNS :
//   - texte dynamique (multimetres, ecrans, alertes) via THREE.CanvasTexture
//   - virage de couleur progressif (phenolphtaleine, chauffage, etc.) via tween
//
// Pas de scene a attacher : on agit directement sur les materiaux des Mesh
// passes en argument. Une seule RAF loop partagee tient les tweens.

import * as THREE from 'three';

type AnyMesh = {
  material: any | any[];
  userData?: Record<string, any>;
};

interface ColorTween {
  material: any;
  fromColor: THREE.Color;
  toColor: THREE.Color;
  start: number;
  duration: number;
  fromOpacity?: number;
  toOpacity?: number;
  fromEmissive?: THREE.Color;
  toEmissive?: THREE.Color;
}

export interface DisplayTextOptions {
  width?: number;       // px canvas (def. 512)
  height?: number;      // px canvas (def. 256)
  background?: string;  // CSS color
  color?: string;       // CSS color du texte
  font?: string;        // ex: "bold 110px monospace"
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
  emissive?: number;    // hex - rend l'ecran lumineux (LCD on)
  emissiveIntensity?: number; // 0..2
}

export interface TintOptions {
  duration?: number;    // ms (def. 600)
  opacity?: number;     // cible 0..1
  emissive?: number;    // hex - vire aussi l'emission
}

export function useMaterialFx() {
  interface DisplayCache {
    mesh: AnyMesh;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    texture: THREE.CanvasTexture;
    // Sauvegarde des proprietes du materiau d'origine pour pouvoir revenir
    // en arriere. On NE REMPLACE PAS le materiau (incompatibilite cross-THREE
    // entre l'instance importee 0.184 et celle de model-viewer 3.5 ~0.158).
    // On mute uniquement les champs map/emissive/emissiveMap.
    originals: { material: any; map: any; color: THREE.Color | null; emissive: THREE.Color | null; emissiveMap: any; emissiveIntensity: number | null }[];
  }
  const tweens: ColorTween[] = [];
  const displayCache = new Map<object, DisplayCache>();
  // sauvegarde des couleurs/opacite/emissive d'origine pour pouvoir reset un tint
  const tintOriginals = new Map<any, { color?: THREE.Color; opacity?: number; transparent?: boolean; emissive?: THREE.Color }>();
  let rafId: number | null = null;

  function parseColor(input: number | string | [number, number, number]): THREE.Color {
    if (typeof input === 'number') return new THREE.Color(input);
    if (typeof input === 'string') return new THREE.Color(input);
    if (Array.isArray(input)) return new THREE.Color(input[0], input[1], input[2]);
    return new THREE.Color(0xffffff);
  }

  function eachMaterial(mesh: AnyMesh, cb: (m: any) => void): void {
    const mat = mesh.material;
    if (!mat) return;
    if (Array.isArray(mat)) mat.forEach(cb);
    else cb(mat);
  }

  function tint(
    mesh: AnyMesh,
    color: number | string | [number, number, number],
    options: TintOptions = {}
  ): void {
    if (!mesh) return;
    const targetColor = parseColor(color);
    const duration = (options.duration ?? 600) / 1000;
    eachMaterial(mesh, (mat) => {
      if (!mat || !mat.color) return;
      if (!tintOriginals.has(mat)) {
        tintOriginals.set(mat, {
          color: mat.color.clone(),
          opacity: mat.opacity,
          transparent: mat.transparent,
          emissive: mat.emissive ? mat.emissive.clone() : undefined,
        });
      }
      const fromColor = mat.color.clone();
      const tween: ColorTween = {
        material: mat,
        fromColor,
        toColor: targetColor.clone(),
        start: performance.now() / 1000,
        duration,
      };
      if (options.opacity !== undefined) {
        mat.transparent = true;
        tween.fromOpacity = mat.opacity ?? 1;
        tween.toOpacity = options.opacity;
      }
      if (options.emissive !== undefined && mat.emissive) {
        tween.fromEmissive = mat.emissive.clone();
        tween.toEmissive = parseColor(options.emissive);
      }
      tweens.push(tween);
    });
    ensureRaf();
  }

  function setDisplayText(
    mesh: AnyMesh,
    text: string,
    options: DisplayTextOptions = {}
  ): void {
    if (!mesh) return;
    const w = options.width ?? 512;
    const h = options.height ?? 256;
    const bg = options.background ?? '#0b0f14';
    const fg = options.color ?? '#7CFC00';
    const font = options.font ?? 'bold 110px "Courier New", monospace';
    const align = options.align ?? 'center';
    const baseline = options.baseline ?? 'middle';

    let cache = displayCache.get(mesh as object);
    if (!cache) {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;
      texture.anisotropy = 4;

      // Mute le(s) materiau(x) existant(s) au lieu de les remplacer :
      // model-viewer embarque sa propre instance three.js, et un materiau
      // construit depuis notre instance importee n'est pas compilable par
      // son renderer (l'objet "disparait" a l'ecran). Une simple Texture par
      // contre est lue de maniere stable cross-version.
      const originals: DisplayCache['originals'] = [];
      eachMaterial(mesh, (mat) => {
        if (!mat) return;
        originals.push({
          material: mat,
          map: mat.map ?? null,
          color: mat.color ? mat.color.clone() : null,
          emissive: mat.emissive ? mat.emissive.clone() : null,
          emissiveMap: mat.emissiveMap ?? null,
          emissiveIntensity: typeof mat.emissiveIntensity === 'number' ? mat.emissiveIntensity : null,
        });
        // Texture en map de base (couleur brute) ET en emissiveMap (effet LCD lumineux)
        if ('map' in mat) mat.map = texture;
        if (mat.color) mat.color.setHex(0xffffff); // ne pas teinter le canvas
        if (mat.emissive) {
          mat.emissive.setHex(0xffffff);
          if ('emissiveMap' in mat) mat.emissiveMap = texture;
          if ('emissiveIntensity' in mat) {
            mat.emissiveIntensity = options.emissiveIntensity ?? 1.0;
          }
        }
        mat.needsUpdate = true;
      });

      cache = { mesh, canvas, ctx, texture, originals };
      displayCache.set(mesh as object, cache);
    } else {
      // re-dimensionne si l'appelant change la geometrie du canvas
      if (cache.canvas.width !== w || cache.canvas.height !== h) {
        cache.canvas.width = w;
        cache.canvas.height = h;
      }
    }

    const { ctx, canvas, texture } = cache;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Bordure interieure subtile pour effet "ecran"
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, canvas.width - 16, canvas.height - 16);

    ctx.fillStyle = fg;
    ctx.font = font;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    // Petit halo pour effet LED
    ctx.shadowColor = fg;
    ctx.shadowBlur = 18;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 0;

    texture.needsUpdate = true;
  }

  function restoreFromCache(cache: DisplayCache): void {
    for (const o of cache.originals) {
      const mat = o.material;
      if ('map' in mat) mat.map = o.map;
      if (mat.color && o.color) mat.color.copy(o.color);
      if (mat.emissive && o.emissive) mat.emissive.copy(o.emissive);
      if ('emissiveMap' in mat) mat.emissiveMap = o.emissiveMap;
      if ('emissiveIntensity' in mat && o.emissiveIntensity !== null) {
        mat.emissiveIntensity = o.emissiveIntensity;
      }
      mat.needsUpdate = true;
    }
    cache.texture.dispose();
  }

  function clearDisplay(mesh: AnyMesh): void {
    const cache = displayCache.get(mesh as object);
    if (!cache) return;
    restoreFromCache(cache);
    displayCache.delete(mesh as object);
  }

  function clearAllDisplays(): void {
    for (const cache of displayCache.values()) restoreFromCache(cache);
    displayCache.clear();
  }

  function clearAllTints(): void {
    for (const [mat, orig] of tintOriginals) {
      if (orig.color && mat.color) mat.color.copy(orig.color);
      if (orig.opacity !== undefined) mat.opacity = orig.opacity;
      if (orig.transparent !== undefined) mat.transparent = orig.transparent;
      if (orig.emissive && mat.emissive) mat.emissive.copy(orig.emissive);
    }
    tintOriginals.clear();
    // arrete les tweens en cours
    tweens.length = 0;
  }

  function ensureRaf() {
    if (rafId !== null) return;
    const tick = () => {
      const now = performance.now() / 1000;
      for (let i = tweens.length - 1; i >= 0; i--) {
        const tw = tweens[i];
        const t = Math.min(1, (now - tw.start) / tw.duration);
        // ease in-out cubique
        const k = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        if (tw.material.color) {
          tw.material.color.copy(tw.fromColor).lerp(tw.toColor, k);
        }
        if (tw.toOpacity !== undefined && tw.fromOpacity !== undefined) {
          tw.material.opacity = tw.fromOpacity + (tw.toOpacity - tw.fromOpacity) * k;
        }
        if (tw.toEmissive && tw.fromEmissive && tw.material.emissive) {
          tw.material.emissive.copy(tw.fromEmissive).lerp(tw.toEmissive, k);
        }
        if (t >= 1) tweens.splice(i, 1);
      }
      if (tweens.length === 0) {
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
    clearAllTints();
    clearAllDisplays();
  }

  function activeTweens(): number {
    return tweens.length;
  }

  return { tint, setDisplayText, clearDisplay, clearAllDisplays, clearAllTints, dispose, activeTweens };
}
