<template>
  <div class="border-t border-gray-200 bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-4">
    <div class="flex items-center gap-2 mb-3">
      <span class="text-emerald-700 text-lg">🔍</span>
      <p class="text-xs font-bold text-emerald-800 uppercase tracking-wide">Bibliothèque de composants</p>
      <span class="ml-auto text-[11px] text-gray-500">
        {{ inspectables.length }} composants
      </span>
    </div>

    <!-- Grille de boutons composants : tous visibles a la fois -->
    <div class="mb-3">
      <p class="text-xs font-medium text-gray-700 mb-2">
        Clique un composant pour l'isoler dans la scène 3D :
      </p>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
        <button
          v-for="a in inspectables"
          :key="a.id"
          type="button"
          @click="pick(a.id)"
          class="text-left p-2 rounded-md border-2 transition-all"
          :class="selectedId === a.id
            ? 'border-emerald-600 bg-emerald-50 shadow-md'
            : 'border-gray-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/50'"
        >
          <p
            class="text-sm font-bold leading-tight"
            :class="selectedId === a.id ? 'text-emerald-800' : 'text-gray-900'"
          >
            {{ a.label }}
          </p>
          <p class="text-[10px] text-gray-500 font-mono mt-0.5 truncate">{{ a.id }}</p>
        </button>

        <!-- Bouton retour vue globale -->
        <button
          type="button"
          @click="resetView"
          class="p-2 rounded-md border-2 border-dashed border-gray-300 bg-gray-50 text-xs text-gray-600 font-semibold hover:border-emerald-400 hover:bg-white"
          :class="!selectedId ? 'opacity-50 cursor-default' : ''"
          :disabled="!selectedId"
        >
          ← Vue globale
        </button>
      </div>
    </div>

    <!-- Controles de manipulation (visibles seulement si composant isole) -->
    <div
      v-if="selectedAsset"
      class="bg-white border border-emerald-200 rounded-md p-3 mb-3"
    >
      <p class="text-[11px] font-bold text-emerald-700 uppercase mb-2">
        Manipuler le composant
      </p>
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <span class="text-gray-500">Vues :</span>
        <button
          v-for="v in visibleViews"
          :key="v.label"
          @click="setView(v.orbit)"
          class="px-2.5 py-1 rounded border border-gray-300 bg-white hover:border-emerald-400 hover:bg-emerald-50 font-medium text-gray-700"
        >
          {{ v.label }}
        </button>
        <button
          @click="toggleAutoRotate"
          class="px-2.5 py-1 rounded border font-medium ml-2"
          :class="autoRotateOn
            ? 'border-emerald-500 bg-emerald-100 text-emerald-800'
            : 'border-gray-300 bg-white text-gray-700 hover:border-emerald-400'"
        >
          {{ autoRotateOn ? '⏸ Pause rotation' : '▶ Rotation auto' }}
        </button>
        <span class="ml-auto text-[10px] text-gray-500 italic">
          Souris : orbite (clic-glisser) · zoom (molette) · pan (clic-droit)
        </span>
      </div>
      <div class="mt-3 flex items-center gap-2 text-xs">
        <span class="text-gray-500 w-16">Zoom :</span>
        <input
          v-model.number="zoomRadius"
          type="range"
          min="0.4"
          max="4"
          step="0.1"
          class="flex-1 accent-emerald-600"
          @input="applyZoom"
        />
        <span class="font-mono text-gray-600 w-12 text-right">{{ zoomRadius.toFixed(1) }}m</span>
      </div>
    </div>

    <!-- Carte info du composant selectionne -->
    <div
      v-if="selectedAsset"
      class="bg-white border-l-4 border-emerald-500 rounded-md p-3"
    >
      <p class="text-base font-bold text-gray-900">{{ selectedAsset.label }}</p>
      <p class="text-[11px] text-gray-500 font-mono">{{ selectedAsset.id }}</p>
      <p
        v-if="selectedAsset.description"
        class="text-sm text-gray-700 leading-relaxed mt-2"
      >
        {{ selectedAsset.description }}
      </p>
      <p
        v-if="selectedAsset.faultDescription"
        class="text-xs text-red-700 leading-relaxed mt-2 bg-red-50 rounded p-2 border border-red-100"
      >
        <strong>Symptôme de panne typique :</strong> {{ selectedAsset.faultDescription }}
      </p>
      <div v-if="selectedAsset.testPoints?.length" class="mt-2">
        <p class="text-[10px] uppercase font-bold text-gray-500">Points de test</p>
        <div class="flex flex-wrap gap-1 mt-1">
          <span
            v-for="tp in selectedAsset.testPoints"
            :key="tp.name"
            class="inline-block bg-slate-100 text-slate-700 rounded px-1.5 py-0.5 text-[10px] font-mono"
          >
            {{ tp.name }} ({{ tp.voltage_nominal.toFixed(2) }}V)
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface AssetWithDesc {
  id: string;
  label: string;
  description?: string;
  faultDescription?: string;
  testPoints?: { name: string; voltage_nominal: number }[];
}

const props = withDefaults(defineProps<{
  assets: AssetWithDesc[];
  modelViewerEl: any;
  // false quand la scene a un sol : la camera est bloquee au-dessus de l'horizon.
  allowBelow?: boolean;
}>(), { allowBelow: true });

const emit = defineEmits<{
  (e: 'isolate', assetId: string): void;
  (e: 'reset'): void;
}>();

const selectedId = ref('');
const autoRotateOn = ref(true);
const zoomRadius = ref(1.5);

// Vues predefinies : (theta, phi, radius)
const viewAngles = [
  { label: 'Face',    orbit: '0deg 90deg auto' },
  { label: 'Dessus',  orbit: '0deg 0deg auto' },
  { label: 'Dessous', orbit: '0deg 180deg auto' },
  { label: '3/4',     orbit: '45deg 70deg auto' },
  { label: 'Côté',    orbit: '90deg 90deg auto' },
];
const visibleViews = computed(() =>
  props.allowBelow ? viewAngles : viewAngles.filter((v) => v.label !== 'Dessous'),
);

const inspectables = computed(() =>
  props.assets.filter((a) => a.label && a.id !== 'chassis'),
);

const selectedAsset = computed(() =>
  inspectables.value.find((a) => a.id === selectedId.value) || null,
);

function pick(assetId: string) {
  selectedId.value = assetId;
  emit('isolate', assetId);
  focusCamera(assetId);
}

function resetView() {
  selectedId.value = '';
  emit('reset');
  resetCamera();
}

function getMv(): any {
  return props.modelViewerEl?.value || props.modelViewerEl;
}

function focusCamera(assetId: string) {
  const mv = getMv();
  if (!mv) return;
  try {
    const scene = mv.model?.scene;
    if (!scene?.traverse) return;
    interface Pos { x: number; y: number; z: number }
    let pos: Pos | null = null;
    scene.traverse((n: any) => {
      const ud = n.userData || {};
      if (n.name === assetId && ud.crns_state === 'default') {
        const m = n.matrixWorld?.elements;
        if (m) pos = { x: Number(m[12]), y: Number(m[13]), z: Number(m[14]) } as Pos;
      }
    });
    if (pos) {
      const p = pos as Pos;
      mv.cameraTarget = `${p.x}m ${p.y}m ${p.z}m`;
      // Zoom serre par defaut sur le composant isole
      zoomRadius.value = 1.5;
      mv.cameraOrbit = `45deg 70deg ${zoomRadius.value}m`;
      // Auto-rotate active autour du composant pour le voir tourner
      if (autoRotateOn.value) {
        mv.setAttribute('auto-rotate', '');
        mv.setAttribute('rotation-per-second', '30deg');
      }
    }
  } catch (e) {
    console.warn('[library] focus camera failed', e);
  }
}

function resetCamera() {
  const mv = getMv();
  if (!mv) return;
  try {
    mv.cameraTarget = 'auto auto auto';
    mv.cameraOrbit = 'auto auto auto';
    mv.setAttribute('auto-rotate', '');
    mv.setAttribute('auto-rotate-delay', '3000');
    mv.setAttribute('rotation-per-second', '20deg');
  } catch {}
}

function setView(orbit: string) {
  const mv = getMv();
  if (!mv) return;
  // Remplace le radius "auto" par notre zoomRadius courant pour rester coherent
  const final = orbit.replace(/auto$/, `${zoomRadius.value}m`);
  mv.cameraOrbit = final;
}

function toggleAutoRotate() {
  autoRotateOn.value = !autoRotateOn.value;
  const mv = getMv();
  if (!mv) return;
  if (autoRotateOn.value) {
    mv.setAttribute('auto-rotate', '');
  } else {
    mv.removeAttribute('auto-rotate');
  }
}

function applyZoom() {
  const mv = getMv();
  if (!mv) return;
  // Conserve theta/phi, change juste le radius
  const cur = mv.getCameraOrbit?.() || mv.cameraOrbit || '45deg 70deg 1.5m';
  if (typeof cur === 'string') {
    const parts = cur.split(/\s+/);
    if (parts.length >= 3) {
      mv.cameraOrbit = `${parts[0]} ${parts[1]} ${zoomRadius.value}m`;
    } else {
      mv.cameraOrbit = `45deg 70deg ${zoomRadius.value}m`;
    }
  }
}
</script>
