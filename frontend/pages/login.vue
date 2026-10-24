<template>
  <div class="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900">
    <div class="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
      <div class="flex justify-center mb-4">
        <img src="/logo.png" alt="TEGS Learning" class="h-16 w-16 rounded-lg" />
      </div>
      <h1 class="text-2xl font-bold text-center text-primary-800 mb-1">TEGS-Learning</h1>
      <p class="text-center text-gray-500 mb-6 text-sm">Connexion au LCMS</p>

      <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
        {{ error }}
      </div>

      <!-- Eleve (matricule + PIN) ou personnel (e-mail) -->
      <div class="grid grid-cols-2 gap-1 p-1 mb-5 bg-gray-100 rounded-lg text-sm font-medium">
        <button
          type="button"
          @click="mode = 'student'"
          :class="mode === 'student' ? 'bg-white shadow text-primary-700' : 'text-gray-500'"
          class="py-2 rounded-md transition"
        >
          Élève
        </button>
        <button
          type="button"
          @click="mode = 'staff'"
          :class="mode === 'staff' ? 'bg-white shadow text-primary-700' : 'text-gray-500'"
          class="py-2 rounded-md transition"
        >
          Personnel
        </button>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-4">
        <!-- Toggle SuperAdmin -->
        <div v-if="mode === 'staff'" class="flex items-center justify-between">
          <label class="text-sm text-gray-600">Connexion SuperAdmin</label>
          <button
            type="button"
            @click="isSuperAdmin = !isSuperAdmin"
            :class="isSuperAdmin ? 'bg-primary-600' : 'bg-gray-300'"
            class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
          >
            <span
              :class="isSuperAdmin ? 'translate-x-6' : 'translate-x-1'"
              class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
            />
          </button>
        </div>

        <!-- Selecteur d'ecole -->
        <div v-if="mode === 'student' || !isSuperAdmin">
          <label class="block text-sm font-medium text-gray-700 mb-1">Ecole</label>
          <select
            v-model="form.tenant_id"
            :required="mode === 'student' || !isSuperAdmin"
            class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            <option value="" disabled>Choisir votre ecole...</option>
            <option v-for="t in tenants" :key="t._id" :value="t._id">
              {{ t.name }}
            </option>
          </select>
          <p v-if="tenantsLoading" class="text-xs text-gray-400 mt-1">Chargement des ecoles...</p>
        </div>

        <template v-if="mode === 'student'">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Matricule</label>
            <input
              v-model="form.matricule"
              type="text"
              required
              autocomplete="username"
              autocapitalize="characters"
              spellcheck="false"
              placeholder="XXXX-XXXX"
              maxlength="9"
              class="w-full px-3 py-2.5 border border-gray-300 rounded-lg font-mono uppercase tracking-widest focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">PIN</label>
            <input
              v-model="form.pin"
              type="password"
              required
              inputmode="numeric"
              autocomplete="current-password"
              pattern="[0-9]{6}"
              maxlength="6"
              placeholder="6 chiffres"
              class="w-full px-3 py-2.5 border border-gray-300 rounded-lg font-mono tracking-widest focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p class="text-xs text-gray-400 mt-1">Matricule et PIN sont donnés par votre enseignant.</p>
          </div>
        </template>

        <template v-else>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            v-model="form.email"
            type="email"
            :required="mode === 'staff'"
            placeholder="votre@email.com"
            class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
          <input
            v-model="form.password"
            type="password"
            :required="mode === 'staff'"
            placeholder="••••••"
            class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        </template>
        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-primary-600 text-white py-2.5 rounded-lg hover:bg-primary-700 transition disabled:opacity-50 font-medium"
        >
          {{ loading ? 'Connexion...' : 'Se connecter' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
const auth = useAuthStore();
const router = useRouter();
const config = useRuntimeConfig();
const apiBase = config.public.apiBase;

const mode = ref<'student' | 'staff'>('student');
const isSuperAdmin = ref(false);
const form = reactive({
  tenant_id: '',
  email: '',
  password: '',
  matricule: '',
  pin: '',
});
const loading = ref(false);
const error = ref('');

// Chargement des ecoles
interface TenantPublic { _id: string; name: string; }
const tenants = ref<TenantPublic[]>([]);
const tenantsLoading = ref(true);

async function fetchTenants() {
  tenantsLoading.value = true;
  try {
    const res = await $fetch<any>(`${apiBase}/tenants/public`);
    tenants.value = res.tenants || [];
  } catch {
    tenants.value = [];
  } finally {
    tenantsLoading.value = false;
  }
}

async function handleLogin() {
  loading.value = true;
  error.value = '';
  try {
    if (mode.value === 'student') {
      if (!form.tenant_id) {
        error.value = 'Veuillez selectionner une ecole';
        return;
      }
      await auth.loginPin(form.tenant_id, form.matricule.trim().toUpperCase(), form.pin.trim());
      router.push('/eleve');
      return;
    }
    const tenantId = isSuperAdmin.value ? undefined : form.tenant_id;
    if (!isSuperAdmin.value && !tenantId) {
      error.value = 'Veuillez selectionner une ecole';
      loading.value = false;
      return;
    }
    await auth.login(form.email.trim(), form.password, tenantId);
    router.push('/admin/modules');
  } catch (err: any) {
    error.value = err.data?.error || err.data?.errors?.[0]?.msg || 'Erreur de connexion';
  } finally {
    loading.value = false;
  }
}

// Dernier onglet utilise sur ce poste (un poste de salle reste en mode eleve).
const MODE_KEY = 'tegs-login-mode';
watch(mode, (m) => {
  try { localStorage.setItem(MODE_KEY, m); } catch {}
});

onMounted(() => {
  try {
    const saved = localStorage.getItem(MODE_KEY);
    if (saved === 'staff' || saved === 'student') mode.value = saved;
  } catch {}
  fetchTenants();
});
</script>
