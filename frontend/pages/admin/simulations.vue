<template>
  <div>
    <NuxtLayout name="admin">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-extrabold bg-gradient-to-r from-primary-700 to-primary-500 bg-clip-text text-transparent">
            Simulations CRNS
          </h1>
          <p class="text-gray-500 mt-1">
            Galerie 3D des simulations pedagogiques generees par le Centre de Ressources Numeriques et de Simulation
          </p>
        </div>
        <button
          @click="loadManifest"
          :disabled="loading"
          class="bg-gradient-to-r from-primary-600 to-blue-500 text-white px-5 py-2.5 rounded-xl hover:from-primary-700 hover:to-blue-600 transition-all shadow-lg flex items-center space-x-2 font-bold disabled:opacity-50"
        >
          <span class="text-lg">&#8635;</span>
          <span>Actualiser</span>
        </button>
      </div>

      <!-- Stats banner -->
      <div v-if="!loading && manifest" class="mb-6 flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
        <div class="flex-1">
          <p class="text-sm text-gray-600">
            <span class="font-bold text-blue-700">{{ manifest.count }}</span>
            simulation{{ manifest.count > 1 ? 's' : '' }} disponible{{ manifest.count > 1 ? 's' : '' }}
            &middot; manifest genere le
            <span class="font-medium">{{ formatDate(manifest.generated_at) }}</span>
          </p>
        </div>
        <div class="text-xs text-gray-500">
          Source : <code class="bg-white px-2 py-0.5 rounded border border-gray-200">/simulations/manifest.json</code>
        </div>
      </div>

      <!-- Erreur -->
      <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
        <p class="font-medium">Impossible de charger les simulations</p>
        <p class="text-sm mt-1">{{ error }}</p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-12 text-gray-500">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-3"></div>
        <p>Chargement des simulations...</p>
      </div>

      <!-- Empty -->
      <div v-else-if="manifest && manifest.simulations.length === 0" class="text-center py-12">
        <div class="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="text-3xl text-primary-400">&#127757;</span>
        </div>
        <p class="text-gray-400 text-lg mb-2">Aucune simulation publiee</p>
        <p class="text-gray-400 text-sm">
          Generez une simulation depuis CRNS via <code class="bg-gray-100 px-2 py-0.5 rounded">core/ai_bridge.py --build</code>
        </p>
      </div>

      <!-- Grille -->
      <div v-else-if="manifest" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <article
          v-for="sim in manifest.simulations"
          :key="sim.simulation_id"
          @click="openDetail(sim)"
          class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 hover:border-primary-300 transition-all duration-200 cursor-pointer"
        >
          <ClientOnly>
            <model-viewer
              :src="sim.asset_url"
              :alt="sim.title"
              camera-controls
              auto-rotate
              auto-rotate-delay="3000"
              rotation-per-second="20deg"
              shadow-intensity="0.5"
              exposure="0.95"
              environment-image="neutral"
              class="w-full h-72 bg-gradient-to-br from-gray-50 to-gray-100"
            >
              <div slot="poster" class="flex items-center justify-center h-full text-gray-400">
                Chargement 3D...
              </div>
            </model-viewer>
            <template #fallback>
              <div class="w-full h-72 flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
                Initialisation du viewer 3D...
              </div>
            </template>
          </ClientOnly>

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
              <span v-if="sim.n_events" class="px-2.5 py-1 text-[11px] font-bold rounded-full bg-pink-100 text-pink-800">
                {{ sim.n_events }} events
              </span>
              <span class="px-2.5 py-1 text-[11px] font-bold rounded-full bg-purple-100 text-purple-800">
                {{ formatSize(sim.size_bytes) }}
              </span>
            </div>

            <p v-if="sim.objective" class="text-sm text-gray-600 leading-relaxed line-clamp-3">
              <span class="font-semibold text-gray-700">Objectif :</span>
              {{ sim.objective }}
            </p>

            <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
              <code class="text-[10px] bg-gray-50 px-2 py-0.5 rounded text-gray-500">{{ sim.simulation_id }}</code>
              <span class="text-primary-600 font-medium">Cliquer pour le detail &rarr;</span>
            </div>
          </div>
        </article>
      </div>

      <!-- Modal de detail -->
      <div
        v-if="selected"
        @click.self="closeDetail"
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-6xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 class="text-xl font-bold text-gray-900">{{ selected.title }}</h2>
              <p class="text-xs text-gray-500 mt-0.5">
                <code>{{ selected.simulation_id }}</code> &middot;
                <a :href="selected.asset_url" download class="text-primary-600 hover:underline">Telecharger GLB</a> &middot;
                <a :href="selected.config_url" download class="text-primary-600 hover:underline">Telecharger JSON</a>
              </p>
            </div>
            <button
              @click="closeDetail"
              class="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100"
              aria-label="Fermer"
            >
              &times;
            </button>
          </div>

          <!-- Content -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-0 flex-1 overflow-hidden">
            <!-- Left: 3D viewer -->
            <div class="bg-gradient-to-br from-gray-50 to-gray-100 lg:border-r border-gray-200 min-h-[400px]">
              <ClientOnly>
                <model-viewer
                  :src="selected.asset_url"
                  :alt="selected.title"
                  camera-controls
                  auto-rotate
                  auto-rotate-delay="3000"
                  rotation-per-second="15deg"
                  shadow-intensity="0.6"
                  exposure="1.0"
                  environment-image="neutral"
                  class="w-full h-full min-h-[400px]"
                ></model-viewer>
              </ClientOnly>
            </div>

            <!-- Right: details -->
            <div class="p-6 overflow-y-auto">
              <!-- Loading config -->
              <div v-if="configLoading" class="text-center py-12 text-gray-500">
                <div class="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 mb-2"></div>
                <p class="text-sm">Chargement de la configuration...</p>
              </div>

              <div v-else-if="configError" class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                Impossible de charger la config : {{ configError }}
              </div>

              <div v-else-if="config" class="space-y-6">
                <!-- Tabs -->
                <div class="flex gap-1 border-b border-gray-200">
                  <button
                    v-for="tab in tabs"
                    :key="tab.id"
                    @click="activeTab = tab.id"
                    class="px-3 py-2 text-sm font-medium transition-colors border-b-2"
                    :class="activeTab === tab.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'"
                  >
                    {{ tab.label }}
                  </button>
                </div>

                <!-- Tab: Pedagogie -->
                <div v-if="activeTab === 'meta'" class="space-y-3 text-sm">
                  <div>
                    <span class="text-xs font-bold text-gray-500 uppercase">Matiere</span>
                    <p>{{ config.metadata?.subject || '—' }}</p>
                  </div>
                  <div>
                    <span class="text-xs font-bold text-gray-500 uppercase">Niveau</span>
                    <p>{{ config.metadata?.grade_level || '—' }}</p>
                  </div>
                  <div>
                    <span class="text-xs font-bold text-gray-500 uppercase">Duree estimee</span>
                    <p>{{ config.metadata?.duration_minutes || '?' }} minutes</p>
                  </div>
                  <div>
                    <span class="text-xs font-bold text-gray-500 uppercase">Objectif pedagogique</span>
                    <p class="leading-relaxed">{{ config.metadata?.pedagogical_objective || '—' }}</p>
                  </div>
                  <div v-if="config.scoring">
                    <span class="text-xs font-bold text-gray-500 uppercase">Critere de reussite</span>
                    <p class="text-gray-600 italic">{{ config.scoring.success_criteria || '—' }}</p>
                  </div>
                </div>

                <!-- Tab: Composants -->
                <div v-else-if="activeTab === 'assets'" class="space-y-2">
                  <div
                    v-for="asset in (config.assets || [])"
                    :key="asset.id"
                    class="border border-gray-200 rounded-lg p-3 text-sm"
                  >
                    <div class="flex items-center justify-between mb-1">
                      <span class="font-bold">{{ asset.label || asset.id }}</span>
                      <code class="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-600">{{ asset.primitive }}</code>
                    </div>
                    <div v-if="asset.properties" class="text-xs text-gray-600 grid grid-cols-2 gap-x-3 mt-2">
                      <div v-for="(val, key) in asset.properties" :key="key">
                        <span class="font-medium">{{ key }}:</span> {{ val }}
                      </div>
                    </div>
                  </div>
                  <p v-if="!(config.assets || []).length" class="text-gray-400 text-sm italic">Aucun composant</p>
                </div>

                <!-- Tab: Events -->
                <div v-else-if="activeTab === 'events'" class="space-y-3">
                  <div
                    v-for="event in (config.events || [])"
                    :key="event.id"
                    class="border border-gray-200 rounded-lg p-3 text-sm"
                  >
                    <div class="flex items-center justify-between mb-2">
                      <span class="font-bold">{{ event.id }}</span>
                      <span
                        class="px-2 py-0.5 text-[10px] font-bold rounded-full"
                        :class="verbColor(event.xapi_verb)"
                      >
                        {{ event.xapi_verb || '—' }}
                      </span>
                    </div>
                    <p class="text-xs text-gray-700 mb-1">
                      <span class="font-semibold">Trigger :</span>
                      <code class="text-[11px] bg-gray-100 px-1.5 py-0.5 rounded">{{ event.trigger }}</code>
                    </p>
                    <p class="text-xs text-gray-700 mb-1">
                      <span class="font-semibold">Action :</span>
                      <code class="text-[11px]">{{ event.action }}</code>
                      sur
                      <code class="text-[11px]">{{ event.target }}</code>
                    </p>
                    <p v-if="event.xapi_description" class="text-xs text-gray-500 italic mt-2">
                      &laquo; {{ event.xapi_description }} &raquo;
                    </p>
                  </div>
                  <p v-if="!(config.events || []).length" class="text-gray-400 text-sm italic">Aucun event defini</p>
                </div>

                <!-- Tab: Physics -->
                <div v-else-if="activeTab === 'physics'" class="space-y-3 text-sm">
                  <div v-if="config.physics?.engine">
                    <span class="text-xs font-bold text-gray-500 uppercase">Moteur</span>
                    <p><code>{{ config.physics.engine }}</code></p>
                  </div>
                  <div v-if="config.physics?.variables">
                    <span class="text-xs font-bold text-gray-500 uppercase block mb-2">Variables et formules</span>
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
                  <p v-if="!config.physics" class="text-gray-400 text-sm italic">Aucune physique definie</p>
                </div>

                <!-- Tab: Raw JSON -->
                <div v-else-if="activeTab === 'raw'">
                  <pre class="bg-gray-900 text-gray-100 text-[11px] p-3 rounded-lg overflow-auto max-h-[60vh] leading-relaxed">{{ rawJson }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: [
    'auth',
    function () {
      const auth = useAuthStore();
      if (!auth.isSuperAdmin) {
        return navigateTo('/admin/modules');
      }
    },
  ],
});

interface Simulation {
  simulation_id: string;
  title: string;
  subject?: string;
  grade_level?: string;
  language?: string;
  duration_minutes?: number;
  objective?: string;
  asset_url: string;
  config_url?: string;
  size_bytes: number;
  n_events?: number;
  n_assets?: number;
}

interface Manifest {
  generated_at: string;
  count: number;
  simulations: Simulation[];
}

const manifest = ref<Manifest | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

const selected = ref<Simulation | null>(null);
const config = ref<any>(null);
const configLoading = ref(false);
const configError = ref<string | null>(null);
const activeTab = ref<'meta' | 'assets' | 'events' | 'physics' | 'raw'>('meta');

const tabs = [
  { id: 'meta', label: 'Pedagogie' },
  { id: 'assets', label: 'Composants' },
  { id: 'events', label: 'Events' },
  { id: 'physics', label: 'Physique' },
  { id: 'raw', label: 'JSON brut' },
] as const;

const rawJson = computed(() => config.value ? JSON.stringify(config.value, null, 2) : '');

useHead({ title: 'Simulations CRNS | TEGS-Learning' });
useModelViewer();

async function loadManifest() {
  loading.value = true;
  error.value = null;
  try {
    const res = await $fetch<Manifest>(useCrnsManifestUrl(), {
      headers: { 'Cache-Control': 'no-cache' },
    });
    manifest.value = res;
  } catch (e: any) {
    error.value = e?.message || 'Erreur reseau';
    manifest.value = null;
  } finally {
    loading.value = false;
  }
}

async function openDetail(sim: Simulation) {
  selected.value = sim;
  config.value = null;
  configError.value = null;
  activeTab.value = 'meta';

  if (!sim.config_url) return;

  configLoading.value = true;
  try {
    config.value = await $fetch<any>(sim.config_url, {
      headers: { 'Cache-Control': 'no-cache' },
    });
  } catch (e: any) {
    configError.value = e?.message || 'Erreur reseau';
  } finally {
    configLoading.value = false;
  }
}

function closeDetail() {
  selected.value = null;
  config.value = null;
  configError.value = null;
}

function verbColor(verb?: string): string {
  switch (verb) {
    case 'passed':
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'experienced':
    case 'attempted':
      return 'bg-blue-100 text-blue-800';
    case 'scored':
    case 'answered':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function formatSize(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
}

onMounted(() => {
  loadManifest();
});
</script>
