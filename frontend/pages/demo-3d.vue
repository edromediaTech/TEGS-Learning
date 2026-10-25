<template>
  <div class="min-h-screen lg:h-screen flex flex-col lg:flex-row bg-slate-900 text-slate-100">
    <div class="relative flex-1 min-h-[60vh] lg:min-h-0">
      <CRNSSimulationViewer
        src="/demo-3d/disjoncteur.glb"
        :pickable="['Levier']"
        :frame="['Coque_gauche', 'Coque_droite', 'Ampoule']"
        :labels="LABELS"
        :labels-visible="capot < 0.6 || eclate > 0.5"
        background="#dfe4ea"
        @ready="onReady"
        @pick="onPick"
      />
      <p v-if="ready" class="absolute left-4 bottom-4 rounded-lg bg-white/85 px-3 py-2 text-sm text-slate-800 shadow">
        Touchez la manette du disjoncteur pour la basculer. Faites glisser pour tourner autour du tableau.
      </p>
    </div>

    <aside class="w-full lg:w-[380px] shrink-0 flex flex-col gap-5 p-6 border-t lg:border-t-0 lg:border-l border-slate-700">
      <div>
        <p class="text-xs uppercase tracking-wider text-slate-400">Travaux pratiques virtuels</p>
        <h1 class="text-2xl font-bold mt-1">Le disjoncteur</h1>
        <p class="text-sm text-slate-300 mt-2">
          Le disjoncteur protège le circuit : sur « I » il laisse passer le courant, sur « O » il l'interrompt.
        </p>
      </div>

      <div data-testid="etat" class="rounded-xl p-4 transition-colors"
           :class="on ? 'bg-amber-400 text-slate-900' : 'bg-slate-700 text-slate-100'">
        <p class="text-sm font-medium opacity-80">État du circuit</p>
        <p class="text-xl font-bold">{{ on ? 'Fermé : l\'ampoule est allumée' : 'Ouvert : l\'ampoule est éteinte' }}</p>
        <p class="text-sm mt-1">Disjoncteur sur {{ on ? '« I » (marche)' : '« O » (arrêt)' }} · {{ count }} manœuvre(s)</p>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button class="col-span-2 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-3 font-semibold disabled:opacity-40"
                :disabled="!ready || busy" data-testid="basculer" @click="toggle">
          Basculer le disjoncteur
        </button>
        <button class="rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm disabled:opacity-40" :disabled="!ready" @click="reset">
          Réinitialiser
        </button>
        <button class="rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm disabled:opacity-40" :disabled="!ready" @click="api?.resetView()">
          Recentrer la vue
        </button>
        <button class="col-span-2 rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm" @click="fullscreen">
          Plein écran
        </button>
      </div>

      <div class="rounded-xl border border-slate-700 p-4">
        <button class="w-full rounded-lg px-4 py-3 font-semibold disabled:opacity-40"
                :class="interieur ? 'bg-amber-400 text-slate-900 hover:bg-amber-300' : 'bg-slate-700 hover:bg-slate-600'"
                :disabled="!ready" data-testid="interieur" @click="toggleInterieur">
          {{ interieur ? 'Remettre le capot' : 'Voir l\'intérieur' }}
        </button>
        <label class="block text-sm text-slate-300 mt-3">
          Transparence du capot : {{ Math.round((1 - capot) / (1 - CAPOT_MIN) * 100) }} %
          <input type="range" min="0" max="100" class="w-full mt-1 accent-amber-400" :disabled="!ready"
                 :value="Math.round((1 - capot) / (1 - CAPOT_MIN) * 100)" data-testid="transparence"
                 @input="setTransparence(+($event.target as HTMLInputElement).value)">
        </label>
        <button class="w-full mt-4 rounded-lg px-4 py-3 font-semibold disabled:opacity-40"
                :class="eclate > 0.5 ? 'bg-amber-400 text-slate-900 hover:bg-amber-300' : 'bg-slate-700 hover:bg-slate-600'"
                :disabled="!ready" data-testid="eclate" @click="toggleEclate">
          {{ eclate > 0.5 ? 'Rassembler le disjoncteur' : 'Vue éclatée' }}
        </button>
        <label class="block text-sm text-slate-300 mt-3">
          Écartement des pièces : {{ Math.round(eclate * 100) }} %
          <input type="range" min="0" max="100" class="w-full mt-1 accent-amber-400" :disabled="!ready"
                 :value="Math.round(eclate * 100)" data-testid="ecartement"
                 @input="setEclate(+($event.target as HTMLInputElement).value / 100)">
        </label>
        <p v-if="capot < 0.6 || eclate > 0.5" class="text-sm text-slate-300 mt-2">
          À chaque borne, le fil de cuivre dénudé entre dans la cage de serrage ; la vis, serrée depuis la
          face avant, plaque la cage contre le fil. Un serrage insuffisant fait chauffer la connexion.
        </p>
      </div>

      <div class="flex-1 min-h-0 flex flex-col">
        <p class="text-sm font-semibold text-slate-300 mb-2">Journal des actions</p>
        <ol data-testid="journal" class="flex-1 overflow-y-auto space-y-1 text-sm">
          <li v-if="!events.length" class="text-slate-500">Aucune action pour l'instant.</li>
          <li v-for="ev in events" :key="ev.seq" class="rounded bg-slate-800 px-3 py-2">
            <span class="text-slate-400 tabular-nums">{{ ev.time }}</span> · {{ ev.label }}
          </li>
        </ol>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
// Demonstrateur du jalon C1 (cdc_extention.md), projete sur le TNI le 6/11 : manipulation
// d'un disjoncteur (levier qui bascule, evenement detecte, retour visuel sur le voyant et
// l'ampoule). Page isolee, sans connexion ni trace enregistree.
import type { CrnsViewerApi } from '~/composables/useThreeVendor';

definePageMeta({ layout: false });
useHead({ title: 'Démonstrateur 3D · Le disjoncteur' });

const LEVER_OFF = 35 * Math.PI / 180; // bout de la manette vers le bas (« O »), position du modele
const LEVER_ON = -35 * Math.PI / 180; // bout vers le haut (« I »)
const VOYANT_OFF = 0x1fa64a; // vert : circuit coupe
const VOYANT_ON = 0xd62f2f; // rouge : sous tension
const BULB_ON = 0xffb02e;

const api = shallowRef<CrnsViewerApi | null>(null);
const ready = ref(false);
const on = ref(false);
const busy = ref(false);
const count = ref(0);
// Vue interieure (« rayons X ») : opacite du boitier (demi-coquilles, nez, fente), 1 = opaque.
const CAPOT = ['Coque_gauche', 'Coque_droite', 'Nez_gauche', 'Nez_droite', 'Fente'];
const CAPOT_MIN = 0.12;
const capot = ref(1);
const interieur = computed(() => capot.value < 0.6);
// Vue eclatee : demi-coquilles ecartees, pieces internes reparties entre elles, vis et manette
// sorties vers l'avant ; cages et fils restent en place (le cablage reste lisible).
// Decalages en metres, repere glTF : x vers la droite, y vers le haut, z vers l'observateur.
const ECLATE: Record<string, [number, number, number]> = {
  Coque_gauche: [-0.045, 0, 0.015], Nez_gauche: [-0.045, 0, 0.015],
  Voyant: [-0.054, 0, 0.015], Marquage_C16: [-0.054, 0, 0.015], Marquage_230V: [-0.054, 0, 0.015],
  // Demi-coquille droite aussi avancee : sinon elle traverse le cable de phase qui longe la platine.
  Coque_droite: [0.080, 0, 0.035], Nez_droite: [0.080, 0, 0.035], Marquage_I: [0.080, 0, 0.035], Marquage_O: [0.080, 0, 0.035],
  // Pieces internes reparties dans l'espace libre entre les coquilles (visibles de face).
  Bobine: [0.010, 0, 0.006], Liaisons_mecanisme: [0.014, 0, 0.006], Contacts: [0.020, 0, 0.010],
  Chambre_coupure: [0.028, 0, 0.014], Bilame: [0.034, 0, 0.022],
  Vis_haut: [0, 0, 0.035], Vis_bas: [0, 0, 0.035], Levier: [0, 0, 0.03],
};
const eclate = ref(0);
// La fente du nez n'est qu'une ouverture du boitier : elle s'efface en vue eclatee.
const fenteOpacity = () => Math.min(capot.value, 1 - eclate.value);
// Etiquettes : decalages (px) choisis pour la vue de face, a droite du disjoncteur sauf exceptions.
const LABELS = [
  { node: 'Fil_cuivre_haut', text: 'Fil de cuivre dénudé', dx: -150, dy: -120 },
  { node: 'Cage_haut', text: 'Cage de serrage', dx: 190, dy: -80 },
  { node: 'Vis_haut', text: 'Vis de serrage', dx: -200, dy: 10 },
  { node: 'Contacts', text: 'Contacts', dx: 200, dy: 25 },
  { node: 'Chambre_coupure', text: 'Chambre de coupure', dx: 190, dy: -45 },
  { node: 'Bobine', text: 'Bobine (court-circuit)', dx: -180, dy: 40 },
  { node: 'Bilame', text: 'Bilame (surcharge)', dx: 200, dy: 80 },
  { node: 'Cage_bas', text: 'Borne inférieure', dx: 190, dy: 150 },
];
const events = ref<{ seq: number; time: string; label: string }[]>([]);
let seq = 0;

function log(label: string, detail: Record<string, unknown>) {
  events.value.unshift({ seq: ++seq, time: new Date().toLocaleTimeString('fr-FR'), label });
  events.value.splice(12);
  // Evenement de simulation, pret pour une future trace (non enregistre dans ce demonstrateur).
  window.dispatchEvent(new CustomEvent('crns-sim-event', { detail: { ...detail, at: new Date().toISOString() } }));
}

async function apply(state: boolean, animate = true) {
  const a = api.value;
  if (!a) return;
  on.value = state;
  a.setColor('Voyant', state ? VOYANT_ON : VOYANT_OFF);
  a.setEmissive('Voyant', state ? VOYANT_ON : VOYANT_OFF, 0.6);
  a.setEmissive('Ampoule', state ? BULB_ON : 0x000000, state ? 3.5 : 0);
  await a.animateRotation('Levier', 'x', state ? LEVER_ON : LEVER_OFF, animate ? 220 : 1);
}

async function toggle() {
  if (!api.value || busy.value) return;
  busy.value = true;
  const next = !on.value;
  count.value += 1;
  log(next ? 'Disjoncteur basculé sur « I » : le courant passe, l\'ampoule s\'allume'
    : 'Disjoncteur basculé sur « O » : le circuit est coupé',
  { id: 'disjoncteur.bascule', etat: next ? 'marche' : 'arret' });
  await apply(next);
  busy.value = false;
}

async function toggleInterieur() {
  const a = api.value;
  if (!a) return;
  const open = !interieur.value;
  log(open ? 'Capot rendu transparent : bornes, vis et fil dénudé visibles' : 'Capot remis en place',
    { id: 'disjoncteur.interieur', etat: open ? 'visible' : 'masque' });
  const target = open ? CAPOT_MIN : 1;
  const from = capot.value;
  const start = performance.now();
  // Le curseur suit l'animation du capot.
  const step = (now: number) => {
    const k = Math.min(1, (now - start) / 700);
    capot.value = from + (target - from) * k;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  await a.animateOpacity(CAPOT, target, 700);
  capot.value = target;
  a.setOpacity(['Fente'], fenteOpacity()); // reste effacee si la vue est eclatee
}

async function toggleEclate() {
  const a = api.value;
  if (!a) return;
  const open = eclate.value <= 0.5;
  log(open ? 'Vue éclatée : demi-coquilles écartées, pièces internes séparées' : 'Disjoncteur rassemblé',
    { id: 'disjoncteur.eclate', etat: open ? 'eclate' : 'assemble' });
  const from = eclate.value, target = open ? 1 : 0;
  const start = performance.now();
  const step = (now: number) => {
    const k = Math.min(1, (now - start) / 900);
    eclate.value = from + (target - from) * k;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  a.animateOpacity(['Fente'], open ? 0 : capot.value, 900);
  await a.animateOffsets(ECLATE, from, target, 900);
  eclate.value = target;
}

function setEclate(t: number) {
  eclate.value = t;
  api.value?.setOffsets(ECLATE, t);
  api.value?.setOpacity(['Fente'], fenteOpacity());
}

function setTransparence(percent: number) {
  capot.value = 1 - (percent / 100) * (1 - CAPOT_MIN);
  api.value?.setOpacity(CAPOT, capot.value);
  api.value?.setOpacity(['Fente'], fenteOpacity());
}

function onPick(name: string) {
  if (name === 'Levier') toggle();
}

function onReady(viewerApi: CrnsViewerApi) {
  api.value = viewerApi;
  ready.value = true;
  apply(false, false);
}

async function reset() {
  setTransparence(0);
  setEclate(0);
  await apply(false);
  count.value = 0;
  events.value = [];
  api.value?.resetView();
}

function fullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}
</script>
