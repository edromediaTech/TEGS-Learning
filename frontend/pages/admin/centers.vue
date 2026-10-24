<template>
  <NuxtLayout name="admin">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-3xl font-extrabold text-gray-900">Centres de salle</h1>
        <p class="text-gray-500 mt-1">Nœuds TEGS-Edge : une salle hors ligne par centre, synchronisée avec le cloud.</p>
      </div>
      <button
        v-if="tenantId"
        @click="openForm()"
        class="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-md hover:bg-indigo-700"
      >
        + Nouveau centre
      </button>
    </div>

    <div v-if="auth.isSuperAdmin" class="mb-4 max-w-sm">
      <label class="block text-xs font-medium text-gray-700 mb-1">Établissement</label>
      <select v-model="tenantId" @change="load" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white">
        <option value="" disabled>Choisir...</option>
        <option v-for="t in tenants" :key="t._id" :value="t._id">{{ t.name }}</option>
      </select>
    </div>

    <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{{ error }}</div>

    <div v-if="tenantId && !centers.length && !loading" class="bg-white rounded-xl shadow p-8 text-center text-gray-500">
      Aucun centre. Créez-en un pour chaque salle équipée d'un serveur local.
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div v-for="c in centers" :key="c.id" class="bg-white rounded-xl shadow p-5 border border-gray-200">
        <div class="flex items-start justify-between">
          <div>
            <p class="font-mono text-xs text-gray-500">{{ c.center_id }}</p>
            <h3 class="text-base font-bold text-gray-900">{{ c.name }}</h3>
          </div>
          <span :class="health(c).cls" class="text-xs font-bold px-2 py-0.5 rounded">{{ health(c).label }}</span>
        </div>
        <dl class="text-xs text-gray-600 mt-3 space-y-0.5">
          <div>Dernier contact : <strong>{{ ago(c.last_seen_at) }}</strong></div>
          <div>Dernier envoi de résultats : {{ ago(c.last_push_at) }}</div>
          <div>Version du nœud : {{ c.edge_version || '—' }} · Écart d'horloge : {{ c.last_clock_offset_ms == null ? '—' : `${Math.round(c.last_clock_offset_ms / 1000)} s` }}</div>
          <div>{{ c.classroom_ids.length }} classe(s) · {{ c.module_ids.length || 'modules publiés' }}{{ c.module_ids.length ? ' module(s)' : '' }} · {{ c.simulation_ids.length || 'toutes les' }} simulation(s)</div>
          <div>Jeton : <span class="font-mono">{{ c.token_prefix }}…</span></div>
        </dl>
        <div class="flex gap-2 mt-4">
          <button @click="openForm(c)" class="flex-1 text-xs px-2 py-1.5 border border-gray-300 rounded hover:bg-gray-50">Modifier</button>
          <button @click="onRotate(c)" class="flex-1 text-xs px-2 py-1.5 border border-amber-300 text-amber-800 rounded hover:bg-amber-50">Nouveau jeton</button>
          <button @click="onToggle(c)" class="flex-1 text-xs px-2 py-1.5 border rounded" :class="c.isActive ? 'border-red-300 text-red-700 hover:bg-red-50' : 'border-green-300 text-green-700 hover:bg-green-50'">
            {{ c.isActive ? 'Désactiver' : 'Réactiver' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Creation / modification -->
    <div v-if="form" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <h2 class="text-lg font-bold text-gray-900 mb-4">{{ form.id ? 'Modifier le centre' : 'Nouveau centre' }}</h2>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Identifiant</label>
            <input v-model="form.center_id" :disabled="!!form.id" placeholder="CRNS-NORD-EST-01" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono uppercase disabled:bg-gray-100" />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-1">Nom</label>
            <input v-model="form.name" placeholder="Centre pilote Fort-Liberté" class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>

        <h3 class="text-xs font-bold text-gray-500 uppercase mt-5 mb-2">Classes servies par la salle</h3>
        <p v-if="!options.classrooms.length" class="text-xs text-gray-500">Aucune classe dans l'établissement (Mes Classes CRNS).</p>
        <label v-for="o in options.classrooms" :key="o.id" class="flex items-center gap-2 text-sm py-0.5">
          <input type="checkbox" :value="o.id" v-model="form.classroom_ids" />
          {{ o.name }} <span class="text-xs text-gray-400">{{ o.code }} · {{ o.students }} élève(s) · {{ o.teacher }}</span>
        </label>

        <h3 class="text-xs font-bold text-gray-500 uppercase mt-5 mb-1">Modules de cours</h3>
        <p class="text-xs text-gray-500 mb-2">Aucune case cochée = tous les modules publiés de l'établissement.</p>
        <label v-for="o in options.modules" :key="o.id" class="flex items-center gap-2 text-sm py-0.5">
          <input type="checkbox" :value="o.id" v-model="form.module_ids" />
          {{ o.title }} <span class="text-xs" :class="o.status === 'published' ? 'text-green-600' : 'text-gray-400'">{{ o.status === 'published' ? 'publié' : 'brouillon' }}</span>
        </label>

        <h3 class="text-xs font-bold text-gray-500 uppercase mt-5 mb-1">Simulations 3D</h3>
        <p class="text-xs text-gray-500 mb-2">Aucune case cochée = tout le catalogue CRNS.</p>
        <div class="grid grid-cols-2 gap-x-3">
          <label v-for="o in options.simulations" :key="o.id" class="flex items-center gap-2 text-xs py-0.5">
            <input type="checkbox" :value="o.id" v-model="form.simulation_ids" /> {{ o.title }}
          </label>
        </div>

        <div class="flex gap-2 mt-6">
          <button @click="onSave" :disabled="saving || !form.center_id || !form.name" class="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-md hover:bg-indigo-700 disabled:opacity-50">
            {{ saving ? 'Enregistrement...' : form.id ? 'Enregistrer' : 'Créer le centre' }}
          </button>
          <button @click="form = null" class="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200">Annuler</button>
        </div>
      </div>
    </div>

    <!-- Jeton du noeud : affiche une seule fois -->
    <div v-if="token" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
        <h2 class="text-lg font-bold text-gray-900">Configuration du nœud {{ token.center_id }}</h2>
        <div class="p-3 my-3 bg-amber-50 border border-amber-300 rounded text-sm text-amber-800">
          Le jeton n'est affiché <strong>qu'une seule fois</strong>. Copiez ces lignes dans le fichier
          <code>deploy/edge/.env.edge</code> du serveur de la salle (ou laissez <code>install.sh</code> vous les demander).
        </div>
        <pre class="bg-gray-900 text-white text-sm font-mono leading-relaxed rounded p-3 overflow-x-auto select-all">{{ envSnippet }}</pre>
        <div class="flex gap-2 mt-4">
          <button @click="copyEnv" class="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-md hover:bg-indigo-700">{{ copied ? 'Copié' : 'Copier' }}</button>
          <button @click="token = null; copied = false" class="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200">J'ai noté le jeton</button>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] });
useHead({ title: 'Centres de salle | TEGS-Learning' });

interface Center {
  id: string; center_id: string; name: string; isActive: boolean; token_prefix: string;
  classroom_ids: string[]; module_ids: string[]; simulation_ids: string[];
  edge_version: string; last_seen_at: string | null; last_push_at: string | null; last_clock_offset_ms: number | null;
}

const auth = useAuthStore();
const { apiFetch } = useApi();
const config = useRuntimeConfig();
const centers = ref<Center[]>([]);
const tenants = ref<{ _id: string; name: string }[]>([]);
const tenantId = ref<string>(auth.isSuperAdmin ? '' : (auth.tenant_id || auth.user?.tenant_id || ''));
const options = ref<{ classrooms: any[]; modules: any[]; simulations: any[] }>({ classrooms: [], modules: [], simulations: [] });
const form = ref<any>(null);
const token = ref<{ center_id: string; value: string } | null>(null);
const loading = ref(false);
const saving = ref(false);
const copied = ref(false);
const error = ref('');

const q = () => (auth.isSuperAdmin ? `?tenant_id=${tenantId.value}` : '');

// URL du backend cloud vue par le noeud (meme API que cette page).
const cloudUrl = computed(() => {
  const base = String(config.public.apiBase || '');
  return base.startsWith('http') ? base.replace(/\/api\/?$/, '') : window.location.origin;
});
const envSnippet = computed(() => token.value ? [
  `TEGS_CENTER_ID=${token.value.center_id}`,
  `TEGS_CLOUD_GATEWAY_URL=${cloudUrl.value}`,
  `TEGS_EDGE_API_KEY=${token.value.value}`,
].join('\n') : '');

async function load() {
  if (!tenantId.value) return;
  loading.value = true;
  error.value = '';
  try {
    const [{ data: c }, { data: o }] = await Promise.all([
      apiFetch<{ centers: Center[] }>(`/centers${q()}`, { method: 'GET' }),
      apiFetch<any>(`/centers/options${q()}`, { method: 'GET' }),
    ]);
    centers.value = c.centers;
    options.value = o;
  } catch (e: any) {
    error.value = e?.data?.error || e?.message || 'Chargement impossible';
  } finally {
    loading.value = false;
  }
}

function openForm(c?: Center) {
  form.value = c
    ? { id: c.id, center_id: c.center_id, name: c.name, classroom_ids: [...c.classroom_ids], module_ids: [...c.module_ids], simulation_ids: [...c.simulation_ids] }
    : { id: null, center_id: '', name: '', classroom_ids: [], module_ids: [], simulation_ids: [] };
}

async function onSave() {
  saving.value = true;
  error.value = '';
  const f = form.value;
  const body: any = { name: f.name, classroom_ids: f.classroom_ids, module_ids: f.module_ids, simulation_ids: f.simulation_ids };
  try {
    if (f.id) {
      await apiFetch(`/centers/${f.id}`, { method: 'PATCH', body: JSON.stringify(body) });
    } else {
      body.center_id = f.center_id.trim().toUpperCase();
      if (auth.isSuperAdmin) body.tenant_id = tenantId.value;
      const { data } = await apiFetch<any>('/centers', { method: 'POST', body: JSON.stringify(body) });
      token.value = { center_id: data.center.center_id, value: data.token };
    }
    form.value = null;
    await load();
  } catch (e: any) {
    error.value = e?.data?.error || e?.message || 'Enregistrement impossible';
  } finally {
    saving.value = false;
  }
}

async function onRotate(c: Center) {
  if (!confirm(`Générer un nouveau jeton pour ${c.center_id} ? Le nœud cessera de se synchroniser tant que son .env.edge n'est pas mis à jour.`)) return;
  try {
    const { data } = await apiFetch<any>(`/centers/${c.id}/rotate-token`, { method: 'POST' });
    token.value = { center_id: c.center_id, value: data.token };
    await load();
  } catch (e: any) {
    error.value = e?.data?.error || e?.message || 'Rotation impossible';
  }
}

async function onToggle(c: Center) {
  try {
    await apiFetch(`/centers/${c.id}`, { method: 'PATCH', body: JSON.stringify({ isActive: !c.isActive }) });
    await load();
  } catch (e: any) {
    error.value = e?.data?.error || e?.message || 'Modification impossible';
  }
}

function copyEnv() {
  navigator.clipboard?.writeText(envSnippet.value).then(() => { copied.value = true; }).catch(() => {});
}

// Sante vue du cloud : depuis combien de temps le noeud ne s'est pas manifeste.
function health(c: Center) {
  if (!c.isActive) return { label: 'Désactivé', cls: 'bg-gray-100 text-gray-600' };
  if (!c.last_seen_at) return { label: 'Jamais connecté', cls: 'bg-gray-100 text-gray-600' };
  const minutes = (Date.now() - new Date(c.last_seen_at).getTime()) / 60000;
  if (minutes < 30) return { label: 'En ligne', cls: 'bg-green-100 text-green-800' };
  if (minutes < 24 * 60) return { label: 'Hors ligne (récent)', cls: 'bg-amber-100 text-amber-800' };
  return { label: 'Hors ligne', cls: 'bg-red-100 text-red-800' };
}

function ago(iso: string | null) {
  if (!iso) return '—';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  if (m < 48 * 60) return `il y a ${Math.round(m / 60)} h`;
  return `il y a ${Math.round(m / 1440)} j`;
}

onMounted(async () => {
  if (auth.isSuperAdmin) {
    try {
      tenants.value = (await $fetch<any>(`${config.public.apiBase}/tenants/public`)).tenants || [];
    } catch { /* liste vide */ }
  }
  await load();
});
</script>
