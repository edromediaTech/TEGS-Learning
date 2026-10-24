<template>
  <NuxtLayout name="admin">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-extrabold text-gray-900">Nœud de salle</h1>
        <p class="text-gray-500 mt-1">État de la synchronisation avec le cloud TEGS.</p>
      </div>
      <button
        v-if="status"
        @click="onSyncNow"
        :disabled="syncing"
        class="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-md hover:bg-indigo-700 disabled:opacity-50"
      >
        {{ syncing ? 'Synchronisation...' : 'Synchroniser maintenant' }}
      </button>
    </div>

    <div v-if="notEdge" class="bg-white rounded-xl shadow p-6 text-gray-600">
      Ce serveur n'est pas un nœud de salle (mode edge inactif).
    </div>
    <div v-else-if="error" class="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{{ error }}</div>
    <div v-else-if="!status" class="text-gray-500">Chargement...</div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="bg-white rounded-xl shadow p-5">
        <h2 class="text-xs font-bold text-gray-500 uppercase mb-3">Synchronisation · {{ status.center_id }}</h2>
        <p class="text-sm">
          <span :class="status.sync.consecutive_failures ? 'text-red-600' : 'text-green-700'" class="font-bold">
            {{ status.sync.consecutive_failures ? `En échec (${status.sync.consecutive_failures})` : 'OK' }}
          </span>
        </p>
        <dl class="text-sm mt-2 space-y-1">
          <div><dt class="inline text-gray-500">Dernière réception : </dt><dd class="inline">{{ fmt(status.sync.last_pull_ok_at) }}</dd></div>
          <div><dt class="inline text-gray-500">Dernier envoi : </dt><dd class="inline">{{ fmt(status.sync.last_push_ok_at) }}</dd></div>
          <div><dt class="inline text-gray-500">Prochain essai : </dt><dd class="inline">{{ fmt(status.sync.next_attempt_at) }}</dd></div>
          <div v-if="status.sync.clock_offset_ms !== null">
            <dt class="inline text-gray-500">Écart d'horloge : </dt><dd class="inline">{{ Math.round(status.sync.clock_offset_ms / 1000) }} s</dd>
          </div>
        </dl>
        <p v-if="status.sync.last_error" class="mt-3 text-xs text-red-700 bg-red-50 rounded p-2">
          {{ status.sync.last_error }}
        </p>
      </div>

      <div class="bg-white rounded-xl shadow p-5">
        <h2 class="text-xs font-bold text-gray-500 uppercase mb-3">Résultats à envoyer</h2>
        <div class="grid grid-cols-3 gap-2 text-center">
          <div><p class="text-2xl font-bold" :class="status.outbox.pending + status.outbox.retry ? 'text-amber-600' : 'text-gray-900'">{{ status.outbox.pending + status.outbox.retry }}</p><p class="text-xs text-gray-500">en attente</p></div>
          <div><p class="text-2xl font-bold text-green-700">{{ status.outbox.synced }}</p><p class="text-xs text-gray-500">envoyés</p></div>
          <div><p class="text-2xl font-bold" :class="status.outbox.failed ? 'text-red-600' : 'text-gray-900'">{{ status.outbox.failed }}</p><p class="text-xs text-gray-500">refusés</p></div>
        </div>
        <ul v-if="status.outbox.last_failed.length" class="mt-3 text-xs text-red-700 space-y-1">
          <li v-for="f in status.outbox.last_failed" :key="f.statement_id" class="font-mono truncate">{{ f.error }}</li>
        </ul>
      </div>

      <div class="bg-white rounded-xl shadow p-5">
        <h2 class="text-xs font-bold text-gray-500 uppercase mb-3">Contenu local</h2>
        <p class="text-sm">{{ status.local.students }} élèves actifs · {{ status.local.classrooms }} classes · {{ status.local.modules }} modules</p>
      </div>

      <div class="bg-white rounded-xl shadow p-5">
        <h2 class="text-xs font-bold text-gray-500 uppercase mb-3">Simulations installées ({{ status.simulations.length }})</h2>
        <ul class="text-sm space-y-1 max-h-48 overflow-y-auto">
          <li v-for="s in status.simulations" :key="s.id" class="flex justify-between">
            <span class="font-mono text-xs">{{ s.id }}</span><span class="text-xs text-gray-500">v{{ s.version }}</span>
          </li>
        </ul>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] });
useHead({ title: 'Nœud de salle | TEGS-Learning' });

const { apiFetch } = useApi();
const status = ref<any>(null);
const error = ref('');
const notEdge = ref(false);
const syncing = ref(false);
let timer: ReturnType<typeof setInterval> | null = null;

async function load() {
  try {
    const { data } = await apiFetch('/edge/status', { method: 'GET' });
    status.value = data;
    error.value = '';
  } catch (e: any) {
    if ((e?.status || e?.statusCode) === 404) notEdge.value = true;
    else error.value = e?.data?.error || e?.message || 'Etat indisponible';
  }
}

async function onSyncNow() {
  syncing.value = true;
  try {
    await apiFetch('/edge/sync-now', { method: 'POST' });
    await new Promise((ok) => setTimeout(ok, 3000));
    await load();
  } finally {
    syncing.value = false;
  }
}

function fmt(iso?: string | null) {
  return iso ? new Date(iso).toLocaleString('fr-FR') : '—';
}

onMounted(() => {
  load();
  timer = setInterval(load, 15000);
});
onBeforeUnmount(() => { if (timer) clearInterval(timer); });
</script>
