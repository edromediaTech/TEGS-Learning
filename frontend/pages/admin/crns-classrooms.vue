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

        <!-- Identifiants eleves : matricule + PIN (connexion hors ligne TEGS-Edge) -->
        <div class="flex gap-2 mt-4 pt-3 border-t border-gray-100">
          <button
            @click="openAdd(c)"
            class="flex-1 text-xs px-2 py-1.5 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700"
          >
            + Ajouter des élèves
          </button>
          <button
            @click="onRegenerate(c)"
            :disabled="!(c.student_ids || []).length || busy"
            class="flex-1 text-xs px-2 py-1.5 bg-white border border-indigo-300 text-indigo-700 rounded hover:bg-indigo-50 disabled:opacity-40"
          >
            Régénérer les PIN
          </button>
        </div>
      </div>
    </div>

    <!-- Fenetre : ajout d'eleves, puis fiche des identifiants -->
    <div v-if="modal" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <template v-if="modal.mode === 'add'">
          <h2 class="text-lg font-bold text-gray-900">Ajouter des élèves à « {{ modal.classroom.name }} »</h2>
          <p class="text-sm text-gray-500 mt-1 mb-3">
            Un élève par ligne : « Prénom ; Nom » (ou collez deux colonnes depuis un tableur).
            Chaque élève reçoit un matricule et un PIN à 6 chiffres.
          </p>
          <textarea
            v-model="namesText"
            rows="8"
            placeholder="Jean ; Baptiste&#10;Marie Rose ; Pierre"
            class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
          ></textarea>
          <p class="text-xs mt-1" :class="parsedError ? 'text-red-600' : 'text-gray-500'">
            {{ parsedError || `${parsedStudents.length} élève(s) prêt(s)` }}
          </p>
          <div class="flex gap-2 mt-4">
            <button
              @click="onAddStudents"
              :disabled="!parsedStudents.length || !!parsedError || busy"
              class="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {{ busy ? 'Création...' : 'Créer les identifiants' }}
            </button>
            <button @click="modal = null" class="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200">
              Annuler
            </button>
          </div>
        </template>

        <template v-else>
          <div class="p-3 mb-4 bg-amber-50 border border-amber-300 rounded text-sm text-amber-800">
            Les PIN ne sont affichés <strong>qu'une seule fois</strong>. Imprimez la fiche maintenant ;
            en cas de perte, utilisez « Régénérer les PIN ».
          </div>
          <div class="print-sheet">
            <h2 class="text-lg font-bold text-gray-900">Identifiants — {{ modal.classroom.name }}</h2>
            <p class="text-xs text-gray-500 mb-3">
              Connexion : page de connexion, onglet « Élève », choisir l'école, puis matricule et PIN.
            </p>
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="text-left text-xs uppercase text-gray-500 border-b">
                  <th class="py-1.5">Nom</th><th>Prénom</th><th>Matricule</th><th>PIN</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in modal.sheet" :key="s.id" class="border-b border-gray-100">
                  <td class="py-1.5 font-medium">{{ s.last_name }}</td>
                  <td>{{ s.first_name }}</td>
                  <td class="font-mono font-bold tracking-wider">{{ s.matricule }}</td>
                  <td class="font-mono font-bold tracking-widest">{{ s.pin }}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="flex gap-2 mt-4">
            <button @click="printSheet" class="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-md hover:bg-indigo-700">
              Imprimer la fiche
            </button>
            <button @click="closeSheet" class="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200">
              Fermer
            </button>
          </div>
        </template>
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

interface CredentialRow {
  id: string;
  first_name: string;
  last_name: string;
  matricule: string;
  pin: string;
}

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

// --- Identifiants eleves (matricule + PIN) ---
const modal = ref<{ mode: 'add' | 'sheet'; classroom: Classroom; sheet: CredentialRow[] } | null>(null);
const namesText = ref('');
const busy = ref(false);

// "Prenom ; Nom", tabulation (copie de tableur) ou, a defaut, premier mot = prenom.
const parsed = computed(() => {
  const students: { first_name: string; last_name: string }[] = [];
  const lines = namesText.value.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const [i, line] of lines.entries()) {
    const parts = /[;\t]/.test(line) ? line.split(/[;\t]/) : [line.split(/\s+/)[0], line.split(/\s+/).slice(1).join(' ')];
    const [first_name, last_name] = parts.map((p) => (p || '').trim());
    if (!first_name || !last_name) return { students, error: `Ligne ${i + 1} : prénom et nom requis` };
    students.push({ first_name, last_name });
  }
  if (students.length > 100) return { students, error: '100 élèves maximum à la fois' };
  return { students, error: '' };
});
const parsedStudents = computed(() => parsed.value.students);
const parsedError = computed(() => parsed.value.error);

function openAdd(c: Classroom) {
  namesText.value = '';
  modal.value = { mode: 'add', classroom: c, sheet: [] };
}

async function onAddStudents() {
  if (!modal.value) return;
  busy.value = true;
  error.value = null;
  try {
    const { data } = await apiFetch<{ students: CredentialRow[] }>(`/crns-classrooms/${modal.value.classroom._id}/students`, {
      method: 'POST',
      body: JSON.stringify({ students: parsedStudents.value }),
    });
    modal.value = { ...modal.value, mode: 'sheet', sheet: data.students };
  } catch (e: any) {
    error.value = e?.data?.error || e?.message || 'Création des élèves impossible';
    modal.value = null;
  } finally {
    busy.value = false;
  }
}

async function onRegenerate(c: Classroom) {
  if (!confirm(`Régénérer les PIN des ${c.student_ids.length} élève(s) de "${c.name}" ? Les anciens PIN ne fonctionneront plus.`)) return;
  busy.value = true;
  error.value = null;
  try {
    const { data } = await apiFetch<{ students: CredentialRow[] }>(`/crns-classrooms/${c._id}/credentials`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    modal.value = { mode: 'sheet', classroom: c, sheet: data.students };
  } catch (e: any) {
    error.value = e?.data?.error || e?.message || 'Régénération impossible';
  } finally {
    busy.value = false;
  }
}

function printSheet() {
  window.print();
}

async function closeSheet() {
  modal.value = null;
  await load();
}

onMounted(load);
</script>

<style>
/* Impression : seule la fiche des identifiants. */
@media print {
  body * { visibility: hidden; }
  .print-sheet, .print-sheet * { visibility: visible; }
  .print-sheet { position: absolute; left: 0; top: 0; width: 100%; padding: 16px; }
}
</style>
