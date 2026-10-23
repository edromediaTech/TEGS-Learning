<template>
  <NuxtLayout name="admin">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-extrabold bg-gradient-to-r from-primary-700 to-primary-500 bg-clip-text text-transparent">
          Moniteur Classe CRNS
        </h1>
        <p class="text-gray-500 mt-1">
          Pousse une simulation à toute la classe et suis en direct la progression des élèves.
        </p>
      </div>
      <div class="flex items-center gap-3 text-sm">
        <span
          class="inline-flex items-center gap-2 px-3 py-1 rounded-full font-medium"
          :class="connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'"
        >
          <span class="w-2 h-2 rounded-full" :class="connected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'"></span>
          {{ connected ? 'Connecté' : 'Hors ligne' }}
        </span>
        <span v-if="error" class="text-red-600">{{ error }}</span>
      </div>
    </div>

    <div v-if="lastLaunch" class="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
      <strong class="text-blue-800">Dernier push :</strong>
      simulation <code>{{ lastLaunch.simulationId }}</code>
      <span v-if="lastLaunch.simulationTitle">— {{ lastLaunch.simulationTitle }}</span>
      <span class="text-gray-500"> à {{ formatTime(lastLaunch.at) }}</span>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Liste simulations -->
      <div class="bg-white rounded-xl shadow p-5">
        <h2 class="text-lg font-bold text-gray-900 mb-3">Simulations disponibles</h2>
        <div v-if="loadingManifest" class="text-sm text-gray-400 italic">Chargement...</div>
        <div v-else-if="!manifest.length" class="text-sm text-gray-400 italic">Aucune simulation déployée.</div>
        <ul v-else class="space-y-2">
          <li
            v-for="sim in manifest"
            :key="sim.simulation_id"
            class="border border-gray-200 rounded-lg p-3 hover:border-primary-400 transition-colors"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="font-semibold text-gray-900 truncate">{{ sim.title }}</p>
                <p class="text-xs text-gray-500 mt-0.5">
                  {{ sim.subject || '-' }} · {{ sim.grade_level || '-' }}
                </p>
                <p class="text-[11px] text-gray-400 mt-0.5 font-mono">{{ sim.simulation_id }}</p>
              </div>
              <button
                @click="pushToClass(sim)"
                :disabled="!connected"
                class="px-3 py-1.5 bg-gradient-to-r from-primary-600 to-blue-500 text-white rounded-md text-xs font-bold hover:from-primary-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
              >
                Pousser
              </button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Roster connectes -->
      <div class="bg-white rounded-xl shadow p-5">
        <h2 class="text-lg font-bold text-gray-900 mb-3 flex items-center justify-between">
          Connectés
          <span class="text-sm font-normal text-gray-500">{{ rosterList.length }}</span>
        </h2>
        <div v-if="!rosterList.length" class="text-sm text-gray-400 italic">
          Personne en ligne pour l'instant.
        </div>
        <ul v-else class="space-y-2">
          <li
            v-for="u in rosterList"
            :key="u.userId || u.socketId"
            class="border border-gray-200 rounded-lg p-3"
          >
            <div class="flex items-center justify-between">
              <p class="font-semibold text-sm text-gray-900">
                {{ u.name || u.userId?.slice(0, 8) || 'Anonyme' }}
              </p>
              <span
                class="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                :class="isTeacherRole(u.role) ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'"
              >
                {{ isTeacherRole(u.role) ? 'enseignant' : 'élève' }}
              </span>
            </div>
            <p v-if="u.currentSimulationId" class="text-xs text-gray-500 mt-1">
              <span class="font-mono">{{ u.currentSimulationId }}</span>
              <span v-if="u.lastEventId"> · <code>{{ u.lastEventId }}</code></span>
            </p>
            <p v-else class="text-xs text-gray-400 italic mt-1">
              En attente d'une simulation...
            </p>
          </li>
        </ul>
      </div>

      <!-- Timeline events -->
      <div class="bg-white rounded-xl shadow p-5">
        <h2 class="text-lg font-bold text-gray-900 mb-3">Activité en direct</h2>
        <div v-if="!events.length" class="text-sm text-gray-400 italic">
          Aucun event reçu pour l'instant.
        </div>
        <ul v-else class="space-y-1.5 max-h-[500px] overflow-y-auto">
          <li
            v-for="(ev, i) in events"
            :key="i"
            class="text-xs border-l-2 pl-3 py-1"
            :class="verbColor(ev.xapiVerb)"
          >
            <span class="text-gray-400">{{ formatTime(ev.at) }}</span>
            <strong class="ml-1 text-gray-800">{{ ev.userName || ev.userId.slice(0, 6) }}</strong>
            <span class="ml-1 text-gray-700">{{ ev.xapiVerb || '?' }}</span>
            <code class="ml-1 text-gray-600">{{ ev.eventId }}</code>
          </li>
        </ul>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] });

interface ManifestEntry {
  simulation_id: string;
  title: string;
  subject?: string;
  grade_level?: string;
}

const auth = useAuthStore();
const userName = computed(
  () => (auth.user ? `${auth.user.firstName} ${auth.user.lastName}`.trim() : null),
);
const monitor = useCrnsClassroomSocket({ name: userName.value || undefined });

const { connected, rosterList, lastLaunch, events, error, launch, connect } = monitor;
const TEACHER_ROLES = new Set(['admin_ddene', 'superadmin', 'teacher']);
function isTeacherRole(r: string): boolean {
  return TEACHER_ROLES.has(r);
}

const manifest = ref<ManifestEntry[]>([]);
const loadingManifest = ref(true);

async function loadManifest() {
  try {
    const res = await fetch(useCrnsManifestUrl());
    if (res.ok) {
      const data = await res.json();
      manifest.value = data.simulations || [];
    }
  } catch (e) {
    console.error('manifest', e);
  } finally {
    loadingManifest.value = false;
  }
}

function pushToClass(sim: ManifestEntry) {
  launch(sim.simulation_id, sim.title);
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', { hour12: false });
  } catch {
    return iso;
  }
}

function verbColor(verb: string | null): string {
  switch (verb) {
    case 'failed': return 'border-red-400 text-red-700';
    case 'passed': return 'border-green-400 text-green-700';
    case 'experienced': return 'border-blue-400 text-blue-700';
    case 'attempted': return 'border-amber-400 text-amber-700';
    case 'completed': return 'border-emerald-400 text-emerald-700';
    case 'initialized': return 'border-gray-300 text-gray-600';
    default: return 'border-gray-200 text-gray-500';
  }
}

onMounted(() => {
  connect();
  loadManifest();
});
</script>
