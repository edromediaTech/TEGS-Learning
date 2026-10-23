// Pilote la visibilite des variantes d'etat (shattered, emissive, color_swap)
// generees par le scene_builder.py CRNS. Lit les glTF extras (crns_state,
// crns_variant_of, crns_default_visible) et bascule node.visible selon les
// events runtime. Aucune dependance three.js explicite : on traverse via
// l'API exposee par <model-viewer> (champ .model.scene puis fallback symbol
// scan -- l'acces direct n'est pas dans la doc publique mais reste stable
// en model-viewer 3.x).
//
// Phase 2 (2026-05-04) : couple un useParticleEffects pour ajouter des
// reactions visuelles synchronisees avec les changements d'etat (bouffee de
// fumee post-explosion, etincelles sur surcharge electrique).

import { useParticleEffects, type SmokeOptions, type SparkOptions } from './useParticleEffects';
import { useMaterialFx, type DisplayTextOptions, type TintOptions } from './useMaterialFx';

interface ThreeNode {
  name?: string;
  visible: boolean;
  userData?: Record<string, any>;
  matrixWorld?: { elements: number[] | Float32Array };
  material?: any;
  traverse?: (cb: (n: ThreeNode) => void) => void;
}

export interface CrnsEvent {
  id?: string;
  action?: string;
  target?: string;
  params?: Record<string, any>;
  state?: string;
}

export interface FaultDescriptor {
  baseId: string;
  faultName: string;
  label: string | null;
  diagnosticHint: string | null;
}

export function useSimulationStateController() {
  const baseNodes = new Map<string, ThreeNode>();
  const variantNodes = new Map<string, ThreeNode[]>(); // key: `${baseId}::${state}`
  // Pannes baked dans le GLB : map baseId -> [ { faultName, hint, label } ]
  const faultCatalog = new Map<string, { faultName: string; label: string | null; hint: string | null }[]>();
  // Panne actuellement injectee (pour grading + UI reactive).
  const currentFault = ref<FaultDescriptor | null>(null);
  let scene: ThreeNode | null = null;
  const particles = useParticleEffects();
  const materialFx = useMaterialFx();

  function getThreeScene(modelViewer: any): ThreeNode | null {
    if (!modelViewer) return null;
    const direct = modelViewer.model?.scene;
    if (direct && typeof direct.traverse === 'function') return direct as ThreeNode;
    for (const sym of Object.getOwnPropertySymbols(modelViewer)) {
      const candidate = (modelViewer as any)[sym];
      if (candidate && typeof candidate.traverse === 'function') {
        return candidate as ThreeNode;
      }
    }
    return null;
  }

  function index() {
    baseNodes.clear();
    variantNodes.clear();
    faultCatalog.clear();
    if (!scene?.traverse) return;
    scene.traverse((node) => {
      const ud = node.userData || {};
      const state = ud.crns_state;
      if (typeof state !== 'string') return;
      if (state === 'default') {
        const baseId = node.name;
        if (typeof baseId === 'string' && baseId) baseNodes.set(baseId, node);
      } else {
        const baseId = ud.crns_variant_of;
        if (typeof baseId !== 'string') return;
        const key = `${baseId}::${state}`;
        const list = variantNodes.get(key) || [];
        list.push(node);
        variantNodes.set(key, list);
        // Catalog des pannes : tout state prefixe `fault_` est une panne
        if (state.startsWith('fault_') && ud.crns_is_fault) {
          const faultName = state.substring('fault_'.length);
          const list = faultCatalog.get(baseId) || [];
          if (!list.find((f) => f.faultName === faultName)) {
            list.push({
              faultName,
              label: typeof ud.crns_label === 'string' ? ud.crns_label : null,
              hint: typeof ud.crns_diagnostic_hint === 'string' ? ud.crns_diagnostic_hint : null,
            });
          }
          faultCatalog.set(baseId, list);
        }
      }
      if (ud.crns_default_visible === false) node.visible = false;
    });
  }

  function attach(modelViewer: any): boolean {
    scene = getThreeScene(modelViewer);
    if (!scene) {
      console.warn('[crns-state] scene three.js inaccessible -- variantes ignorees');
      return false;
    }
    index();
    particles.attach(scene as any);
    return true;
  }

  function detach() {
    particles.dispose();
    materialFx.dispose();
    scene = null;
    baseNodes.clear();
    variantNodes.clear();
  }

  /** Resout un baseId vers un Mesh exploitable (avec .material).
   *  Si le baseNode est un Group, descend chercher le premier Mesh. */
  function resolveMesh(baseId: string): ThreeNode | null {
    const node = baseNodes.get(baseId);
    if (!node) return null;
    if ((node as any).material) return node;
    let found: ThreeNode | null = null;
    node.traverse?.((child) => {
      if (!found && (child as any).material) found = child;
    });
    return found;
  }

  function formatValue(params: Record<string, any>): string {
    if (typeof params.text === 'string') return params.text;
    if (params.value !== undefined && params.value !== null) {
      const precision = Number(params.precision ?? 1);
      const num = Number(params.value);
      const formatted = Number.isFinite(num) ? num.toFixed(precision) : String(params.value);
      const unit = params.unit ? ` ${params.unit}` : '';
      const label = params.label ? `${params.label} ` : '';
      return `${label}${formatted}${unit}`;
    }
    return '';
  }

  function setState(baseId: string, state: string): boolean {
    const base = baseNodes.get(baseId);
    if (!base) return false;
    if (state === 'default') {
      base.visible = true;
    } else {
      const targetList = variantNodes.get(`${baseId}::${state}`);
      if (!targetList || targetList.length === 0) {
        base.visible = true;
        return false;
      }
      base.visible = false;
    }
    for (const [key, list] of variantNodes) {
      if (!key.startsWith(`${baseId}::`)) continue;
      const myState = key.slice(baseId.length + 2);
      const visible = myState === state;
      for (const node of list) node.visible = visible;
    }
    return true;
  }

  function setVisibility(baseId: string, visible: boolean): boolean {
    const base = baseNodes.get(baseId);
    if (!base) return false;
    base.visible = visible;
    return true;
  }

  function reset() {
    for (const node of baseNodes.values()) node.visible = true;
    for (const list of variantNodes.values()) {
      for (const node of list) node.visible = false;
    }
    particles.dispose();
    materialFx.clearAllDisplays();
    materialFx.clearAllTints();
    currentFault.value = null;
    if (scene) particles.attach(scene as any);
  }

  // === Fault states (Phase 3 - depannage) ===

  /** Liste les pannes connues : map baseId -> [ { faultName, label, hint } ] */
  function getFaultCatalog(): Map<string, { faultName: string; label: string | null; hint: string | null }[]> {
    return new Map(faultCatalog);
  }

  /** Met un asset en etat panne defini (state = `fault_<name>` baked). */
  function setFaultState(baseId: string, faultName: string): boolean {
    if (!setState(baseId, `fault_${faultName}`)) return false;
    const meta = (faultCatalog.get(baseId) || []).find((f) => f.faultName === faultName);
    currentFault.value = {
      baseId,
      faultName,
      label: meta?.label ?? null,
      diagnosticHint: meta?.hint ?? null,
    };
    return true;
  }

  /** Tire une panne au hasard parmi le catalog et l'applique. */
  function injectRandomFault(): FaultDescriptor | null {
    const candidates: { baseId: string; faultName: string; label: string | null; hint: string | null }[] = [];
    for (const [baseId, faults] of faultCatalog) {
      for (const f of faults) candidates.push({ baseId, ...f });
    }
    if (!candidates.length) return null;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    if (!setFaultState(pick.baseId, pick.faultName)) return null;
    return currentFault.value;
  }

  /** Retourne la panne actuellement injectee (pour grading diagnostic). */
  function getCurrentFault(): FaultDescriptor | null {
    return currentFault.value;
  }

  /** Remet tous les composants en fonctionnel et oublie la panne courante. */
  function clearAllFaults(): void {
    for (const baseId of baseNodes.keys()) {
      setState(baseId, 'default');
    }
    currentFault.value = null;
  }

  function getNodeWorldPos(node: ThreeNode | undefined): { x: number; y: number; z: number } {
    if (!node?.matrixWorld?.elements) return { x: 0, y: 0, z: 0 };
    const m = node.matrixWorld.elements;
    return { x: Number(m[12]), y: Number(m[13]), z: Number(m[14]) };
  }

  function spawnSmokeOn(baseId: string, options?: SmokeOptions): boolean {
    const node = baseNodes.get(baseId);
    if (!node) return false;
    particles.spawnSmoke(getNodeWorldPos(node), options);
    return true;
  }

  function spawnSparksOn(baseId: string, options?: SparkOptions): boolean {
    const node = baseNodes.get(baseId);
    if (!node) return false;
    particles.spawnSparks(getNodeWorldPos(node), options);
    return true;
  }

  function setDisplayText(baseId: string, text: string, options?: DisplayTextOptions): boolean {
    const mesh = resolveMesh(baseId);
    if (!mesh) return false;
    materialFx.setDisplayText(mesh as any, text, options);
    return true;
  }

  function tintAsset(
    baseId: string,
    color: number | string | [number, number, number],
    options?: TintOptions
  ): boolean {
    const mesh = resolveMesh(baseId);
    if (!mesh) return false;
    materialFx.tint(mesh as any, color, options);
    return true;
  }

  function applyEvent(ev: CrnsEvent): string | null {
    const target = ev.target;
    if (!target) return null;
    const params = ev.params || {};

    // VFX synchronises avec le changement d'etat
    let stateApplied: string | null = null;
    if (ev.state) {
      stateApplied = setState(target, ev.state) ? ev.state : null;
    } else {
      switch (ev.action) {
        case 'explode': {
          stateApplied = setState(target, 'shattered') ? 'shattered' : null;
          // Bouffee de fumee localisee sur l'asset, immediate
          const force = Number(params.force) || 4.0;
          spawnSmokeOn(target, {
            count: 60,
            spread: 0.4,
            rise: 0.35 + force * 0.08,
            lifeTime: 1.8,
            size: 0.09,
          });
          // Etincelles courtes pour signaler la rupture electrique
          spawnSparksOn(target, {
            count: 50,
            speed: 1.4 + force * 0.12,
            lifeTime: 0.8,
            size: 0.05,
          });
          break;
        }
        case 'set_emission': {
          const intensity = Number(params.intensity) || 0;
          const next = intensity > 0 ? 'emissive' : 'default';
          stateApplied = setState(target, next) ? next : null;
          // Surcharge electrique : intensity tres elevee -> etincelles
          if (intensity >= 8.0) {
            spawnSparksOn(target, { count: 40, speed: 1.0, lifeTime: 0.4 });
          }
          break;
        }
        case 'set_visibility':
          stateApplied = setVisibility(target, params.visible !== false) ? 'visibility' : null;
          break;
        case 'emit_particles': {
          // hook explicite : params.kind = 'smoke' | 'sparks'
          const kind = String(params.kind || 'smoke');
          if (kind === 'sparks') spawnSparksOn(target, params);
          else spawnSmokeOn(target, params);
          stateApplied = `particles:${kind}`;
          break;
        }
        case 'set_display_text': {
          const text = formatValue(params);
          stateApplied = setDisplayText(target, text, params as DisplayTextOptions) ? 'display' : null;
          break;
        }
        case 'tint_color': {
          const color = params.color ?? params.to ?? 0xffffff;
          stateApplied = tintAsset(target, color, {
            duration: params.duration_ms ?? params.duration,
            opacity: params.opacity,
            emissive: params.emissive,
          }) ? 'tint' : null;
          break;
        }
        case 'inject_random_fault': {
          const f = injectRandomFault();
          stateApplied = f ? `fault:${f.baseId}/${f.faultName}` : null;
          break;
        }
        case 'clear_fault': {
          clearAllFaults();
          stateApplied = 'cleared';
          break;
        }
        default:
          stateApplied = null;
      }
    }
    return stateApplied;
  }

  function knownStates(baseId: string): string[] {
    const states: string[] = [];
    for (const key of variantNodes.keys()) {
      if (key.startsWith(`${baseId}::`)) {
        states.push(key.slice(baseId.length + 2));
      }
    }
    return states;
  }

  return {
    attach,
    detach,
    setState,
    setVisibility,
    reset,
    applyEvent,
    knownStates,
    spawnSmokeOn,
    spawnSparksOn,
    setDisplayText,
    tintAsset,
    // Phase 3 - depannage
    currentFault, // ref<FaultDescriptor|null> - reactif pour bind UI
    getFaultCatalog,
    setFaultState,
    injectRandomFault,
    getCurrentFault,
    clearAllFaults,
  };
}
