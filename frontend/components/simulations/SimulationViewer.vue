<template>
  <div class="flex flex-col h-full">
    <ClientOnly>
      <div class="relative w-full flex-1 min-h-[400px]">
        <model-viewer
          ref="viewerEl"
          :src="assetUrl"
          :alt="title"
          camera-controls
          auto-rotate
          auto-rotate-delay="3000"
          rotation-per-second="20deg"
          shadow-intensity="0.7"
          shadow-softness="0.85"
          exposure="1.15"
          tone-mapping="aces"
          environment-image="neutral"
          class="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100"
          @load="onModelLoad"
          @progress="onModelProgress"
        ></model-viewer>

        <!-- Loading indicator overlay -->
        <div
          v-if="loadProgress < 1"
          class="absolute inset-0 flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm pointer-events-none"
        >
          <div class="text-sm font-bold text-gray-700 mb-2">
            Chargement du modèle 3D...
          </div>
          <div class="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-200"
              :style="{ width: `${Math.round(loadProgress * 100)}%` }"
            ></div>
          </div>
          <div class="text-xs text-gray-500 mt-2 font-mono">
            {{ Math.round(loadProgress * 100) }}%
            <span v-if="loadingFromCache" class="ml-2 text-emerald-600">(cache local)</span>
            <span v-else-if="isHd" class="ml-2 text-amber-600">(HD ~70 Ko)</span>
          </div>
        </div>

        <!-- Toggle HD/Lite -->
        <button
          v-if="hasVariant"
          @click="toggleQuality"
          class="absolute top-2 right-2 z-10 px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-gray-300 rounded-md text-xs font-bold shadow hover:bg-white"
          :title="isHd ? 'Basculer en mode standard (chargement plus rapide)' : 'Basculer en mode HD (textures premium, chargement plus long)'"
        >
          {{ isHd ? '↓ Mode standard' : '↑ Mode HD' }}
        </button>
      </div>
      <template #fallback>
        <div class="w-full flex-1 min-h-[400px] flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
          Initialisation du viewer 3D...
        </div>
      </template>
    </ClientOnly>

    <div v-if="events.length" class="border-t border-gray-200 bg-white p-4">
      <div class="flex items-center justify-between mb-2">
        <p class="text-xs font-bold text-gray-500 uppercase">Interactions</p>
        <button
          v-if="stateAttached"
          @click="resetVisualState"
          class="px-2 py-1 text-[10px] font-semibold rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50"
          title="Reinitialiser l'etat visuel des objets"
        >
          Reinitialiser
        </button>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="ev in events"
          :key="ev.id"
          @click="triggerEvent(ev)"
          :disabled="busy === ev.id"
          class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:border-primary-400 hover:text-primary-700 hover:bg-primary-50 transition-colors disabled:opacity-50"
          :title="ev.xapi_description || ev.id"
        >
          {{ ev.id }}
          <span class="ml-1 text-[10px] text-gray-400">{{ ev.xapi_verb || 'experienced' }}</span>
        </button>
      </div>
      <p v-if="lastStatus" class="text-[11px] text-gray-500 mt-2">
        Dernier statement : <code>{{ lastStatus }}</code>
      </p>
    </div>

    <SimulationsComponentLibraryPanel
      v-if="hasInspectableAssets && !hasAssembly"
      :assets="assetsForLibrary"
      :model-viewer-el="viewerEl"
      @isolate="onLibraryIsolate"
      @reset="onLibraryReset"
    />

    <SimulationsAssemblyPanel
      v-if="hasAssembly"
      :assembly="assemblyDef!"
      :assets="assetsForDiagnostic"
      @init="onAssemblyInit"
      @place="onAssemblyPlace"
      @finish="onAssemblyFinish"
      @retry="onAssemblyRetry"
    />

    <SimulationsMultimeterPanel
      v-if="hasTestPoints && !hasAssembly"
      :assets="assetsWithTestPoints"
      :current-fault="stateController.currentFault.value"
      @measure="onMultimeterMeasure"
    />

    <SimulationsDiagnosticPanel
      v-if="hasFaultStates && !hasAssembly"
      :assets="assetsForDiagnostic"
      :current-fault="stateController.currentFault.value"
      :label-of="labelOf"
      @submit="onDiagnosticSubmit"
      @retry="onDiagnosticRetry"
    />

    <div v-if="tutorEnabled" class="border-t border-gray-200 bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4">
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white text-lg font-bold flex-shrink-0 shadow">
          T
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-xs font-bold text-indigo-700 uppercase mb-1">Tuteur IA</p>
          <p v-if="tutorLoading" class="text-sm text-gray-500 italic">
            <span class="inline-block animate-pulse">Le tuteur reflechit...</span>
          </p>
          <p v-else-if="tutorError" class="text-sm text-red-600">
            {{ tutorError }}
          </p>
          <p v-else-if="tutorText" class="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
            {{ tutorText }}
          </p>
          <p v-else class="text-sm text-gray-400 italic">
            Clique sur une interaction ci-dessus pour que le tuteur t'explique.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { XapiEventConfig } from '~/composables/useXapiTracker';

interface AssetCfg {
  id: string;
  label?: string;
  fault_states?: Record<string, any>;
  test_points?: { name: string; voltage_nominal: number; fault_value?: number }[];
}

interface AssemblyDef {
  hide_at_start?: string[];
  steps: { order: number; asset_id: string; label: string; rationale?: string; tools?: string[] }[];
}

const props = withDefaults(
  defineProps<{
    simulationId: string;
    title: string;
    assetUrl: string;
    config?: {
      events?: (XapiEventConfig & Record<string, any>)[];
      metadata?: any;
      assets?: AssetCfg[];
      assembly?: AssemblyDef;
    } | null;
    activityIdBase?: string;
    tutorEnabled?: boolean;
  }>(),
  { tutorEnabled: true }
);

useHead({
  script: [
    {
      src: 'https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js',
      type: 'module',
      defer: true,
      key: 'model-viewer-script',
    },
  ],
});

const activityBase = computed(
  () => props.activityIdBase || 'https://crns.tegs-learning.edu.ht/sim'
);
const activityId = computed(() => `${activityBase.value}/${props.simulationId}`);

const { apiFetch } = useApi();
const tracker = ref<ReturnType<typeof useXapiTracker> | null>(null);
const initialized = ref(false);
const busy = ref<string | null>(null);
const lastStatus = ref<string | null>(null);

const tutorLoading = ref(false);
const tutorError = ref<string | null>(null);
const tutorText = ref<string | null>(null);

const viewerEl = ref<any>(null);
const stateController = useSimulationStateController();
const stateAttached = ref(false);
const classroomSocket = useCrnsClassroomSocket();

const events = computed(() => props.config?.events ?? []);
const assetsList = computed<AssetCfg[]>(() => props.config?.assets ?? []);
const hasFaultStates = computed(() =>
  assetsList.value.some(
    (a) => a.fault_states && Object.keys(a.fault_states).length > 0,
  ),
);
const assetsForDiagnostic = computed(() =>
  assetsList.value.map((a) => ({
    id: a.id,
    label: a.label || a.id,
    hasFaultStates: !!(a.fault_states && Object.keys(a.fault_states).length > 0),
  })),
);

// Multimetre (Phase 2 toolbox)
const hasTestPoints = computed(() =>
  assetsList.value.some((a) => a.test_points && a.test_points.length > 0),
);
const assetsWithTestPoints = computed(() =>
  assetsList.value
    .filter((a) => a.test_points && a.test_points.length > 0)
    .map((a) => ({
      id: a.id,
      label: a.label || a.id,
      test_points: a.test_points!,
    })),
);

async function onMultimeterMeasure(payload: { redKey: string; blackKey: string; volts: number; degraded: boolean }) {
  if (!tracker.value) return;
  const description = `Mesure multimètre : ${payload.redKey} − ${payload.blackKey} = ${payload.volts.toFixed(2)}V${payload.degraded ? ' (anomalie détectée)' : ''}`;
  const synthetic = {
    id: 'evt_multimeter_measure',
    target: payload.redKey.split('::')[0] || 'multimeter',
    xapi_verb: 'experienced',
    xapi_description: description,
    runtime: {
      probe_red: payload.redKey,
      probe_black: payload.blackKey,
      volts: payload.volts,
      degraded: payload.degraded,
    },
  } as any;
  await tracker.value.sendEvent(synthetic);
  // Pas de notify classroom -- trop verbeux, mesure repetee. Le diagnostic submit suffit.
}
function labelOf(id: string): string {
  const a = assetsList.value.find((x) => x.id === id);
  return a?.label || id;
}

async function onDiagnosticSubmit(payload: {
  suspectId: string;
  suspectLabel: string;
  reportText: string;
  correct: boolean;
  score: import('~/composables/useDiagnosticScoring').DiagnosticScore;
}) {
  if (!tracker.value) return;
  const verb = payload.correct ? 'passed' : 'failed';
  const description = payload.correct
    ? `Diagnostic correct : ${payload.suspectLabel}`
    : `Mauvais diagnostic : a repondu ${payload.suspectLabel}`;
  const synthetic = {
    id: 'evt_diagnostic_submit',
    target: payload.suspectId,
    xapi_verb: verb,
    xapi_description: description,
    runtime: {
      report_text: payload.reportText.slice(0, 1000),
      suspect_id: payload.suspectId,
      score_raw: payload.score.total,
      score_max: 100,
      score_component: payload.score.componentScore,
      score_report: payload.score.reportScore,
      matched_keywords: payload.score.matchedKeywords,
      expected_keywords: payload.score.expectedKeywords,
    },
  } as any;
  const result = await tracker.value.sendEvent(synthetic);
  lastStatus.value = `${verb} (diagnostic) ${payload.score.total}/100 -> ${result.status}`;
  classroomSocket.notifyEvent(
    props.simulationId,
    'evt_diagnostic_submit',
    verb,
    description,
  );
}

function onDiagnosticRetry() {
  // Reset l'etat visuel pour preparer une nouvelle injection
  stateController.reset();
}

// === Mode Assemblage (Phase 2.4) ===
const assemblyDef = computed<AssemblyDef | undefined>(() => props.config?.assembly);
const hasAssembly = computed(() => !!assemblyDef.value && (assemblyDef.value.steps?.length || 0) > 0);

function applyAssemblyHide() {
  // Cache tous les assets listes dans hide_at_start, pour donner l'illusion d'un chassis nu.
  if (!stateAttached.value || !assemblyDef.value) return;
  const toHide = assemblyDef.value.hide_at_start ?? assemblyDef.value.steps.map((s) => s.asset_id);
  for (const id of toHide) stateController.setVisibility(id, false);
}

function onAssemblyInit() {
  // Au prochain tick (la scene three est attachee asynchroneme via @load), cache.
  // S'il n'est pas encore attache, on retentera dans le watcher.
  if (stateAttached.value) applyAssemblyHide();
}

watch(stateAttached, (attached) => {
  if (attached && hasAssembly.value) applyAssemblyHide();
});

async function onAssemblyPlace(payload: { assetId: string; correct: boolean; stepIndex: number }) {
  if (!tracker.value) return;
  if (payload.correct && stateAttached.value) {
    // Reveler le composant
    stateController.setVisibility(payload.assetId, true);
  }
  const verb = payload.correct ? 'attempted' : 'failed';
  const description = payload.correct
    ? `Etape ${payload.stepIndex + 1} : ${payload.assetId} pose correctement`
    : `Etape ${payload.stepIndex + 1} : mauvais composant clique (${payload.assetId})`;
  const synthetic = {
    id: `evt_assembly_step_${payload.stepIndex + 1}`,
    target: payload.assetId,
    xapi_verb: verb,
    xapi_description: description,
    runtime: { step_index: payload.stepIndex, correct: payload.correct },
  } as any;
  await tracker.value.sendEvent(synthetic);
  classroomSocket.notifyEvent(props.simulationId, synthetic.id, verb, description);
}

async function onAssemblyFinish(payload: { totalErrors: number; elapsedMs: number; score: number }) {
  if (!tracker.value) return;
  const verb = payload.score >= 80 ? 'passed' : 'completed';
  const description = `Assemblage termine en ${Math.round(payload.elapsedMs / 1000)}s avec ${payload.totalErrors} erreur(s) - score ${payload.score}/100`;
  const synthetic = {
    id: 'evt_assembly_finish',
    target: 'smartphone',
    xapi_verb: verb,
    xapi_description: description,
    runtime: {
      total_errors: payload.totalErrors,
      elapsed_ms: payload.elapsedMs,
      score_raw: payload.score,
      score_max: 100,
    },
  } as any;
  const result = await tracker.value.sendEvent(synthetic);
  lastStatus.value = `${verb} (assemblage) ${payload.score}/100 -> ${result.status}`;
  classroomSocket.notifyEvent(props.simulationId, 'evt_assembly_finish', verb, description);
}

function onAssemblyRetry() {
  applyAssemblyHide();
}

// === Bibliotheque composants (Phase 5 - mode inspection) ===
const hasInspectableAssets = computed(() => {
  // Active des qu'on a au moins 3 composants labellises (= sims smartphone, etc.)
  const labeled = assetsList.value.filter((a) => a.label && a.id !== 'chassis');
  return labeled.length >= 3;
});

const assetsForLibrary = computed(() =>
  assetsList.value
    .filter((a) => a.label)
    .map((a: any) => ({
      id: a.id,
      label: a.label,
      description: a.properties?.description || a.description || '',
      // Recupere une description "panne" depuis le 1er fault_state si dispo
      faultDescription: a.fault_states
        ? ((Object.values(a.fault_states)[0] as any)?.diagnostic_hint
          || (Object.values(a.fault_states)[0] as any)?.description
          || '')
        : '',
      testPoints: a.test_points || [],
    })),
);

function onLibraryIsolate(assetId: string) {
  if (!stateAttached.value) return;
  for (const a of assetsList.value) {
    if (a.id === assetId || a.id === 'chassis') {
      stateController.setVisibility(a.id, true);
    } else {
      stateController.setVisibility(a.id, false);
    }
  }
}

function onLibraryReset() {
  if (!stateAttached.value) return;
  for (const a of assetsList.value) {
    stateController.setVisibility(a.id, true);
  }
}

const loadProgress = ref(0);
const loadingFromCache = ref(false);
const loadStart = ref(Date.now());

function onModelProgress(e: any) {
  const detail = e.detail || {};
  const next = typeof detail.totalProgress === 'number' ? detail.totalProgress : 0;
  loadProgress.value = next;
  // Si on charge en moins de 200ms, c'est probablement du cache
  if (next >= 1 && Date.now() - loadStart.value < 200) {
    loadingFromCache.value = true;
  }
}

function onModelLoad(e: Event) {
  const el = (e.target as any) || viewerEl.value;
  stateAttached.value = stateController.attach(el);
  loadProgress.value = 1;
  // expose pour les tests Playwright (read-only, pas exploite par l'UI)
  if (typeof window !== 'undefined') {
    (window as any).__crnsState = stateController;
  }
}

// === Mode HD / lite (Phase 5) ===
const isHd = computed(() => props.simulationId.includes('_hd_'));
const variantId = computed<string | null>(() => {
  const meta = props.config?.metadata;
  if (!meta) return null;
  return meta.hd_variant_id || meta.lite_variant_id || null;
});
const hasVariant = computed(() => !!variantId.value);

function toggleQuality() {
  if (!variantId.value) return;
  loadProgress.value = 0;
  loadingFromCache.value = false;
  loadStart.value = Date.now();
  navigateTo(`/simulations/${variantId.value}`);
}

function resetVisualState() {
  stateController.reset();
}

onMounted(async () => {
  tracker.value = useXapiTracker(activityId.value);
  const result = await tracker.value.initialize(`Demarrage simulation ${props.title}`);
  initialized.value = true;
  lastStatus.value = `initialized -> ${result.status}`;
});

onBeforeUnmount(async () => {
  stateController.detach();
  if (!tracker.value || !initialized.value) return;
  await tracker.value.terminate(`Fermeture simulation ${props.title}`);
});

async function triggerEvent(ev: XapiEventConfig & Record<string, any>) {
  if (!tracker.value || !ev.id) return;
  busy.value = ev.id;
  try {
    if (stateAttached.value) {
      stateController.applyEvent(ev);
    }
    const result = await tracker.value.sendEvent(ev);
    lastStatus.value = `${ev.xapi_verb || 'experienced'} (${ev.id}) -> ${result.status}`;
    // Echo live au moniteur enseignant (best-effort, sans bloquer l'UX)
    classroomSocket.notifyEvent(
      props.simulationId,
      ev.id,
      ev.xapi_verb || 'experienced',
      ev.xapi_description || null,
    );
    if (props.tutorEnabled) {
      askTutor(ev);
    }
  } finally {
    busy.value = null;
  }
}

async function askTutor(ev: XapiEventConfig & Record<string, any>) {
  tutorLoading.value = true;
  tutorError.value = null;
  tutorText.value = null;
  try {
    const meta = props.config?.metadata || {};
    const payload: Record<string, any> = {
      simulation_id: props.simulationId,
      event_id: ev.id,
      title: props.title,
      subject: meta.subject,
      grade_level: meta.grade_level,
      objective: meta.pedagogical_objective,
      event_description: ev.xapi_description,
    };
    if (ev.runtime) payload.runtime = ev.runtime;
    const { data } = await apiFetch<{ explanation: string }>('/tutor/explain', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    tutorText.value = data.explanation || '(reponse vide)';
  } catch (e: any) {
    tutorError.value = e?.data?.error || e?.message || 'Erreur du tuteur';
  } finally {
    tutorLoading.value = false;
  }
}
</script>
