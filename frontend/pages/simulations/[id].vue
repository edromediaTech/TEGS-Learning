<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
    <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <NuxtLink to="/simulations" class="text-xs text-primary-600 hover:underline">
          &larr; Toutes les simulations
        </NuxtLink>
        <h1 class="text-xl font-bold text-gray-900 mt-1">
          {{ sim?.title || 'Chargement...' }}
        </h1>
        <p v-if="sim?.subject" class="text-xs text-gray-500">
          {{ sim.subject }}<span v-if="sim.grade_level"> &middot; {{ sim.grade_level }}</span>
        </p>
      </div>
      <code class="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{{ id }}</code>
    </header>

    <div v-if="error" class="m-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
      <p class="font-medium">Simulation indisponible</p>
      <p class="text-sm mt-1">{{ error }}</p>
    </div>

    <div v-else-if="loading" class="text-center py-16 text-gray-500">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-3"></div>
      <p>Chargement de la simulation...</p>
    </div>

    <div v-else-if="sim" class="grid grid-cols-1 lg:grid-cols-3 gap-0 h-[calc(100vh-89px)]">
      <div class="lg:col-span-2 border-r border-gray-200">
        <SimulationsSimulationViewer
          :simulation-id="sim.simulation_id"
          :title="sim.title"
          :asset-url="sim.asset_url"
          :config="config"
        />
      </div>
      <aside class="bg-white p-6 overflow-y-auto">
        <h2 class="text-sm font-bold text-gray-500 uppercase mb-2">Objectif pedagogique</h2>
        <p class="text-sm text-gray-800 leading-relaxed mb-6">
          {{ sim.objective || config?.metadata?.pedagogical_objective || 'Non specifie.' }}
        </p>

        <div class="space-y-3 text-sm">
          <div v-if="sim.duration_minutes">
            <span class="text-xs font-bold text-gray-500 uppercase">Duree estimee</span>
            <p>{{ sim.duration_minutes }} minutes</p>
          </div>
          <div v-if="config?.scoring?.success_criteria">
            <span class="text-xs font-bold text-gray-500 uppercase">Critere de reussite</span>
            <p class="text-gray-700 italic">{{ config.scoring.success_criteria }}</p>
          </div>
          <div v-if="config?.physics?.variables">
            <span class="text-xs font-bold text-gray-500 uppercase block mb-2">Formules</span>
            <div class="space-y-1.5">
              <div
                v-for="(formula, name) in config.physics.variables"
                :key="name"
                class="bg-gray-50 rounded p-2 text-xs"
              >
                <code class="text-blue-700 font-bold">{{ name }}</code>
                <span class="text-gray-500"> = </span>
                <code class="text-gray-800">{{ formula }}</code>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] });

interface Simulation {
  simulation_id: string;
  title: string;
  subject?: string;
  grade_level?: string;
  duration_minutes?: number;
  objective?: string;
  asset_url: string;
  config_url?: string;
}

const route = useRoute();
const id = computed(() => String(route.params.id));

const sim = ref<Simulation | null>(null);
const config = ref<any>(null);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const manifest = await $fetch<{ simulations: Simulation[] }>(useCrnsManifestUrl(), {
      headers: { 'Cache-Control': 'no-cache' },
    });
    const found = manifest.simulations.find((s) => s.simulation_id === id.value);
    if (!found) {
      error.value = `Aucune simulation avec l'identifiant "${id.value}".`;
      return;
    }
    sim.value = found;
    if (found.config_url) {
      config.value = await $fetch<any>(found.config_url, {
        headers: { 'Cache-Control': 'no-cache' },
      });
    }
  } catch (e: any) {
    error.value = e?.message || 'Erreur reseau';
  } finally {
    loading.value = false;
  }
});
</script>
