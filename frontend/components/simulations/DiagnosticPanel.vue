<template>
  <div class="border-t border-gray-200 bg-gradient-to-br from-amber-50 via-white to-amber-50 p-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="text-amber-600 text-lg">⚙</span>
      <p class="text-xs font-bold text-amber-800 uppercase tracking-wide">Journal de Diagnostic</p>
      <span v-if="hasFault" class="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
        PANNE EN COURS
      </span>
    </div>

    <!-- Avant injection -->
    <p v-if="!hasFault && !lastResult" class="text-sm text-gray-600 italic">
      Clique sur <code class="bg-white px-1.5 py-0.5 rounded border border-gray-200">evt_inject_random_fault</code>
      pour qu'une panne aléatoire soit injectée. Tu devras ensuite identifier le composant défaillant.
    </p>

    <!-- Pendant le diagnostic -->
    <form v-else-if="hasFault && !lastResult" @submit.prevent="onSubmit" class="space-y-3">
      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1">
          Quel composant est défaillant ?
        </label>
        <select
          v-model="suspectId"
          class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          required
        >
          <option value="" disabled>-- Choisir un composant --</option>
          <option v-for="a in inspectableAssets" :key="a.id" :value="a.id">
            {{ a.label || a.id }}
          </option>
        </select>
      </div>

      <div>
        <label class="block text-xs font-medium text-gray-700 mb-1">
          Décris le symptôme observé (1-2 phrases)
        </label>
        <textarea
          v-model="reportText"
          rows="3"
          class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          placeholder="Ex: tension instable aux bornes, bornes chaudes, déformation visible du chassis."
        ></textarea>
      </div>

      <div class="flex gap-2">
        <button
          type="submit"
          :disabled="!suspectId || submitting"
          class="px-4 py-2 bg-amber-600 text-white text-sm font-bold rounded-md hover:bg-amber-700 disabled:opacity-50"
        >
          {{ submitting ? 'Évaluation...' : 'Soumettre le diagnostic' }}
        </button>
        <button
          type="button"
          @click="$emit('cancel')"
          class="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
        >
          Annuler
        </button>
      </div>
    </form>

    <!-- Resultat -->
    <div v-else-if="lastResult" class="space-y-3">
      <div
        class="rounded-lg p-4 border-l-4"
        :class="lastResult.correct
          ? 'bg-green-50 border-green-500 text-green-900'
          : 'bg-red-50 border-red-500 text-red-900'"
      >
        <div class="flex items-center gap-2 mb-1">
          <span class="text-2xl">{{ lastResult.correct ? '✅' : '❌' }}</span>
          <span class="font-bold text-base">
            {{ lastResult.correct ? 'Bon diagnostic !' : 'Mauvais diagnostic' }}
          </span>
          <span class="ml-auto text-sm font-mono px-2 py-0.5 rounded bg-white shadow-sm">
            {{ lastResult.score.total }}/100
          </span>
        </div>
        <p class="text-sm leading-relaxed">
          <strong v-if="!lastResult.correct">La vraie panne :</strong>
          <strong v-else>Composant identifié :</strong>
          {{ lastResult.actualLabel }}
        </p>

        <!-- Bareme detaille -->
        <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs bg-white/60 rounded p-2">
          <span class="font-semibold">Composant identifié</span>
          <span class="text-right font-mono">
            {{ lastResult.score.componentScore }}/60
            <span v-if="lastResult.correct" class="text-green-600">✓</span>
            <span v-else class="text-red-600">✗</span>
          </span>
          <span class="font-semibold">Justification (mots-clés)</span>
          <span class="text-right font-mono">
            {{ lastResult.score.reportScore }}/40
            <span class="text-gray-500 ml-1">
              ({{ lastResult.score.matchedKeywords.length }}/{{ lastResult.score.expectedKeywords.length }})
            </span>
          </span>
        </div>

        <p v-if="lastResult.actualHint" class="text-xs mt-2 italic opacity-80">
          Indice attendu : {{ lastResult.actualHint }}
        </p>
        <p v-if="lastResult.score.matchedKeywords.length" class="text-xs mt-1 opacity-80">
          Mots-clés trouvés dans ton rapport :
          <span
            v-for="k in lastResult.score.matchedKeywords"
            :key="k"
            class="inline-block bg-white/80 rounded px-1.5 py-0.5 ml-1 font-mono"
          >{{ k }}</span>
        </p>
        <p v-if="!lastResult.correct" class="text-xs mt-1 opacity-80">
          Tu avais répondu : <code class="bg-white px-1 py-0.5 rounded">{{ lastResult.suspectLabel }}</code>
        </p>
      </div>
      <button
        type="button"
        @click="onRetry"
        class="px-4 py-2 bg-primary-600 text-white text-sm font-bold rounded-md hover:bg-primary-700"
      >
        Nouvelle session
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FaultDescriptor } from '~/composables/useSimulationStateController';
import type { DiagnosticScore } from '~/composables/useDiagnosticScoring';

interface AssetSummary {
  id: string;
  label: string;
  hasFaultStates?: boolean;
}

const props = defineProps<{
  assets: AssetSummary[];
  currentFault: FaultDescriptor | null;
  // Map assetId -> label resolu (pour afficher le nom et pas l'id)
  labelOf: (id: string) => string;
}>();

const emit = defineEmits<{
  (e: 'submit', payload: {
    suspectId: string;
    suspectLabel: string;
    reportText: string;
    correct: boolean;
    score: DiagnosticScore;
  }): void;
  (e: 'cancel'): void;
  (e: 'retry'): void;
}>();

const suspectId = ref('');
const reportText = ref('');
const submitting = ref(false);
const lastResult = ref<{
  correct: boolean;
  score: DiagnosticScore;
  actualId: string;
  actualLabel: string;
  actualHint: string | null;
  suspectId: string;
  suspectLabel: string;
} | null>(null);

const hasFault = computed(() => !!props.currentFault);
const inspectableAssets = computed(() =>
  props.assets.filter((a) => a.hasFaultStates),
);

watch(
  () => props.currentFault,
  (next, prev) => {
    // Quand une nouvelle panne est injectee, reset le formulaire
    if (next && next !== prev) {
      suspectId.value = '';
      reportText.value = '';
      lastResult.value = null;
    }
  },
);

function onSubmit() {
  if (!props.currentFault || !suspectId.value) return;
  submitting.value = true;
  const actualId = props.currentFault.baseId;
  const actualLabel = props.labelOf(actualId);
  const correct = suspectId.value === actualId;
  const suspectLabel = props.labelOf(suspectId.value);

  // Bareme v2 : composant 60 pts + justification 40 pts (matching keywords).
  const score = gradeDiagnostic(
    correct,
    reportText.value,
    props.currentFault.diagnosticHint,
  );

  lastResult.value = {
    correct,
    score,
    actualId,
    actualLabel,
    actualHint: props.currentFault.diagnosticHint,
    suspectId: suspectId.value,
    suspectLabel,
  };
  emit('submit', {
    suspectId: suspectId.value,
    suspectLabel,
    reportText: reportText.value,
    correct,
    score,
  });
  submitting.value = false;
}

function onRetry() {
  lastResult.value = null;
  suspectId.value = '';
  reportText.value = '';
  emit('retry');
}
</script>
