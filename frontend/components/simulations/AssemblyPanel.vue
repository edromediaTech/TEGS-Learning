<template>
  <div class="border-t border-gray-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="text-blue-600 text-lg">🔧</span>
      <p class="text-xs font-bold text-blue-800 uppercase tracking-wide">Mode Assemblage</p>
      <span v-if="!finished" class="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold">
        Étape {{ currentStepIndex + 1 }}/{{ totalSteps }}
      </span>
      <span v-else class="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">
        Terminé
      </span>
      <span class="ml-auto font-mono text-[11px] text-gray-500">
        ⏱ {{ elapsedDisplay }} · {{ errorCount }} erreur{{ errorCount !== 1 ? 's' : '' }}
      </span>
    </div>

    <!-- Step en cours -->
    <div v-if="!finished" class="space-y-3">
      <div class="bg-white border border-blue-200 rounded-lg p-3">
        <p class="text-sm font-semibold text-gray-900">{{ currentStep.label }}</p>
        <p v-if="currentStep.tools?.length" class="text-xs text-gray-500 mt-1">
          Outils :
          <span
            v-for="t in currentStep.tools"
            :key="t"
            class="inline-block bg-gray-100 rounded px-1.5 py-0.5 ml-1 font-mono"
          >{{ t }}</span>
        </p>
      </div>

      <!-- Progress bar -->
      <div class="h-2 bg-blue-100 rounded-full overflow-hidden">
        <div
          class="h-full bg-blue-500 transition-all duration-300"
          :style="{ width: `${(currentStepIndex / totalSteps) * 100}%` }"
        ></div>
      </div>

      <!-- Pick component -->
      <div>
        <p class="text-xs font-medium text-gray-700 mb-2">Quel composant installer maintenant ?</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="opt in pickableAssets"
            :key="opt.id"
            type="button"
            @click="onPick(opt.id)"
            :disabled="placedAssetIds.has(opt.id)"
            class="px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors"
            :class="placedAssetIds.has(opt.id)
              ? 'bg-green-50 border-green-300 text-green-700 line-through cursor-not-allowed'
              : 'bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50'"
          >
            <span v-if="placedAssetIds.has(opt.id)">✓</span>
            {{ opt.label }}
          </button>
        </div>
      </div>

      <!-- Wrong-pick feedback -->
      <div v-if="lastError" class="text-xs bg-red-50 border-l-4 border-red-400 text-red-800 p-2 rounded">
        ❌ {{ lastError }}
      </div>
    </div>

    <!-- Score final -->
    <div v-else class="space-y-3">
      <div
        class="rounded-lg p-4 border-l-4"
        :class="finalScore >= 80
          ? 'bg-green-50 border-green-500 text-green-900'
          : finalScore >= 50
          ? 'bg-amber-50 border-amber-500 text-amber-900'
          : 'bg-red-50 border-red-500 text-red-900'"
      >
        <div class="flex items-center gap-2 mb-1">
          <span class="text-2xl">{{ finalScore >= 80 ? '🏆' : finalScore >= 50 ? '🟡' : '❌' }}</span>
          <span class="font-bold text-base">
            {{ finalScore >= 80 ? 'Excellent !' : finalScore >= 50 ? 'Acceptable' : 'À retravailler' }}
          </span>
          <span class="ml-auto text-sm font-mono px-2 py-0.5 rounded bg-white shadow-sm">
            {{ finalScore }}/100
          </span>
        </div>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs bg-white/60 rounded p-2 mt-2">
          <span class="font-semibold">Ordre correct</span>
          <span class="text-right font-mono">{{ scoreOrder }}/60</span>
          <span class="font-semibold">Sans erreur (×3)</span>
          <span class="text-right font-mono">{{ scoreErrors }}/30</span>
          <span class="font-semibold">Temps respecté</span>
          <span class="text-right font-mono">{{ scoreTime }}/10</span>
        </div>
        <p class="text-xs mt-2 opacity-80">
          Temps total : {{ elapsedDisplay }} · Erreurs : {{ errorCount }}
        </p>
      </div>
      <button
        type="button"
        @click="onRetry"
        class="px-4 py-2 bg-primary-600 text-white text-sm font-bold rounded-md hover:bg-primary-700"
      >
        Recommencer
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface AssemblyStep {
  order: number;
  asset_id: string;
  label: string;
  rationale?: string;
  tools?: string[];
}

interface AssemblyDef {
  hide_at_start?: string[];
  steps: AssemblyStep[];
}

interface AssetSummary {
  id: string;
  label: string;
}

const props = defineProps<{
  assembly: AssemblyDef;
  assets: AssetSummary[];
}>();

const emit = defineEmits<{
  (e: 'place', payload: { assetId: string; correct: boolean; stepIndex: number }): void;
  (e: 'finish', payload: { totalErrors: number; elapsedMs: number; score: number }): void;
  (e: 'retry'): void;
  (e: 'init'): void;
}>();

const currentStepIndex = ref(0);
const placedAssetIds = ref<Set<string>>(new Set());
const errorCount = ref(0);
const lastError = ref<string | null>(null);
const startedAt = ref<number>(Date.now());
const elapsedMs = ref(0);
const finished = ref(false);
let timer: ReturnType<typeof setInterval> | null = null;

const totalSteps = computed(() => props.assembly.steps.length);
const currentStep = computed(() => props.assembly.steps[currentStepIndex.value] || props.assembly.steps[0]);

const pickableAssets = computed(() => {
  // Tous les assets qui apparaissent dans les steps (donc montables) :
  const stepAssetIds = new Set(props.assembly.steps.map((s) => s.asset_id));
  return props.assets.filter((a) => stepAssetIds.has(a.id));
});

const elapsedDisplay = computed(() => {
  const s = Math.floor(elapsedMs.value / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
});

// Score breakdown
const scoreOrder = computed(() => (finished.value ? 60 : 0));
const scoreErrors = computed(() => (finished.value ? Math.max(0, 30 - errorCount.value * 3) : 0));
const TARGET_TIME_MS = 5 * 60 * 1000;
const scoreTime = computed(() => {
  if (!finished.value) return 0;
  if (elapsedMs.value <= TARGET_TIME_MS) return 10;
  // Decay 1pt per 30s over
  const overSec = (elapsedMs.value - TARGET_TIME_MS) / 1000;
  return Math.max(0, Math.round(10 - overSec / 30));
});
const finalScore = computed(() => scoreOrder.value + scoreErrors.value + scoreTime.value);

function startTimer() {
  if (timer) return;
  timer = setInterval(() => {
    elapsedMs.value = Date.now() - startedAt.value;
  }, 250);
}

function stopTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function onPick(assetId: string) {
  if (finished.value) return;
  if (placedAssetIds.value.has(assetId)) return;

  const expected = currentStep.value.asset_id;
  const correct = assetId === expected;
  if (correct) {
    placedAssetIds.value.add(assetId);
    placedAssetIds.value = new Set(placedAssetIds.value);
    lastError.value = null;
    emit('place', { assetId, correct: true, stepIndex: currentStepIndex.value });
    if (currentStepIndex.value + 1 >= totalSteps.value) {
      finishedNow();
    } else {
      currentStepIndex.value++;
    }
  } else {
    errorCount.value++;
    const expectedLabel = props.assets.find((a) => a.id === expected)?.label || expected;
    lastError.value = `Mauvais composant. L'étape attendue était : ${expectedLabel}.`;
    emit('place', { assetId, correct: false, stepIndex: currentStepIndex.value });
  }
}

function finishedNow() {
  stopTimer();
  elapsedMs.value = Date.now() - startedAt.value;
  finished.value = true;
  emit('finish', {
    totalErrors: errorCount.value,
    elapsedMs: elapsedMs.value,
    score: finalScore.value,
  });
}

function onRetry() {
  currentStepIndex.value = 0;
  placedAssetIds.value = new Set();
  errorCount.value = 0;
  lastError.value = null;
  startedAt.value = Date.now();
  elapsedMs.value = 0;
  finished.value = false;
  startTimer();
  emit('retry');
}

onMounted(() => {
  emit('init');
  startTimer();
});

onBeforeUnmount(() => stopTimer());
</script>
