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

      <form @submit.prevent="handleLogin" class="space-y-4">
        <!-- Toggle SuperAdmin -->
        <div class="flex items-center justify-between">
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
        <div v-if="!isSuperAdmin">
          <label class="block text-sm font-medium text-gray-700 mb-1">Ecole</label>
          <select
            v-model="form.tenant_id"
            :required="!isSuperAdmin"
            class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white"
          >
            <option value="" disabled>Choisir votre ecole...</option>
            <option v-for="t in tenants" :key="t._id" :value="t._id">
              {{ t.name }}
            </option>
          </select>
          <p v-if="tenantsLoading" class="text-xs text-gray-400 mt-1">Chargement des ecoles...</p>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            v-model="form.email"
            type="email"
            required
            placeholder="votre@email.com"
            class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
          <input
            v-model="form.password"
            type="password"
            required
            placeholder="••••••"
            class="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
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

const isSuperAdmin = ref(false);
const form = reactive({
  tenant_id: '',
  email: '',
  password: '',
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
    const tenantId = isSuperAdmin.value ? undefined : form.tenant_id;
    if (!isSuperAdmin.value && !tenantId) {
      error.value = 'Veuillez selectionner une ecole';
      loading.value = false;
      return;
    }
    await auth.login(form.email.trim(), form.password, tenantId);
    router.push('/admin/modules');
  } catch (err: any) {
    error.value = err.data?.error || 'Erreur de connexion';
  } finally {
    loading.value = false;
  }
}

onMounted(() => fetchTenants());
</script>
