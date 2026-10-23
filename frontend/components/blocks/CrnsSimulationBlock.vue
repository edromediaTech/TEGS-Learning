<template>
  <div class="space-y-2">
    <p v-if="data.title" class="font-medium text-gray-700">{{ data.title }}</p>
    <div v-if="error" class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
      Simulation indisponible : {{ error }}
    </div>
    <div v-else-if="!ready" class="text-sm text-gray-500 text-center py-16 bg-gray-50 rounded-lg">
      Chargement de la simulation...
    </div>
    <div v-else class="crns-sim-block border rounded-lg overflow-hidden bg-white">
      <SimulationsSimulationViewer
        :simulation-id="simulationId"
        :title="data.title || config?.metadata?.title || simulationId"
        :asset-url="data.url"
        :config="config"
        :tutor-enabled="tutorEnabled"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
// Bloc embed injecte par CRNS (data.kind = "crns_simulation_3d") dans un ecran de module :
// charge la config de la simulation puis delegue a SimulationViewer, le meme lecteur
// que /simulations/[id] (etats, interactions, traces, tuteur).
const props = withDefaults(
  defineProps<{
    data: { url: string; config_url?: string; title?: string };
    tutorEnabled?: boolean;
  }>(),
  { tutorEnabled: true }
);

const config = ref<any>(null);
const ready = ref(false);
const error = ref('');

// simulation_id de la config, sinon nom du fichier .glb.
const simulationId = computed(
  () => config.value?.metadata?.simulation_id
    || props.data.url.split('/').pop()?.replace(/\.glb$/i, '')
    || 'simulation'
);

onMounted(async () => {
  if (props.data.config_url) {
    try {
      config.value = await $fetch(props.data.config_url);
    } catch {
      // Sans config, le lecteur affiche quand meme le modele (sans interactions).
    }
  }
  if (!props.data.url) error.value = 'aucun modele 3D associe';
  ready.value = true;
});
</script>

<style scoped>
/* SimulationViewer donne h-full a <model-viewer> : sans parent de hauteur definie
   (cas d'un ecran de module), la scene serait a hauteur nulle. */
.crns-sim-block :deep(model-viewer) {
  height: 480px;
}
</style>
