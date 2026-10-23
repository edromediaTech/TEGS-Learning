<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 p-8">
    <header class="mb-8">
      <h1 class="text-3xl font-extrabold bg-gradient-to-r from-primary-700 to-primary-500 bg-clip-text text-transparent">
        Simulations CRNS
      </h1>
      <p class="text-gray-500 mt-1">
        Choisis une simulation pour explorer un concept scientifique en 3D.
      </p>
    </header>

    <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
      <p class="font-medium">Impossible de charger les simulations</p>
      <p class="text-sm mt-1">{{ error }}</p>
    </div>

    <div v-if="loading" class="text-center py-12 text-gray-500">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-3"></div>
      <p>Chargement...</p>
    </div>

    <div v-else-if="manifest && manifest.simulations.length === 0" class="text-center py-12 text-gray-400">
      <p class="text-lg">Aucune simulation publiee pour le moment.</p>
    </div>

    <div v-else-if="manifest" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <NuxtLink
        v-for="sim in manifest.simulations"
        :key="sim.simulation_id"
        :to="`/simulations/${sim.simulation_id}`"
        class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-primary-300 transition-all duration-200"
      >
        <div class="p-5">
          <h2 class="text-lg font-bold text-gray-900 mb-2 line-clamp-2">{{ sim.title }}</h2>
          <div class="flex flex-wrap gap-2 mb-3">
            <span class="px-2.5 py-1 text-[11px] font-bold rounded-full bg-blue-100 text-blue-800">
              {{ sim.subject || '—' }}
            </span>
            <span class="px-2.5 py-1 text-[11px] font-bold rounded-full bg-green-100 text-green-800">
              {{ sim.grade_level || '—' }}
            </span>
            <span v-if="sim.duration_minutes" class="px-2.5 py-1 text-[11px] font-bold rounded-full bg-amber-100 text-amber-800">
              {{ sim.duration_minutes }} min
            </span>
          </div>
          <p v-if="sim.objective" class="text-sm text-gray-600 leading-relaxed line-clamp-3">
            {{ sim.objective }}
          </p>
          <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
            <code class="text-[10px] bg-gray-50 px-2 py-0.5 rounded text-gray-500">{{ sim.simulation_id }}</code>
            <span class="text-primary-600 font-medium">Ouvrir &rarr;</span>
          </div>
        </div>
      </NuxtLink>
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

interface Manifest {
  generated_at: string;
  count: number;
  simulations: Simulation[];
}

const manifest = ref<Manifest | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    manifest.value = await $fetch<Manifest>(useCrnsManifestUrl(), {
      headers: { 'Cache-Control': 'no-cache' },
    });
  } catch (e: any) {
    error.value = e?.message || 'Erreur reseau';
  } finally {
    loading.value = false;
  }
});
</script>
