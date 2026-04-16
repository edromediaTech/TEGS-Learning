<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Configuration Assistant</h1>
        <p class="text-sm text-gray-500 mt-1">Limites, outils, moteur de reponse et acces public</p>
      </div>
      <button @click="saveSettings" :disabled="saving" class="px-5 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-semibold hover:bg-teal-700 transition disabled:opacity-50">
        {{ saving ? 'Enregistrement...' : 'Enregistrer' }}
      </button>
    </div>

    <div v-if="loading" class="py-12 text-center text-gray-400">Chargement...</div>

    <div v-else class="space-y-6">
      <!-- ═══ Section 1: General ═══ -->
      <div class="bg-white rounded-xl border p-6">
        <h2 class="font-semibold text-gray-900 mb-4">General</h2>
        <div class="grid md:grid-cols-2 gap-6">
          <label class="flex items-center gap-3">
            <input type="checkbox" v-model="settings.agentEnabled" class="w-4 h-4 text-teal-600 rounded" />
            <span class="text-sm">Agent active pour cette organisation</span>
          </label>
          <label class="flex items-center gap-3">
            <input type="checkbox" v-model="settings.publicAgentEnabled" class="w-4 h-4 text-teal-600 rounded" />
            <span class="text-sm">Agent public (visiteurs non connectes)</span>
          </label>
        </div>
      </div>

      <!-- ═══ Section 2: Moteur de reponse ═══ -->
      <div class="bg-white rounded-xl border p-6">
        <h2 class="font-semibold text-gray-900 mb-4">Moteur de reponse</h2>
        <div class="flex gap-4">
          <label v-for="model in models" :key="model.id" class="flex-1 relative cursor-pointer">
            <input type="radio" v-model="settings.preferredModel" :value="model.id" class="sr-only peer" />
            <div class="border-2 rounded-xl p-4 transition peer-checked:border-teal-500 peer-checked:bg-teal-50">
              <p class="font-semibold text-sm">{{ model.name }}</p>
              <p class="text-xs text-gray-500 mt-1">{{ model.description }}</p>
              <p class="text-xs font-medium mt-2" :class="model.costClass">{{ model.cost }}</p>
            </div>
          </label>
        </div>
      </div>

      <!-- ═══ Section 3: Rate Limits ═══ -->
      <div class="bg-white rounded-xl border p-6">
        <h2 class="font-semibold text-gray-900 mb-4">Limites de debit (messages/heure)</h2>
        <div class="grid md:grid-cols-3 gap-4">
          <div v-for="role in roles" :key="role.id">
            <label class="text-xs text-gray-500 font-medium">{{ role.label }}</label>
            <input
              type="number"
              v-model.number="settings.rateLimits[role.id]"
              :placeholder="String(role.defaultLimit)"
              min="1" max="200"
              class="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-400 outline-none"
            />
          </div>
        </div>
      </div>

      <!-- ═══ Section 4: Tool Management ═══ -->
      <div class="bg-white rounded-xl border p-6">
        <h2 class="font-semibold text-gray-900 mb-4">Gestion des outils par role</h2>
        <p class="text-xs text-gray-500 mb-4">Decochez un outil pour le desactiver pour un role specifique.</p>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="bg-gray-50 text-xs text-gray-500 uppercase">
              <tr>
                <th class="px-3 py-2 text-left">Outil</th>
                <th v-for="role in toolRoles" :key="role.id" class="px-3 py-2 text-center">{{ role.label }}</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr v-for="tool in allTools" :key="tool.id" class="hover:bg-gray-50">
                <td class="px-3 py-2">
                  <p class="font-medium text-gray-800">{{ tool.name }}</p>
                  <p class="text-[10px] text-gray-400">{{ tool.id }}</p>
                </td>
                <td v-for="role in toolRoles" :key="role.id" class="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    :checked="!isToolDisabled(tool.id, role.id)"
                    @change="toggleTool(tool.id, role.id)"
                    class="w-4 h-4 text-teal-600 rounded"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ═══ Section 5: Public Knowledge Gate ═══ -->
      <div class="bg-white rounded-xl border p-6">
        <h2 class="font-semibold text-gray-900 mb-4">Acces Public (Knowledge Gate)</h2>
        <div class="space-y-4">
          <div>
            <label class="text-xs text-gray-500 font-medium">Message de courtoisie (sujets confidentiels)</label>
            <textarea
              v-model="settings.confidentialityMessage"
              rows="2"
              class="mt-1 w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-400 outline-none"
              placeholder="Pour des raisons de securite, je ne peux pas discuter de ce sujet."
            />
          </div>
        </div>
      </div>

      <!-- ═══ Section 6: Token Usage ═══ -->
      <div class="bg-white rounded-xl border p-6">
        <h2 class="font-semibold text-gray-900 mb-4">Consommation du mois</h2>
        <div class="grid md:grid-cols-3 gap-4">
          <div class="text-center p-4 bg-gray-50 rounded-xl">
            <p class="text-2xl font-bold text-gray-900">{{ tokenUsage?.totalRequests ?? '-' }}</p>
            <p class="text-xs text-gray-500 mt-1">Requetes</p>
          </div>
          <div class="text-center p-4 bg-gray-50 rounded-xl">
            <p class="text-2xl font-bold text-teal-600">{{ formatTokens(tokenUsage?.totalTokens) }}</p>
            <p class="text-xs text-gray-500 mt-1">Unites consommees</p>
          </div>
          <div class="text-center p-4 bg-gray-50 rounded-xl">
            <p class="text-2xl font-bold text-blue-600">~${{ tokenUsage?.estimatedCostUSD ?? '0.00' }}</p>
            <p class="text-xs text-gray-500 mt-1">Cout estime</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' });

const auth = useAuthStore();
const { apiFetch } = useApi();

const loading = ref(true);
const saving = ref(false);
const settings = ref<any>({});
const allTools = ref<any[]>([]);
const tokenUsage = ref<any>(null);

const models = [
  { id: 'gemini-2.0-flash', name: 'Rapide', description: 'Reponses rapides et economiques. Ideal pour la plupart des cas.', cost: '~$0.10 / 1M unites', costClass: 'text-green-600' },
  { id: 'gemini-1.5-pro', name: 'Precision', description: 'Reponses plus intelligentes et detaillees. Pour les taches complexes.', cost: '~$3.50 / 1M unites', costClass: 'text-orange-600' },
];

const roles = [
  { id: 'student', label: 'Candidat', defaultLimit: 20 },
  { id: 'authorized_agent', label: 'Agent POS', defaultLimit: 30 },
  { id: 'teacher', label: 'Enseignant', defaultLimit: 25 },
  { id: 'admin_ddene', label: 'Admin DDENE', defaultLimit: 50 },
  { id: 'superadmin', label: 'SuperAdmin', defaultLimit: 50 },
];

const toolRoles = [
  { id: 'student', label: 'Candidat' },
  { id: 'authorized_agent', label: 'Agent' },
  { id: 'teacher', label: 'Enseignant' },
  { id: 'admin_ddene', label: 'Admin' },
];

function isToolDisabled(toolId: string, roleId: string): boolean {
  const disabled = settings.value.disabledTools?.[roleId] || [];
  return disabled.includes(toolId);
}

function toggleTool(toolId: string, roleId: string) {
  if (!settings.value.disabledTools) settings.value.disabledTools = {};
  if (!settings.value.disabledTools[roleId]) settings.value.disabledTools[roleId] = [];

  const arr = settings.value.disabledTools[roleId];
  const idx = arr.indexOf(toolId);
  if (idx >= 0) {
    arr.splice(idx, 1);
  } else {
    arr.push(toolId);
  }
}

function formatTokens(n: number | undefined): string {
  if (!n) return '0';
  if (n > 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n > 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

async function loadData() {
  loading.value = true;
  try {
    const [settingsRes, usageRes] = await Promise.all([
      apiFetch<any>('/agent/settings'),
      apiFetch<any>('/agent/settings/token-usage'),
    ]);

    settings.value = settingsRes.data?.settings || {};
    if (!settings.value.rateLimits) settings.value.rateLimits = {};
    if (!settings.value.disabledTools) settings.value.disabledTools = {};
    allTools.value = settingsRes.data?.tools || [];
    tokenUsage.value = usageRes.data || null;
  } catch (err) {
    console.error('Load settings error:', err);
  } finally {
    loading.value = false;
  }
}

async function saveSettings() {
  saving.value = true;
  try {
    await apiFetch('/agent/settings', {
      method: 'PUT',
      body: JSON.stringify(settings.value),
    });
    alert('Settings enregistres avec succes.');
  } catch (err: any) {
    alert('Erreur: ' + (err.message || 'Impossible d\'enregistrer'));
  } finally {
    saving.value = false;
  }
}

onMounted(() => loadData());
</script>
