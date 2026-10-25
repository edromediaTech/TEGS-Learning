<template>
  <div class="min-h-screen lg:h-screen flex flex-col lg:flex-row bg-slate-900 text-slate-100">
    <div class="relative flex-1 min-h-[60vh] lg:min-h-0">
      <div v-if="loadError" class="absolute inset-0 flex items-center justify-center text-red-400 p-6">{{ loadError }}</div>
      <CRNSSimulationViewer
        v-if="tp && modelSrc"
        :src="modelSrc"
        :pickable="Object.keys(m.interaction?.pickable || {})"
        :frame="m.interaction?.frame || []"
        :labels="m.interaction?.labels || []"
        :labels-visible="tp.labelsVisible.value"
        background="#dfe4ea"
        @ready="tp.onReady"
        @pick="tp.onPick"
      />
      <p v-if="tp?.ready.value && tp.texts.hint" class="absolute left-4 bottom-4 rounded-lg bg-white/85 px-3 py-2 text-sm text-slate-800 shadow">
        {{ tp.texts.hint }}
      </p>
    </div>

    <aside v-if="tp" class="w-full lg:w-[400px] shrink-0 flex flex-col gap-4 p-5 border-t lg:border-t-0 lg:border-l border-slate-700 lg:overflow-y-auto">
      <div>
        <p class="text-xs uppercase tracking-wider text-slate-400">{{ mode === 'qa' ? 'Revue qualité' : tp.texts.kicker }}</p>
        <h1 class="text-2xl font-bold mt-1">{{ tp.texts.title || m.title }}</h1>
        <p v-if="tp.texts.intro" class="text-sm text-slate-300 mt-2">{{ tp.texts.intro }}</p>
      </div>

      <slot name="panel-top" :tp="tp" />

      <div data-testid="etat" class="rounded-xl p-4 transition-colors" :class="tp.on.value ? 'bg-amber-400 text-slate-900' : 'bg-slate-700 text-slate-100'">
        <p class="text-sm font-medium opacity-80">État du circuit</p>
        <p class="text-xl font-bold">{{ tp.on.value ? tp.texts.on : tp.texts.off }}</p>
        <p class="text-sm mt-1">Disjoncteur sur {{ tp.on.value ? tp.texts.on_state : tp.texts.off_state }} · {{ tp.count.value }} manœuvre(s)</p>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button class="col-span-2 rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-3 font-semibold disabled:opacity-40"
                :disabled="!tp.ready.value || tp.busy.value" data-testid="basculer" @click="tp.toggle">
          Basculer le disjoncteur
        </button>
        <button v-if="m.interaction?.trip" class="col-span-2 rounded-lg bg-red-700 hover:bg-red-600 px-4 py-2 text-sm font-semibold disabled:opacity-40"
                :disabled="!tp.ready.value || tp.busy.value" data-testid="declencher" @click="tp.trip">
          Simuler un court-circuit (déclenchement)
        </button>
        <button class="rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm disabled:opacity-40" :disabled="!tp.ready.value" @click="tp.reset">Réinitialiser</button>
        <button class="rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm disabled:opacity-40" :disabled="!tp.ready.value" @click="tp.api.value?.resetView(600)">Recentrer la vue</button>
        <button class="col-span-2 rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-2 text-sm" @click="fullscreen">Plein écran</button>
      </div>

      <!-- Mesures : P = U x I en direct -->
      <div v-if="tp.circuit" class="rounded-xl border border-slate-700 p-4" data-testid="mesures">
        <p class="text-sm font-semibold text-slate-300">Mesures</p>
        <div class="grid grid-cols-3 gap-2 mt-2 text-center">
          <div class="rounded-lg bg-slate-800 py-2"><p class="text-xs text-slate-400">Tension U</p><p class="text-lg font-bold tabular-nums">{{ tp.on.value ? tp.circuit.U_V : 0 }} V</p></div>
          <div class="rounded-lg bg-slate-800 py-2"><p class="text-xs text-slate-400">Intensité I</p><p class="text-lg font-bold tabular-nums">{{ fr(tp.intensity.value, 2) }} A</p></div>
          <div class="rounded-lg bg-slate-800 py-2"><p class="text-xs text-slate-400">Puissance P</p><p class="text-lg font-bold tabular-nums">{{ fr(tp.power.value, 0) }} W</p></div>
        </div>
        <p class="mt-2 text-sm font-mono text-amber-300" data-testid="formule">{{ tp.formula.value }}</p>
        <label class="block text-sm text-slate-300 mt-3">Appareils branchés sur le circuit
          <select class="mt-1 w-full rounded-lg bg-slate-800 border border-slate-600 px-2 py-2" :value="tp.loadId.value" data-testid="charge"
                  @change="tp.setLoad(($event.target as HTMLSelectElement).value)">
            <option v-for="l in tp.circuit.loads" :key="l.id" :value="l.id">{{ l.label }}</option>
          </select>
        </label>
        <p v-if="tp.on.value && tp.intensity.value < tp.circuit.calibre_A" class="text-xs text-slate-400 mt-2">
          {{ fr(tp.intensity.value, 1) }} A, sous le calibre de {{ tp.circuit.calibre_A }} A : le disjoncteur laisse passer.
        </p>
      </div>

      <!-- Panne de serrage : la cause rendue visible derriere la consigne « bien serrer » -->
      <div v-if="tp.fault" class="rounded-xl border p-4 transition-colors" :class="heatClass" data-testid="serrage">
        <p class="text-sm font-semibold">Serrage des bornes</p>
        <button class="w-full mt-2 rounded-lg px-4 py-2 font-semibold disabled:opacity-40"
                :class="tp.loose.value ? 'bg-amber-400 text-slate-900' : 'bg-slate-700 hover:bg-slate-600'"
                :disabled="!tp.ready.value" data-testid="vis" @click="tp.setLoose(!tp.loose.value)">
          {{ tp.loose.value ? `Resserrer la ${tp.fault.label.toLowerCase()}` : `Desserrer la ${tp.fault.label.toLowerCase()}` }}
        </button>
        <div class="flex items-baseline justify-between mt-3">
          <span class="text-sm">Température de la borne</span>
          <span class="text-2xl font-bold tabular-nums" data-testid="temperature">{{ fr(tp.temperature.value, 0) }} °C</span>
        </div>
        <div class="h-2 rounded bg-slate-700 mt-1 overflow-hidden">
          <div class="h-full transition-all" :class="tp.heat.value === 'danger' ? 'bg-red-500' : tp.heat.value === 'chaud' ? 'bg-orange-400' : 'bg-emerald-500'"
               :style="{ width: `${Math.min(100, ((tp.temperature.value - tp.fault.ambient_C) / (100 - tp.fault.ambient_C)) * 100)}%` }" />
        </div>
        <p class="text-sm font-mono mt-2">{{ tp.heatFormula.value }}</p>
        <p class="text-xs mt-2 opacity-90">
          <template v-if="tp.heat.value === 'danger'">Le disjoncteur ne déclenche pas : le courant reste sous son calibre. Seul un bon serrage évite cet échauffement.</template>
          <template v-else-if="tp.loose.value">Vis desserrée : la résistance du contact augmente. Essayez avec plus d'appareils branchés.</template>
          <template v-else>Vis serrée : le contact est franc, il ne chauffe pas.</template>
        </p>
      </div>

      <!-- Voir l'interieur / vue eclatee -->
      <div class="rounded-xl border border-slate-700 p-4">
        <button class="w-full rounded-lg px-4 py-3 font-semibold disabled:opacity-40"
                :class="tp.interieur.value ? 'bg-amber-400 text-slate-900 hover:bg-amber-300' : 'bg-slate-700 hover:bg-slate-600'"
                :disabled="!tp.ready.value" data-testid="interieur" @click="tp.toggleInterieur">
          {{ tp.interieur.value ? 'Remettre le capot' : 'Voir l\'intérieur' }}
        </button>
        <label class="block text-sm text-slate-300 mt-3">
          Transparence du capot : {{ tp.transparencePercent.value }} %
          <input type="range" min="0" max="100" class="w-full mt-1 accent-amber-400" :disabled="!tp.ready.value"
                 :value="tp.transparencePercent.value" data-testid="transparence"
                 @input="tp.setTransparence(+($event.target as HTMLInputElement).value)">
        </label>
        <button class="w-full mt-4 rounded-lg px-4 py-3 font-semibold disabled:opacity-40"
                :class="tp.eclate.value > 0.5 ? 'bg-amber-400 text-slate-900 hover:bg-amber-300' : 'bg-slate-700 hover:bg-slate-600'"
                :disabled="!tp.ready.value" data-testid="eclate" @click="tp.toggleEclate">
          {{ tp.eclate.value > 0.5 ? 'Rassembler le disjoncteur' : 'Vue éclatée' }}
        </button>
        <label class="block text-sm text-slate-300 mt-3">
          Écartement des pièces : {{ Math.round(tp.eclate.value * 100) }} %
          <input type="range" min="0" max="100" class="w-full mt-1 accent-amber-400" :disabled="!tp.ready.value"
                 :value="Math.round(tp.eclate.value * 100)" data-testid="ecartement"
                 @input="tp.setEclate(+($event.target as HTMLInputElement).value / 100)">
        </label>
        <div v-if="tp.labelsVisible.value" class="text-sm text-slate-300 mt-2 space-y-2">
          <p v-for="(t, i) in tp.texts.inside || []" :key="i">{{ t }}</p>
        </div>
      </div>

      <slot name="panel-bottom" :tp="tp" />

      <div class="min-h-[8rem] flex flex-col">
        <p class="text-sm font-semibold text-slate-300 mb-2">Journal des actions</p>
        <ol data-testid="journal" class="flex-1 overflow-y-auto space-y-1 text-sm">
          <li v-if="!tp.events.value.length" class="text-slate-500">Aucune action pour l'instant.</li>
          <li v-for="ev in tp.events.value" :key="ev.seq" class="rounded bg-slate-800 px-3 py-2">
            <span class="text-slate-400 tabular-nums">{{ ev.time }}</span> · {{ ev.label }}
          </li>
        </ol>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
// Lecteur de TP 3D CRNS reutilisable : CRNSSimulationViewer + panneau, pilotes par le manifeste
// du composant (crns-component/1). Le meme composant sert le demonstrateur (/demo-3d), le
// cockpit de revue QA (mode="qa", slots panel-top / panel-bottom) et, a l'integration dans
// master, un bloc de module TEGS (passer manifestUrl).
import { useCrnsTp, type CrnsTp } from '~/composables/useCrnsTp';
import { fr } from '~/utils/crnsCircuit';

const props = withDefaults(defineProps<{
  /** URL du manifeste ; le modele est cherche a cote (manifest.model.file). */
  manifestUrl?: string;
  /** Ou manifeste deja charge (cockpit : recupere par l'API avec authentification). */
  manifest?: any;
  /** URL du modele si elle ne se deduit pas du manifeste (ex. URL blob du cockpit). */
  modelUrl?: string;
  mode?: 'demo' | 'qa';
}>(), { mode: 'demo' });

const emit = defineEmits<{ (e: 'ready', tp: CrnsTp): void }>();

const m = shallowRef<any>(props.manifest ?? null);
const tp = shallowRef<CrnsTp | null>(null);
const loadError = ref('');
const modelSrc = computed(() => {
  if (props.modelUrl) return props.modelUrl;
  if (!props.manifestUrl || !m.value) return '';
  return props.manifestUrl.replace(/[^/]*$/, m.value.model?.file || 'component.glb');
});

const heatClass = computed(() => {
  const h = tp.value?.heat.value;
  return h === 'danger' ? 'border-red-500 bg-red-950/60' : h === 'chaud' ? 'border-orange-400 bg-orange-950/40' : 'border-slate-700';
});

function init(manifest: any) {
  m.value = manifest;
  tp.value = useCrnsTp(manifest);
}
watch(() => tp.value?.ready.value, (r) => { if (r) emit('ready', tp.value!); });

onMounted(async () => {
  try {
    if (props.manifest) init(props.manifest);
    else if (props.manifestUrl) init(await $fetch(props.manifestUrl));
    else loadError.value = 'Aucun composant indiqué.';
  } catch (e: any) {
    loadError.value = `Composant indisponible : ${e?.message || e}`;
  }
});

onBeforeUnmount(() => tp.value?.dispose());

function fullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.();
}

defineExpose({ tp });
</script>
