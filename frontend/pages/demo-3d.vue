<template>
  <div class="min-h-screen lg:h-screen flex flex-col lg:flex-row bg-slate-900 text-slate-100">
    <div class="relative flex-1 min-h-[60vh] lg:min-h-0">
      <CRNSSimulationViewer
        src="/demo-3d/disjoncteur.glb"
        :pickable="['Levier']"
        :frame="['Corps', 'Ampoule']"
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

function onPick(name: string) {
  if (name === 'Levier') toggle();
}

function onReady(viewerApi: CrnsViewerApi) {
  api.value = viewerApi;
  ready.value = true;
  apply(false, false);
}

async function reset() {
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
