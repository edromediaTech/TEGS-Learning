<template>
  <div>
    <NuxtLayout name="admin">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-extrabold bg-gradient-to-r from-primary-700 to-primary-500 bg-clip-text text-transparent">
            Stats Simulations CRNS
          </h1>
          <p class="text-gray-500 mt-1">Traces xAPI/cmi5 des simulations 3D - tenant courant</p>
        </div>
        <div class="flex items-center gap-3">
          <select v-model="period" @change="load" class="border rounded-lg px-3 py-2 text-sm">
            <option value="7">7 derniers jours</option>
            <option value="30">30 derniers jours</option>
            <option value="90">90 derniers jours</option>
            <option value="all">Tout</option>
          </select>
          <select v-model="activityFilter" @change="load" class="border rounded-lg px-3 py-2 text-sm">
            <option value="">Toutes simulations</option>
            <option v-for="sim in simulationOptions" :key="sim.id" :value="sim.id">
              {{ sim.label }}
            </option>
          </select>
          <button
            @click="load"
            :disabled="loading"
            class="bg-gradient-to-r from-primary-600 to-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:from-primary-700 hover:to-blue-600 font-bold disabled:opacity-50"
          >
            Actualiser
          </button>
        </div>
      </div>

      <div v-if="error" class="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
        <p class="font-medium">Impossible de charger les statements</p>
        <p class="text-sm mt-1">{{ error }}</p>
      </div>

      <div v-if="loading" class="text-center py-12 text-gray-500">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-3"></div>
        <p>Chargement...</p>
      </div>

      <template v-else>
        <!-- KPIs -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div class="bg-white rounded-xl shadow p-5">
            <p class="text-sm text-gray-500">Sessions lancees</p>
            <p class="text-3xl font-bold text-primary-700">{{ kpi.sessions }}</p>
          </div>
          <div class="bg-white rounded-xl shadow p-5">
            <p class="text-sm text-gray-500">% terminees</p>
            <p class="text-3xl font-bold" :class="kpi.completionRate >= 60 ? 'text-green-600' : 'text-amber-600'">
              {{ kpi.completionRate }}%
            </p>
          </div>
          <div class="bg-white rounded-xl shadow p-5">
            <p class="text-sm text-gray-500">Echecs (failed)</p>
            <p class="text-3xl font-bold text-red-600">{{ kpi.failed }}</p>
          </div>
          <div class="bg-white rounded-xl shadow p-5">
            <p class="text-sm text-gray-500">Eleves actifs</p>
            <p class="text-3xl font-bold text-purple-600">{{ kpi.activeUsers }}</p>
          </div>
        </div>

        <!-- Top simulations -->
        <div class="bg-white rounded-xl shadow p-6 mb-8">
          <h2 class="text-lg font-bold text-gray-900 mb-4">Top simulations</h2>
          <div v-if="!topSimulations.length" class="text-sm text-gray-400 italic">
            Aucune trace dans la periode selectionnee.
          </div>
          <div v-else class="space-y-2">
            <div
              v-for="sim in topSimulations"
              :key="sim.id"
              class="flex items-center gap-4 text-sm"
            >
              <span class="w-48 truncate font-medium text-gray-800" :title="sim.id">
                {{ sim.label }}
              </span>
              <div class="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  class="h-full bg-gradient-to-r from-primary-500 to-blue-400 rounded-full"
                  :style="{ width: ((sim.count / topSimulations[0].count) * 100) + '%' }"
                ></div>
              </div>
              <span class="w-16 text-right tabular-nums font-bold text-primary-700">
                {{ sim.count }}
              </span>
            </div>
          </div>
        </div>

        <!-- Per-student summary -->
        <div class="bg-white rounded-xl shadow p-6 mb-8">
          <h2 class="text-lg font-bold text-gray-900 mb-4">Eleves</h2>
          <div v-if="!perUser.length" class="text-sm text-gray-400 italic">
            Aucun eleve sur la periode.
          </div>
          <table v-else class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs uppercase text-gray-500 border-b">
                <th class="py-2">Eleve</th>
                <th class="py-2 text-right">Sessions</th>
                <th class="py-2 text-right">Sims uniques</th>
                <th class="py-2 text-right">Echecs</th>
                <th class="py-2 text-right">Derniere activite</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="u in perUser" :key="u.id" class="border-b border-gray-50 hover:bg-gray-50">
                <td class="py-2">
                  <p class="font-medium text-gray-800">{{ u.name }}</p>
                  <p class="text-[11px] text-gray-400">{{ u.email }}</p>
                </td>
                <td class="py-2 text-right tabular-nums">{{ u.sessions }}</td>
                <td class="py-2 text-right tabular-nums">{{ u.uniqueSims }}</td>
                <td class="py-2 text-right tabular-nums" :class="u.failed ? 'text-red-600 font-bold' : ''">
                  {{ u.failed }}
                </td>
                <td class="py-2 text-right text-xs text-gray-500">
                  {{ formatDate(u.lastSeen) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Recent statements -->
        <div class="bg-white rounded-xl shadow p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4">Traces recentes</h2>
          <div v-if="!statements.length" class="text-sm text-gray-400 italic">
            Aucun statement.
          </div>
          <table v-else class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs uppercase text-gray-500 border-b">
                <th class="py-2">Date</th>
                <th class="py-2">Verbe</th>
                <th class="py-2">Simulation</th>
                <th class="py-2">Acteur</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="s in statements.slice(0, 50)"
                :key="s.statementId || s._id"
                class="border-b border-gray-50 hover:bg-gray-50"
              >
                <td class="py-2 text-xs text-gray-500 whitespace-nowrap">
                  {{ formatDate(s.timestamp) }}
                </td>
                <td class="py-2">
                  <span
                    class="px-2 py-0.5 text-[10px] font-bold rounded-full"
                    :class="verbColor(verbKey(s))"
                  >
                    {{ verbKey(s) }}
                  </span>
                </td>
                <td class="py-2 text-xs">
                  <code class="text-gray-700">{{ activityShort(s.object?.id) }}</code>
                </td>
                <td class="py-2 text-xs text-gray-600">
                  {{ s.actor?.name || s.actor?.mbox || '?' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: [
    'auth',
    function () {
      const auth = useAuthStore();
      if (!auth.isAdmin && !auth.isTeacher) {
        return navigateTo('/admin/modules');
      }
    },
  ],
});

interface Statement {
  _id?: string;
  statementId?: string;
  timestamp: string;
  verb?: { id?: string; display?: Record<string, string> };
  object?: { id?: string; definition?: any };
  actor?: { user_id?: string; name?: string; mbox?: string };
  result?: { success?: boolean };
}

const { apiFetch } = useApi();

const period = ref<'7' | '30' | '90' | 'all'>('30');
const activityFilter = ref<string>('');
const loading = ref(false);
const error = ref<string | null>(null);
const statements = ref<Statement[]>([]);
const simulationLabels = ref<Record<string, string>>({});

async function loadSimulationLabels() {
  try {
    const m = await $fetch<{ simulations: { simulation_id: string; title: string }[] }>(
      useCrnsManifestUrl(),
      { headers: { 'Cache-Control': 'no-cache' } }
    );
    const labels: Record<string, string> = {};
    for (const s of m.simulations) {
      labels[`https://crns.tegs-learning.edu.ht/sim/${s.simulation_id}`] = s.title;
    }
    simulationLabels.value = labels;
  } catch {
    // pas grave - on tombera sur l'id court
  }
}

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const params = new URLSearchParams({ limit: '500' });
    if (period.value !== 'all') {
      const days = parseInt(period.value, 10);
      const since = new Date(Date.now() - days * 86400_000).toISOString();
      params.set('since', since);
    }
    if (activityFilter.value) {
      params.set('activity', activityFilter.value);
    }
    const { data } = await apiFetch<{ statements: Statement[] }>(
      `/xapi/statements?${params.toString()}`
    );
    // ne garder que les traces de simulations CRNS
    statements.value = (data.statements || []).filter((s) =>
      s.object?.id?.startsWith('https://crns.tegs-learning.edu.ht/sim/')
    );
  } catch (e: any) {
    error.value = e?.data?.error || e?.message || 'Erreur reseau';
    statements.value = [];
  } finally {
    loading.value = false;
  }
}

function verbKey(s: Statement): string {
  const id = s.verb?.id || '';
  return id.split('/').pop() || '?';
}

function activityShort(id?: string): string {
  if (!id) return '?';
  return id.split('/').pop() || id;
}

function verbColor(verb: string): string {
  switch (verb) {
    case 'completed':
    case 'passed':
    case 'terminated':
      return 'bg-green-100 text-green-800';
    case 'failed':
      return 'bg-red-100 text-red-800';
    case 'experienced':
    case 'attempted':
      return 'bg-blue-100 text-blue-800';
    case 'initialized':
      return 'bg-amber-100 text-amber-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

const simulationOptions = computed(() =>
  Object.entries(simulationLabels.value).map(([id, label]) => ({ id, label }))
);

const kpi = computed(() => {
  const initialized = statements.value.filter((s) => verbKey(s) === 'initialized').length;
  const terminated = statements.value.filter((s) => verbKey(s) === 'terminated').length;
  const failed = statements.value.filter((s) => verbKey(s) === 'failed').length;
  const users = new Set(statements.value.map((s) => s.actor?.user_id).filter(Boolean));
  const completionRate = initialized > 0 ? Math.round((terminated / initialized) * 100) : 0;
  return {
    sessions: initialized,
    completionRate,
    failed,
    activeUsers: users.size,
  };
});

const topSimulations = computed(() => {
  const counts = new Map<string, number>();
  for (const s of statements.value) {
    if (verbKey(s) !== 'initialized') continue;
    const id = s.object?.id;
    if (!id) continue;
    counts.set(id, (counts.get(id) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => ({
      id,
      label: simulationLabels.value[id] || activityShort(id),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
});

const perUser = computed(() => {
  const byUser = new Map<
    string,
    { id: string; name: string; email: string; sessions: number; sims: Set<string>; failed: number; lastSeen: string }
  >();
  for (const s of statements.value) {
    const uid = s.actor?.user_id;
    if (!uid) continue;
    if (!byUser.has(uid)) {
      byUser.set(uid, {
        id: uid,
        name: s.actor?.name || '?',
        email: (s.actor?.mbox || '').replace('mailto:', ''),
        sessions: 0,
        sims: new Set(),
        failed: 0,
        lastSeen: s.timestamp,
      });
    }
    const u = byUser.get(uid)!;
    if (verbKey(s) === 'initialized') u.sessions++;
    if (verbKey(s) === 'failed') u.failed++;
    if (s.object?.id) u.sims.add(s.object.id);
    if (s.timestamp > u.lastSeen) u.lastSeen = s.timestamp;
  }
  return [...byUser.values()]
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      sessions: u.sessions,
      uniqueSims: u.sims.size,
      failed: u.failed,
      lastSeen: u.lastSeen,
    }))
    .sort((a, b) => b.sessions - a.sessions);
});

onMounted(async () => {
  await loadSimulationLabels();
  await load();
});
</script>
