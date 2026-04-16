<template>
  <div>
    <!-- Page Header + Panic Mode -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Agent IA</h1>
        <p class="text-sm text-gray-500 mt-1">Surveillance, audit et controle du systeme agentique</p>
      </div>

      <!-- Panic Mode Button -->
      <div v-if="auth.isSuperAdmin" class="flex items-center gap-3">
        <div v-if="panicStatus?.active" class="flex items-center gap-2">
          <span class="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
          <span class="text-sm font-bold text-red-600">PANIC MODE ACTIF</span>
        </div>

        <button
          v-if="!panicStatus?.active"
          @click="handlePanic"
          class="px-4 py-2.5 rounded-xl text-sm font-bold transition"
          :class="panicConfirmStep === 0
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-red-800 text-white animate-pulse'"
        >
          {{ panicConfirmStep === 0 ? 'COUPER L\'AGENT' : 'CONFIRMER — COUPER MAINTENANT' }}
        </button>

        <button
          v-else
          @click="handleReactivate"
          class="px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition"
        >
          Reactiver l'Agent
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div class="bg-white rounded-xl border p-4">
        <p class="text-xs text-gray-500 mb-1">Sessions actives</p>
        <p class="text-2xl font-bold text-gray-900">{{ stats?.activeSessions ?? '-' }}</p>
      </div>
      <div class="bg-white rounded-xl border p-4">
        <p class="text-xs text-gray-500 mb-1">Requetes (1h)</p>
        <p class="text-2xl font-bold text-blue-600">{{ stats?.lastHour ?? '-' }}</p>
      </div>
      <div class="bg-white rounded-xl border p-4">
        <p class="text-xs text-gray-500 mb-1">Requetes (24h)</p>
        <p class="text-2xl font-bold text-teal-600">{{ stats?.lastDay ?? '-' }}</p>
      </div>
      <div class="bg-white rounded-xl border p-4">
        <p class="text-xs text-gray-500 mb-1">Erreurs totales</p>
        <p class="text-2xl font-bold" :class="(stats?.errors || 0) > 0 ? 'text-red-600' : 'text-gray-400'">{{ stats?.errors ?? '-' }}</p>
      </div>
    </div>

    <!-- Audit Logs Table -->
    <div class="bg-white rounded-xl border overflow-hidden">
      <div class="px-5 py-4 border-b flex items-center justify-between">
        <h2 class="font-semibold text-gray-900">Journal d'audit</h2>
        <button @click="loadData" class="text-xs text-teal-600 hover:text-teal-800 font-medium">
          &#x21BB; Actualiser
        </button>
      </div>

      <div v-if="loading" class="p-8 text-center text-gray-400 text-sm">Chargement...</div>

      <div v-else-if="logs.length === 0" class="p-8 text-center text-gray-400 text-sm">
        Aucun log d'audit pour le moment.
      </div>

      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-500 text-xs uppercase">
          <tr>
            <th class="px-4 py-3 text-left">Date</th>
            <th class="px-4 py-3 text-left">Role</th>
            <th class="px-4 py-3 text-left">Action</th>
            <th class="px-4 py-3 text-left">Statut</th>
            <th class="px-4 py-3 text-right">Temps</th>
            <th class="px-4 py-3 text-left">Extrait</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          <tr v-for="log in logs" :key="log.id" class="hover:bg-gray-50">
            <td class="px-4 py-3 text-gray-600 whitespace-nowrap">{{ formatDate(log.createdAt) }}</td>
            <td class="px-4 py-3">
              <span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium" :class="roleClass(log.role)">
                {{ log.role }}
              </span>
            </td>
            <td class="px-4 py-3 font-medium text-gray-800">{{ log.action }}</td>
            <td class="px-4 py-3">
              <span class="inline-block px-2 py-0.5 text-xs rounded-full font-medium" :class="statusClass(log.status)">
                {{ log.status }}
              </span>
            </td>
            <td class="px-4 py-3 text-right text-gray-500">{{ log.executionMs }}ms</td>
            <td class="px-4 py-3 text-gray-500 truncate max-w-[200px]">{{ log.input || '-' }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' });

const auth = useAuthStore();
const { apiFetch } = useApi();

const loading = ref(true);
const logs = ref<any[]>([]);
const stats = ref<any>(null);
const panicStatus = ref<any>(null);
const panicConfirmStep = ref(0);

let panicTimer: ReturnType<typeof setTimeout> | null = null;

async function loadData() {
  loading.value = true;
  try {
    const [auditRes, statsRes, panicRes] = await Promise.all([
      apiFetch<any>('/agent/audit?limit=25'),
      apiFetch<any>('/agent/audit/stats'),
      apiFetch<any>('/agent/panic/status'),
    ]);

    logs.value = auditRes.data?.logs || [];
    stats.value = statsRes.data || { activeSessions: 0, lastHour: 0, lastDay: 0, errors: 0 };
    panicStatus.value = panicRes.data || { active: false };
  } catch (err) {
    console.error('Failed to load agent admin data:', err);
  } finally {
    loading.value = false;
  }
}

async function handlePanic() {
  if (panicConfirmStep.value === 0) {
    panicConfirmStep.value = 1;
    panicTimer = setTimeout(() => { panicConfirmStep.value = 0; }, 5000);
    return;
  }

  // Second click — execute
  if (panicTimer) clearTimeout(panicTimer);
  panicConfirmStep.value = 0;

  try {
    await apiFetch('/agent/panic', { method: 'POST' });
    panicStatus.value = { active: true };
    await loadData();
  } catch (err: any) {
    alert('Erreur: ' + (err.message || 'Impossible d\'activer le Panic Mode'));
  }
}

async function handleReactivate() {
  try {
    await apiFetch('/agent/panic/deactivate', { method: 'POST' });
    panicStatus.value = { active: false };
    await loadData();
  } catch (err: any) {
    alert('Erreur: ' + (err.message || 'Impossible de desactiver le Panic Mode'));
  }
}

function formatDate(d: string) {
  try {
    return new Date(d).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch { return d; }
}

function roleClass(role: string) {
  const map: Record<string, string> = {
    superadmin: 'bg-purple-100 text-purple-700',
    admin_ddene: 'bg-blue-100 text-blue-700',
    teacher: 'bg-teal-100 text-teal-700',
    student: 'bg-gray-100 text-gray-600',
    authorized_agent: 'bg-orange-100 text-orange-700',
  };
  return map[role] || 'bg-gray-100 text-gray-600';
}

function statusClass(status: string) {
  const map: Record<string, string> = {
    success: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
    rejected: 'bg-red-50 text-red-600',
    pending_confirmation: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    panic_killed: 'bg-red-200 text-red-800',
  };
  return map[status] || 'bg-gray-100 text-gray-600';
}

onMounted(() => loadData());
</script>
