<template>
  <NuxtLayout name="admin">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-extrabold bg-gradient-to-r from-indigo-700 to-blue-500 bg-clip-text text-transparent">
          Mes Classes CRNS
        </h1>
        <p class="text-gray-500 mt-1">
          Crée une instance d'un cours maître pour ta cohorte. Partage le code aux élèves pour qu'ils rejoignent.
        </p>
      </div>
      <button
        @click="showCreateForm = true"
        class="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-500 text-white text-sm font-bold rounded-md hover:from-indigo-700 hover:to-blue-600 shadow"
      >
        + Nouvelle classe
      </button>
    </div>

    <!-- Form de creation -->
    <div v-if="showCreateForm" class="bg-white rounded-xl shadow p-5 mb-6 border-2 border-indigo-200">
      <h2 class="text-lg font-bold text-gray-900 mb-3">Créer une nouvelle classe</h2>
      <form @submit.prevent="onCreate" class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Nom de la classe</label>
          <input
            v-model="newName"
            type="text"
            placeholder="Ex: Promo 2026 - Fort-Liberté"
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            required
          />
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-700 mb-1">Cours maître</label>
          <select
            v-model="newCourseId"
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            required
          >
            <option v-for="c in availableCourses" :key="c.id" :value="c.id">
              {{ c.label }}
            </option>
          </select>
        </div>
        <div class="flex gap-2">
          <button
            type="submit"
            :disabled="!newName || creating"
            class="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {{ creating ? 'Création...' : 'Créer' }}
          </button>
          <button
            type="button"
            @click="showCreateForm = false"
            class="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>

    <!-- Erreur -->
    <div v-if="error" class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
      {{ error }}
    </div>

    <!-- Liste des classes -->
    <div v-if="loading" class="text-center py-12 text-gray-500">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mb-3"></div>
      <p>Chargement...</p>
    </div>
    <div v-else-if="!classrooms.length" class="bg-white rounded-xl shadow p-8 text-center text-gray-500">
      <p class="text-base">Tu n'as pas encore créé de classe.</p>
      <p class="text-sm mt-1">Clique sur "Nouvelle classe" pour démarrer ta première cohorte.</p>
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="c in classrooms"
        :key="c._id"
        class="bg-white rounded-xl shadow p-5 border border-gray-200 hover:shadow-md transition-shadow"
      >
        <div class="flex items-start justify-between mb-2">
          <div class="min-w-0 flex-1">
            <h3 class="text-base font-bold text-gray-900 truncate">{{ c.name }}</h3>
            <p class="text-xs text-gray-500 mt-0.5">{{ c.course_label || c.course_id }}</p>
          </div>
          <button
            @click="onArchive(c)"
            class="ml-2 text-xs text-red-500 hover:underline"
            title="Archiver"
          >
            Archiver
          </button>
        </div>

        <!-- Code partageable -->
        <div class="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-md p-3 my-3 border border-indigo-200">
          <p class="text-[10px] uppercase font-bold text-indigo-700">Code à partager aux élèves</p>
          <div class="flex items-center justify-between mt-1">
            <span class="text-2xl font-mono font-extrabold text-indigo-900">{{ c.code }}</span>
            <button
              @click="copyCode(c.code)"
              class="text-xs px-2 py-1 bg-white border border-indigo-300 rounded hover:bg-indigo-100"
            >
              📋 Copier
            </button>
          </div>
          <p class="text-[10px] text-indigo-600 mt-2 break-all">
            {{ joinUrl(c.code) }}
          </p>
        </div>

        <!-- Stats -->
        <div class="flex items-center justify-between text-sm">
          <div>
            <span class="text-gray-500 text-xs">Élèves</span>
            <p class="font-bold text-gray-900">{{ (c.student_ids || []).length }}</p>
          </div>
          <div class="text-right">
            <span class="text-gray-500 text-xs">Créée le</span>
            <p class="text-gray-700 text-xs">{{ formatDate(c.created_at) }}</p>
          </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>

<script setup lang="ts">
definePageMeta({ middleware: ['auth'] });

interface Classroom {
  _id: string;
  course_id: string;
  course_label?: string;
  name: string;
  code: string;
  student_ids: string[];
  created_at: string;
}

const { apiFetch } = useApi();

const availableCourses = [
  { id: 'depannage_smartphone_v1', label: 'Dépannage Smartphone (Sécurité + Loi d\'Ohm + Anatomie + Assemblage)' },
];

const classrooms = ref<Classroom[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const showCreateForm = ref(false);
const newName = ref('');
const newCourseId = ref(availableCourses[0].id);
const creating = ref(false);

async function load() {
  loading.value = true;
  error.value = null;
  try {
    const { data } = await apiFetch<{ classrooms: Classroom[] }>('/crns-classrooms', { method: 'GET' });
    classrooms.value = data.classrooms || [];
  } catch (e: any) {
    error.value = e?.data?.error || e?.message || 'Erreur de chargement';
  } finally {
    loading.value = false;
  }
}

async function onCreate() {
  creating.value = true;
  error.value = null;
  try {
    const course = availableCourses.find((c) => c.id === newCourseId.value);
    await apiFetch('/crns-classrooms', {
      method: 'POST',
      body: JSON.stringify({
        course_id: newCourseId.value,
        course_label: course?.label,
        name: newName.value.trim(),
      }),
    });
    newName.value = '';
    showCreateForm.value = false;
    await load();
  } catch (e: any) {
    error.value = e?.data?.error || e?.message || 'Création impossible';
  } finally {
    creating.value = false;
  }
}

async function onArchive(c: Classroom) {
  if (!confirm(`Archiver la classe "${c.name}" ? Les élèves perdent l'accès.`)) return;
  try {
    await apiFetch(`/crns-classrooms/${c._id}`, { method: 'DELETE' });
    await load();
  } catch (e: any) {
    error.value = e?.data?.error || e?.message || 'Erreur archive';
  }
}

function joinUrl(code: string): string {
  if (typeof window === 'undefined') return `/parcours/rejoindre?code=${code}`;
  return `${window.location.origin}/parcours/rejoindre?code=${code}`;
}

function copyCode(code: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return;
  navigator.clipboard.writeText(code).catch(() => {});
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return iso; }
}

onMounted(load);
</script>
