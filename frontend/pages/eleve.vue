<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50">
    <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900">
          Bonjour {{ home?.student.first_name || '' }}
        </h1>
        <p v-if="home?.student.matricule" class="text-xs text-gray-500 font-mono">{{ home.student.matricule }}</p>
      </div>
      <button @click="onLogout" class="text-sm text-gray-600 hover:text-red-600">Se déconnecter</button>
    </header>

    <main class="max-w-4xl mx-auto px-6 py-8 space-y-8">
      <div v-if="error" class="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{{ error }}</div>
      <div v-else-if="loading" class="text-center py-12 text-gray-500">Chargement...</div>

      <template v-else-if="home">
        <section>
          <h2 class="text-sm font-bold text-gray-500 uppercase mb-3">Mes cours</h2>
          <p v-if="!home.modules.length" class="text-sm text-gray-500 bg-white rounded-lg p-4 border">
            Aucun cours n'est encore ouvert. Votre enseignant vous dira quand commencer.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <NuxtLink
              v-for="m in home.modules"
              :key="m.id"
              :to="`/share/${m.share_token}`"
              class="block bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-400 hover:shadow transition"
            >
              <p class="font-bold text-gray-900">{{ m.title }}</p>
              <p v-if="m.description" class="text-xs text-gray-500 mt-1 line-clamp-2">{{ m.description }}</p>
            </NuxtLink>
          </div>
        </section>

        <section>
          <h2 class="text-sm font-bold text-gray-500 uppercase mb-3">Simulations 3D</h2>
          <NuxtLink
            to="/simulations"
            class="block bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-400 hover:shadow transition"
          >
            <p class="font-bold text-gray-900">Ouvrir le laboratoire de simulations</p>
            <p class="text-xs text-gray-500 mt-1">Manipuler les montages et pièces en 3D.</p>
          </NuxtLink>
        </section>

        <section v-if="home.classrooms.length">
          <h2 class="text-sm font-bold text-gray-500 uppercase mb-3">Mes classes</h2>
          <ul class="text-sm text-gray-700 space-y-1">
            <li v-for="c in home.classrooms" :key="c.id">{{ c.name }} <span class="text-gray-400 font-mono">· {{ c.code }}</span></li>
          </ul>
        </section>
      </template>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] });
useHead({ title: 'Mon espace | TEGS-Learning' });

interface StudentHome {
  student: { first_name: string; last_name: string; matricule: string | null };
  classrooms: { id: string; name: string; code: string; course_label?: string }[];
  modules: { id: string; title: string; description?: string; share_token: string }[];
}

const { apiFetch } = useApi();
const auth = useAuthStore();
const router = useRouter();
const home = ref<StudentHome | null>(null);
const loading = ref(true);
const error = ref('');

async function load() {
  try {
    const { data } = await apiFetch<StudentHome>('/student/home', { method: 'GET' });
    home.value = data;
  } catch (e: any) {
    // Personnel arrive ici par erreur : direction son espace habituel.
    if (e?.status === 403 || e?.statusCode === 403) return router.replace('/admin/modules');
    error.value = e?.data?.error || e?.message || 'Chargement impossible';
  } finally {
    loading.value = false;
  }
}

function onLogout() {
  auth.logout();
  router.push('/login');
}

onMounted(load);
</script>
