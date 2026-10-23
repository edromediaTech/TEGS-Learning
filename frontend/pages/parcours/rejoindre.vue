<template>
  <div class="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 flex items-center justify-center px-4">
    <div class="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Rejoindre une classe</h1>
      <p class="text-sm text-gray-600 mb-6">
        Saisis le code que ton enseignant t'a donné pour t'inscrire à la classe.
      </p>

      <form @submit.prevent="onJoin" class="space-y-4">
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Code de la classe</label>
          <input
            v-model="code"
            type="text"
            placeholder="CL-XXXX"
            maxlength="10"
            class="w-full border-2 border-indigo-200 rounded-md px-3 py-3 text-lg font-mono uppercase tracking-widest text-center focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            required
          />
        </div>

        <button
          type="submit"
          :disabled="!code || joining"
          class="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-blue-500 text-white text-base font-bold rounded-md hover:from-indigo-700 hover:to-blue-600 disabled:opacity-50"
        >
          {{ joining ? 'Inscription...' : 'Rejoindre' }}
        </button>
      </form>

      <!-- Resultats -->
      <div v-if="joined" class="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-900">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xl">✅</span>
          <span class="font-bold">{{ alreadyMember ? 'Déjà inscrit' : 'Inscription réussie' }}</span>
        </div>
        <p class="text-sm">
          Tu es maintenant inscrit à la classe <strong>{{ joinedClassroom?.name }}</strong>
          ({{ joinedClassroom?.course_label || joinedClassroom?.course_id }}).
        </p>
        <NuxtLink
          to="/parcours/depannage-smartphone"
          class="inline-block mt-3 px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded hover:bg-green-700"
        >
          Aller au parcours →
        </NuxtLink>
      </div>

      <div v-if="error" class="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        ❌ {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] });

const route = useRoute();
const { apiFetch } = useApi();

const code = ref(String(route.query.code || '').toUpperCase());
const joining = ref(false);
const joined = ref(false);
const alreadyMember = ref(false);
const joinedClassroom = ref<any>(null);
const error = ref<string | null>(null);

async function onJoin() {
  joining.value = true;
  joined.value = false;
  error.value = null;
  try {
    const codeUp = code.value.trim().toUpperCase();
    const { data } = await apiFetch<{ joined: boolean; already_member: boolean; classroom: any }>(
      `/crns-classrooms/${encodeURIComponent(codeUp)}/join`,
      { method: 'POST' },
    );
    joined.value = data.joined;
    alreadyMember.value = data.already_member;
    joinedClassroom.value = data.classroom;
  } catch (e: any) {
    error.value = e?.data?.error || e?.message || 'Code invalide ou classe archivée';
  } finally {
    joining.value = false;
  }
}

// Auto-join si ?code= dans l'URL
onMounted(() => {
  if (route.query.code) onJoin();
});
</script>
