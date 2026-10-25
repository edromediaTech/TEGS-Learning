// Moteur generique d'un TP 3D CRNS, entierement pilote par le manifeste du composant
// (component.json, format crns-component/1) : aucun nom de piece n'est ecrit en dur ici.
// Utilise par CrnsTpPlayer (demonstrateur, futur bloc de module TEGS, cockpit de revue QA).
//
// Evenements : chaque action emet `crns-sim-event` (window) avec un verbe xAPI de la liste
// blanche TEGS (manifest.interaction.xapi), pret a etre relie au suivi des simulations.

import type { CrnsViewerApi } from './useThreeVendor';
import { contactPower, current, fr, heatLevel, steadyTemperature, stepTemperature, type HeatLevel } from '~/utils/crnsCircuit';

type Vec3 = [number, number, number];
const hex = (s: string) => parseInt(s.replace('#', ''), 16);
const deg = (d: number) => (d * Math.PI) / 180;
const axisVec = (axis: string, v: number): Vec3 => (axis === 'x' ? [v, 0, 0] : axis === 'y' ? [0, v, 0] : [0, 0, v]);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const PATH_GLOW = 0x22d3ee;

export function useCrnsTp(manifest: any) {
  const ia = manifest.interaction || {};
  const actuators = new Map<string, any>((manifest.kinematics?.actuators || []).map((a: any) => [a.id, a]));
  const sw = manifest.electrical?.switch;
  const switchAct = sw ? actuators.get(sw.actuator) : null;
  const circuit = ia.circuit || null;
  const fault = (ia.faults || [])[0] || null;
  const faultAct = fault ? actuators.get(fault.actuator) : null;
  const texts = ia.texts || {};
  const capotNodes: string[] = ia.capot || [];
  const hideOnExplode: string[] = ia.explode_hide || [];
  const capotMin = ia.capot_min_opacity ?? 0.12;

  const api = shallowRef<CrnsViewerApi | null>(null);
  const ready = ref(false);
  const on = ref(false);
  const busy = ref(false);
  const count = ref(0);
  const capot = ref(1);
  const eclate = ref(0);
  const loadId = ref<string>(circuit?.loads?.[0]?.id ?? '');
  const loose = ref(false);
  const temperature = ref<number>(fault?.ambient_C ?? 25);
  const heat = ref<HeatLevel>('normal');
  const pathHighlight = ref(false);
  const events = ref<{ seq: number; time: string; label: string }[]>([]);
  let seq = 0;

  // --- Mesures : P = U x I, echauffement du contact ---
  const load = computed(() => circuit?.loads?.find((l: any) => l.id === loadId.value) ?? null);
  const intensity = computed(() => (on.value && circuit && load.value ? current(load.value.P_W, circuit.U_V) : 0));
  const power = computed(() => (on.value && load.value ? load.value.P_W : 0));
  const contactR = computed(() => (fault ? (loose.value ? fault.R_loose_ohm : fault.R_tight_ohm) : 0));
  const contactP = computed(() => contactPower(contactR.value, intensity.value));
  const formula = computed(() => (circuit
    ? `P = U × I = ${circuit.U_V} V × ${fr(intensity.value, 2)} A = ${fr(power.value, 0)} W`
    : ''));
  const heatFormula = computed(() => (fault
    ? `P = R × I² = ${fr(contactR.value, 3)} Ω × (${fr(intensity.value, 1)} A)² ≈ ${fr(contactP.value, contactP.value < 1 ? 2 : 0)} W`
    : ''));
  const labelsVisible = computed(() => capot.value < 0.6 || eclate.value > 0.5);
  const interieur = computed(() => capot.value < 0.6);

  function log(label: string, id: string, extra: Record<string, unknown> = {}, kind = 'toggle') {
    events.value.unshift({ seq: ++seq, time: new Date().toLocaleTimeString('fr-FR'), label });
    events.value.splice(14);
    window.dispatchEvent(new CustomEvent('crns-sim-event', {
      detail: { id, xapi_verb: ia.xapi?.[kind] ?? 'experienced', component: manifest.id, version: manifest.version, at: new Date().toISOString(), ...extra },
    }));
  }

  // --- Etats visuels (voyant, ampoule...) et actionneur de l'interrupteur ---
  function applyVisuals(state: 'on' | 'off') {
    const a = api.value;
    for (const [node, v] of Object.entries<any>(ia.states?.[state] || {})) {
      if (v.color) a?.setColor(node, hex(v.color));
      if (v.emissive) a?.setEmissive(node, hex(v.emissive), v.intensity ?? 1);
    }
  }

  async function setSwitch(state: boolean, ms = 220) {
    on.value = state;
    applyVisuals(state ? 'on' : 'off');
    kickThermal();
    if (switchAct) {
      const angle = switchAct.states[state ? sw.closed_state : sw.open_state];
      await api.value?.animateRotation(switchAct.node, switchAct.axis, deg(angle), ms);
    }
  }

  async function toggle() {
    if (!api.value || busy.value) return;
    busy.value = true;
    const next = !on.value;
    count.value += 1;
    log(next ? 'Disjoncteur basculé sur « I » : le courant passe, l\'ampoule s\'allume' : 'Disjoncteur basculé sur « O » : le circuit est coupé',
      `${manifest.id}.bascule`, { etat: next ? 'marche' : 'arret' });
    await setSwitch(next);
    busy.value = false;
  }

  // Declenchement (court-circuit) : la manette retombe sur O tres vite.
  async function trip() {
    if (!api.value || busy.value || !ia.trip) return;
    busy.value = true;
    if (!on.value) { await setSwitch(true); await sleep(500); }
    log('Court-circuit : la bobine déclenche, la manette retombe sur « O » en moins de 10 ms', `${manifest.id}.declenchement`, {}, 'trip');
    await setSwitch(false, ia.trip.duration_ms ?? 120);
    count.value += 1;
    busy.value = false;
  }

  // --- Rayons X et vue eclatee ---
  const hiddenOpacity = () => Math.min(capot.value, 1 - eclate.value);
  function applyCapot() {
    const a = api.value;
    a?.setOpacity(capotNodes.filter((n) => !hideOnExplode.includes(n)), capot.value);
    if (hideOnExplode.length) a?.setOpacity(hideOnExplode, hiddenOpacity());
  }
  function setTransparence(percent: number) {
    capot.value = 1 - (percent / 100) * (1 - capotMin);
    applyCapot();
  }
  const transparencePercent = computed(() => Math.round(((1 - capot.value) / (1 - capotMin)) * 100));

  function tween(target: { value: number }, to: number, ms: number) {
    const from = target.value;
    const start = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / ms);
      target.value = from + (to - from) * k;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  async function setInterieur(open: boolean, opacity = capotMin) {
    const a = api.value;
    if (!a) return;
    log(open ? 'Capot rendu transparent : mécanisme, bornes et fils visibles' : 'Capot remis en place', `${manifest.id}.interieur`, { etat: open ? 'visible' : 'masque' });
    const target = open ? opacity : 1;
    if (open) a.focus(ia.focus || [], 900);
    else if (eclate.value <= 0.5) a.resetView(900);
    tween(capot, target, 700);
    await a.animateOpacity(capotNodes, target, 700);
    capot.value = target;
    applyCapot();
  }
  const toggleInterieur = () => setInterieur(!interieur.value);

  async function toggleEclate() {
    const a = api.value;
    if (!a) return;
    const open = eclate.value <= 0.5;
    log(open ? 'Vue éclatée : demi-coquilles écartées, pièces internes séparées' : 'Disjoncteur rassemblé', `${manifest.id}.eclate`, { etat: open ? 'eclate' : 'assemble' });
    const from = eclate.value, target = open ? 1 : 0;
    tween(eclate, target, 900);
    if (hideOnExplode.length) a.animateOpacity(hideOnExplode, open ? 0 : capot.value, 900);
    if (!open) a.resetView(900);
    await a.animateOffsets(ia.explode || {}, from, target, 900, 'explode');
    eclate.value = target;
    if (open || capot.value < 0.6) await a.focus(ia.focus || [], 700);
  }
  function setEclate(t: number) {
    eclate.value = t;
    api.value?.setOffsets(ia.explode || {}, t, 'explode');
    applyCapot();
  }

  // --- Panne de serrage : vis desserree, echauffement progressif de la borne ---
  let raf = 0;
  let last = 0;
  const targetTemp = () => (fault ? steadyTemperature(on.value ? contactP.value : 0, fault.R_th_K_per_W, fault.ambient_C) : 25);
  function applyGlow() {
    if (!fault || pathHighlight.value) return;
    const span = fault.thresholds_C.danger - fault.ambient_C;
    const k = Math.max(0, Math.min(1.4, (temperature.value - fault.ambient_C) / span));
    for (const n of fault.glow || []) api.value?.setEmissive(n, k > 0.02 ? 0xff3b00 : 0x000000, k * 1.6);
  }
  function thermalTick(now: number) {
    // Pas exact quel que soit dt (exponentielle) : pas de plafond serre, sinon l'echauffement
    // ralentit avec la cadence d'affichage (portable modeste, TNI, enregistrement video).
    const dt = Math.min(1, (now - last) / 1000);
    last = now;
    temperature.value = stepTemperature(temperature.value, targetTemp(), dt, fault.tau_s);
    const level = heatLevel(temperature.value, fault.thresholds_C);
    if (level !== heat.value) {
      if (level === 'chaud') log(`La borne chauffe : ${fr(temperature.value, 0)} °C`, `${manifest.id}.echauffement`, { temperature_C: Math.round(temperature.value) }, 'fault');
      if (level === 'danger') log(`Danger : ${fr(temperature.value, 0)} °C, l'isolant du fil se dégrade (risque d'incendie)`, `${manifest.id}.danger`, { temperature_C: Math.round(temperature.value) }, 'danger');
      heat.value = level;
    }
    applyGlow();
    if (Math.abs(temperature.value - targetTemp()) > 0.2) raf = requestAnimationFrame(thermalTick);
    else { temperature.value = targetTemp(); raf = 0; applyGlow(); }
  }
  function kickThermal() {
    if (!fault || raf) return;
    last = performance.now();
    raf = requestAnimationFrame(thermalTick);
  }
  async function setLoose(value: boolean) {
    if (!fault || !faultAct) return;
    loose.value = value;
    log(value ? `${fault.label} desserrée : la cage ne plaque plus le fil` : `${fault.label} resserrée`, `${manifest.id}.serrage`, { etat: value ? 'desserree' : 'serree' }, 'fault');
    const amount = faultAct.states[value ? fault.loose_state : fault.tight_state];
    await api.value?.animateOffsets({ [faultAct.node]: axisVec(faultAct.axis, 1) }, value ? 0 : faultAct.states[fault.loose_state], amount, 400, 'fault');
    kickThermal();
  }
  function setLoad(id: string) {
    loadId.value = id;
    const l = load.value;
    if (l) log(`Charge : ${l.label}`, `${manifest.id}.charge`, { P_W: l.P_W });
    kickThermal();
  }

  // --- Cockpit QA : chemin conducteur en surbrillance ---
  const pathNodes = computed<string[]>(() => {
    const el = manifest.electrical || {};
    const fromPath = (el.path || []).map((id: string) => el.conductors?.[id]).filter(Boolean);
    const wires = (el.connections || []).flatMap((c: any) => [c.wire, c.cable]).filter(Boolean);
    return [...new Set<string>([...fromPath, ...wires])];
  });
  function setPathHighlight(value: boolean) {
    pathHighlight.value = value;
    for (const n of pathNodes.value) api.value?.setEmissive(n, value ? PATH_GLOW : 0x000000, value ? 1.2 : 0);
    if (!value) applyGlow();
  }

  function onReady(viewerApi: CrnsViewerApi) {
    api.value = viewerApi;
    ready.value = true;
    setSwitch(switchAct?.initial === sw?.closed_state, 1);
  }
  function onPick(node: string) {
    if (ia.pickable?.[node] === sw?.actuator) toggle();
  }

  async function reset() {
    setTransparence(0);
    setEclate(0);
    if (loose.value) await setLoose(false);
    if (pathHighlight.value) setPathHighlight(false);
    loadId.value = circuit?.loads?.[0]?.id ?? '';
    await setSwitch(false);
    // Reinitialiser = etat de depart, pas un refroidissement en cours.
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    temperature.value = fault?.ambient_C ?? 25;
    heat.value = 'normal';
    applyGlow();
    count.value = 0;
    events.value = [];
    api.value?.resetView(600);
  }

  function dispose() {
    if (raf) cancelAnimationFrame(raf);
  }

  return {
    manifest, texts, circuit, fault, api, ready, on, busy, count, capot, eclate, transparencePercent, interieur,
    labelsVisible, loadId, load, loose, temperature, heat, intensity, power, formula, contactP, heatFormula,
    pathHighlight, pathNodes, events,
    onReady, onPick, toggle, trip, setTransparence, setInterieur, toggleInterieur, toggleEclate, setEclate,
    setLoose, setLoad, setPathHighlight, reset, dispose,
  };
}

export type CrnsTp = ReturnType<typeof useCrnsTp>;
