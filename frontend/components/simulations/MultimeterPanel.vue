<template>
  <div class="border-t border-gray-200 bg-gradient-to-br from-slate-100 via-white to-slate-100 p-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="text-slate-700 text-lg">📐</span>
      <p class="text-xs font-bold text-slate-800 uppercase tracking-wide">Multimètre virtuel</p>
      <span class="ml-auto font-mono text-[11px] text-gray-500">
        Mesures : {{ measureCount }}
      </span>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      <!-- Probe rouge -->
      <div>
        <label class="block text-[11px] font-medium text-red-700 mb-1">
          🔴 Pointe rouge (V+)
        </label>
        <select
          v-model="probeRedKey"
          class="w-full border-2 border-red-300 rounded-md px-2 py-1.5 text-xs focus:border-red-500 focus:ring-1 focus:ring-red-500 bg-white"
          @change="onMeasure"
        >
          <option value="">— Choisir un point —</option>
          <optgroup
            v-for="group in testPointGroups"
            :key="group.assetId"
            :label="group.assetLabel"
          >
            <option
              v-for="tp in group.testPoints"
              :key="`${group.assetId}::${tp.name}`"
              :value="`${group.assetId}::${tp.name}`"
            >
              {{ tp.name }} ({{ tp.voltage_nominal.toFixed(2) }}V nominal)
            </option>
          </optgroup>
        </select>
      </div>

      <!-- Probe noire -->
      <div>
        <label class="block text-[11px] font-medium text-gray-700 mb-1">
          ⚫ Pointe noire (V−)
        </label>
        <select
          v-model="probeBlackKey"
          class="w-full border-2 border-gray-400 rounded-md px-2 py-1.5 text-xs focus:border-gray-600 focus:ring-1 focus:ring-gray-500 bg-white"
          @change="onMeasure"
        >
          <option value="">— Choisir un point —</option>
          <optgroup
            v-for="group in testPointGroups"
            :key="group.assetId"
            :label="group.assetLabel"
          >
            <option
              v-for="tp in group.testPoints"
              :key="`${group.assetId}::${tp.name}`"
              :value="`${group.assetId}::${tp.name}`"
            >
              {{ tp.name }} ({{ tp.voltage_nominal.toFixed(2) }}V nominal)
            </option>
          </optgroup>
        </select>
      </div>

      <!-- LCD display -->
      <div class="flex flex-col items-stretch">
        <label class="block text-[11px] font-medium text-gray-700 mb-1">Lecture</label>
        <div
          class="flex-1 rounded-md px-3 py-2 font-mono text-base font-bold flex items-center justify-end"
          :class="lcdBgClass"
          :style="{
            background: bothSelected ? '#0b0f14' : '#1f2937',
            color: lcdColor,
            textShadow: bothSelected ? `0 0 8px ${lcdColor}` : 'none',
            border: '1px solid #334155',
          }"
        >
          <span v-if="!bothSelected" class="text-gray-500 text-xs italic">
            choisir 2 points
          </span>
          <span v-else>
            {{ formatVolts(lastReading) }}
          </span>
        </div>
        <p v-if="bothSelected" class="text-[10px] text-gray-500 mt-1 text-right">
          ΔU = {{ probeRedLabel }} − {{ probeBlackLabel }}
        </p>
      </div>
    </div>

    <!-- Interpretation -->
    <div v-if="bothSelected && interpretation" class="mt-3 text-xs px-3 py-2 rounded-md"
      :class="interpretation.severity === 'danger' ? 'bg-red-50 text-red-800 border border-red-200'
        : interpretation.severity === 'warning' ? 'bg-amber-50 text-amber-800 border border-amber-200'
        : 'bg-green-50 text-green-800 border border-green-200'"
    >
      {{ interpretation.text }}
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FaultDescriptor } from '~/composables/useSimulationStateController';

interface TestPoint {
  name: string;
  voltage_nominal: number;
  fault_value?: number;
}

interface AssetWithTestPoints {
  id: string;
  label: string;
  test_points?: TestPoint[];
}

const props = defineProps<{
  assets: AssetWithTestPoints[];
  currentFault: FaultDescriptor | null;
}>();

const emit = defineEmits<{
  (e: 'measure', payload: { redKey: string; blackKey: string; volts: number; degraded: boolean }): void;
}>();

const probeRedKey = ref('');
const probeBlackKey = ref('');
const measureCount = ref(0);
const lastReading = ref(0);
const lastDegraded = ref(false);

const testPointGroups = computed(() =>
  props.assets
    .filter((a) => a.test_points && a.test_points.length > 0)
    .map((a) => ({
      assetId: a.id,
      assetLabel: a.label || a.id,
      testPoints: a.test_points!,
    })),
);

function lookupTp(key: string): { assetId: string; tp: TestPoint } | null {
  if (!key.includes('::')) return null;
  const [assetId, tpName] = key.split('::');
  const asset = props.assets.find((a) => a.id === assetId);
  const tp = asset?.test_points?.find((p) => p.name === tpName);
  if (!tp) return null;
  return { assetId, tp };
}

function effectiveVoltage(assetId: string, tp: TestPoint): { volts: number; degraded: boolean } {
  // Si l'asset de ce point est actuellement en panne, retourner fault_value.
  const isFaulted = props.currentFault?.baseId === assetId;
  if (isFaulted && typeof tp.fault_value === 'number') {
    return { volts: tp.fault_value, degraded: true };
  }
  return { volts: tp.voltage_nominal, degraded: false };
}

const bothSelected = computed(() => !!probeRedKey.value && !!probeBlackKey.value);

const probeRedLabel = computed(() => {
  const r = lookupTp(probeRedKey.value);
  return r ? r.tp.name : '?';
});
const probeBlackLabel = computed(() => {
  const b = lookupTp(probeBlackKey.value);
  return b ? b.tp.name : '?';
});

const lcdColor = computed(() => {
  if (!bothSelected.value) return '#9ca3af';
  if (lastDegraded.value) return '#ef4444'; // rouge si valeur degradee
  return '#7CFC00'; // vert LED pour valeur saine
});

const lcdBgClass = computed(() => '');

function recompute() {
  if (!bothSelected.value) return;
  const r = lookupTp(probeRedKey.value);
  const b = lookupTp(probeBlackKey.value);
  if (!r || !b) return;
  const vr = effectiveVoltage(r.assetId, r.tp);
  const vb = effectiveVoltage(b.assetId, b.tp);
  const volts = vr.volts - vb.volts;
  const degraded = vr.degraded || vb.degraded;
  lastReading.value = volts;
  lastDegraded.value = degraded;
}

function onMeasure() {
  if (!bothSelected.value) return;
  recompute();
  measureCount.value++;
  emit('measure', {
    redKey: probeRedKey.value,
    blackKey: probeBlackKey.value,
    volts: lastReading.value,
    degraded: lastDegraded.value,
  });
}

// Recompute auto si la panne courante change (le LCD doit refleter la nouvelle realite)
watch(
  () => props.currentFault,
  () => {
    if (bothSelected.value) recompute();
  },
);

const interpretation = computed(() => {
  if (!bothSelected.value) return null;
  const r = lookupTp(probeRedKey.value);
  const b = lookupTp(probeBlackKey.value);
  if (!r || !b) return null;
  const expected = r.tp.voltage_nominal - b.tp.voltage_nominal;
  const delta = Math.abs(lastReading.value - expected);
  const tolerance = Math.max(0.1, expected * 0.05);
  if (delta < tolerance) {
    return {
      severity: 'ok' as const,
      text: `Mesure dans la tolérance. Tension nominale ≈ ${expected.toFixed(2)}V. Le segment mesuré semble fonctionnel.`,
    };
  }
  if (lastReading.value === 0 && expected !== 0) {
    return {
      severity: 'danger' as const,
      text: `Tension nulle alors que ${expected.toFixed(2)}V étaient attendus. Forte présomption de panne sur l'un des composants mesurés (court-circuit, nappe coupée ou puce HS).`,
    };
  }
  if (delta < tolerance * 3) {
    return {
      severity: 'warning' as const,
      text: `Écart anormal : ${lastReading.value.toFixed(2)}V mesurés contre ${expected.toFixed(2)}V attendus. Continuer les mesures pour isoler.`,
    };
  }
  return {
    severity: 'danger' as const,
    text: `Écart important (mesuré ${lastReading.value.toFixed(2)}V vs ${expected.toFixed(2)}V attendus). Probable panne dans la chaîne d'alimentation.`,
  };
});

function formatVolts(v: number): string {
  const sign = v < 0 ? '−' : '';
  const abs = Math.abs(v);
  if (abs < 1) return `${sign}${(abs * 1000).toFixed(0)} mV`;
  return `${sign}${abs.toFixed(2)} V`;
}
</script>
