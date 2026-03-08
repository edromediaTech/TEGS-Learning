<template>
  <div>
    <NuxtLayout name="admin">
      <!-- Loading -->
      <div v-if="store.loading && !store.current" class="text-center py-12 text-gray-500">
        Chargement du module...
      </div>

      <!-- Erreur -->
      <div v-else-if="store.error && !store.current" class="text-center py-12">
        <p class="text-red-500 mb-4">{{ store.error }}</p>
        <NuxtLink to="/admin/modules" class="text-primary-600 hover:text-primary-800">
          Retour aux modules
        </NuxtLink>
      </div>

      <!-- Contenu -->
      <div v-else-if="store.current">
        <!-- Header -->
        <div class="flex items-center justify-between mb-8">
          <div>
            <NuxtLink to="/admin/modules" class="text-sm text-primary-600 hover:text-primary-800 mb-2 inline-block">
              &larr; Retour aux modules
            </NuxtLink>
            <h1 class="text-2xl font-bold text-gray-900">{{ store.current.title }}</h1>
            <p class="text-gray-500 mt-1">Structure du cours : Chapitres &amp; Ecrans</p>
          </div>
          <div class="flex items-center space-x-3">
            <span
              class="px-3 py-1 text-sm rounded-full"
              :class="store.current.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'"
            >
              {{ store.current.status === 'published' ? 'Publie' : 'Brouillon' }}
            </span>
            <button
              @click="saveStructure"
              :disabled="saving"
              class="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
            >
              {{ saving ? 'Sauvegarde...' : 'Sauvegarder' }}
            </button>
          </div>
        </div>

        <!-- Message de succes -->
        <div v-if="saved" class="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          Structure sauvegardee avec succes !
        </div>

        <!-- Erreur -->
        <div v-if="store.error" class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {{ store.error }}
        </div>

        <!-- Bouton ajouter chapitre -->
        <button
          @click="addSection"
          class="mb-6 w-full border-2 border-dashed border-gray-300 text-gray-500 py-3 rounded-lg hover:border-primary-400 hover:text-primary-600 transition"
        >
          + Ajouter un chapitre
        </button>

        <!-- Liste des sections -->
        <div v-if="sections.length === 0" class="text-center py-8 text-gray-400">
          Aucun chapitre. Cliquez sur le bouton ci-dessus pour commencer.
        </div>

        <div class="space-y-4">
          <div
            v-for="(section, sIdx) in sections"
            :key="sIdx"
            class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
          >
            <!-- Header de section -->
            <div class="bg-gray-50 px-5 py-3 flex items-center justify-between border-b border-gray-200">
              <div class="flex items-center space-x-3 flex-1">
                <span class="text-sm font-bold text-primary-600">{{ sIdx + 1 }}.</span>
                <input
                  v-if="section.editing"
                  v-model="section.title"
                  @keyup.enter="section.editing = false"
                  @blur="section.editing = false"
                  class="flex-1 px-2 py-1 border border-primary-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  ref="sectionInput"
                />
                <span v-else class="font-semibold text-gray-800 cursor-pointer" @click="section.editing = true">
                  {{ section.title }}
                </span>
              </div>
              <div class="flex items-center space-x-2">
                <button
                  @click="section.editing = !section.editing"
                  class="text-gray-400 hover:text-primary-600 transition text-sm px-2"
                  :title="section.editing ? 'Valider' : 'Renommer'"
                >
                  {{ section.editing ? 'OK' : 'Renommer' }}
                </button>
                <button
                  v-if="sIdx > 0"
                  @click="moveSection(sIdx, -1)"
                  class="text-gray-400 hover:text-gray-600 transition px-1"
                  title="Monter"
                >
                  &uarr;
                </button>
                <button
                  v-if="sIdx < sections.length - 1"
                  @click="moveSection(sIdx, 1)"
                  class="text-gray-400 hover:text-gray-600 transition px-1"
                  title="Descendre"
                >
                  &darr;
                </button>
                <button
                  @click="removeSection(sIdx)"
                  class="text-red-400 hover:text-red-600 transition text-sm px-2"
                >
                  Supprimer
                </button>
              </div>
            </div>

            <!-- Ecrans de la section -->
            <div class="p-4">
              <div v-if="section.screens.length === 0" class="text-sm text-gray-400 mb-3">
                Aucun ecran dans ce chapitre
              </div>

              <div class="space-y-2 mb-3">
                <div
                  v-for="(screen, scIdx) in section.screens"
                  :key="scIdx"
                  class="flex items-center space-x-3 bg-gray-50 rounded-lg px-4 py-2 group"
                >
                  <span class="text-xs text-gray-400 w-8">{{ sIdx + 1 }}.{{ scIdx + 1 }}</span>
                  <input
                    v-if="screen.editing"
                    v-model="screen.title"
                    @keyup.enter="screen.editing = false"
                    @blur="screen.editing = false"
                    class="flex-1 px-2 py-1 border border-primary-300 rounded focus:ring-2 focus:ring-primary-500 text-sm"
                  />
                  <span v-else class="flex-1 text-sm text-gray-700 cursor-pointer" @click="screen.editing = true">
                    {{ screen.title }}
                  </span>
                  <div class="flex items-center space-x-1">
                    <NuxtLink
                      v-if="screen._id"
                      :to="`/admin/modules/${moduleId}/screens/${screen._id}`"
                      class="text-xs bg-primary-50 text-primary-600 hover:bg-primary-100 px-2 py-1 rounded font-medium"
                    >
                      Contenu
                    </NuxtLink>
                    <span v-else class="text-xs text-orange-500 italic">Sauvegarder d'abord</span>
                    <button
                      @click="screen.editing = !screen.editing"
                      class="text-xs text-gray-400 hover:text-primary-600 px-1"
                    >
                      {{ screen.editing ? 'OK' : 'Renommer' }}
                    </button>
                    <button
                      v-if="scIdx > 0"
                      @click="moveScreen(sIdx, scIdx, -1)"
                      class="text-xs text-gray-400 hover:text-gray-600 px-1"
                    >
                      &uarr;
                    </button>
                    <button
                      v-if="scIdx < section.screens.length - 1"
                      @click="moveScreen(sIdx, scIdx, 1)"
                      class="text-xs text-gray-400 hover:text-gray-600 px-1"
                    >
                      &darr;
                    </button>
                    <button
                      @click="removeScreen(sIdx, scIdx)"
                      class="text-xs text-red-400 hover:text-red-600 px-1"
                    >
                      Suppr.
                    </button>
                  </div>
                </div>
              </div>

              <button
                @click="addScreen(sIdx)"
                class="w-full text-sm border border-dashed border-gray-300 text-gray-400 py-2 rounded-lg hover:border-primary-400 hover:text-primary-600 transition"
              >
                + Ajouter un ecran
              </button>
            </div>
          </div>
        </div>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' });

const route = useRoute();
const store = useModulesStore();

const saving = ref(false);
const saved = ref(false);

interface EditableScreen {
  _id?: string;
  title: string;
  order: number;
  editing: boolean;
}

interface EditableSection {
  _id?: string;
  title: string;
  order: number;
  screens: EditableScreen[];
  editing: boolean;
}

const sections = ref<EditableSection[]>([]);

function loadSections() {
  if (!store.current) return;
  sections.value = (store.current.sections || []).map((s, i) => ({
    _id: s._id,
    title: s.title,
    order: s.order ?? i,
    editing: false,
    screens: (s.screens || []).map((sc, j) => ({
      _id: sc._id,
      title: sc.title,
      order: sc.order ?? j,
      editing: false,
    })),
  }));
}

function addSection() {
  sections.value.push({
    title: `Chapitre ${sections.value.length + 1}`,
    order: sections.value.length,
    editing: true,
    screens: [],
  });
}

function removeSection(idx: number) {
  sections.value.splice(idx, 1);
  reorder();
}

function moveSection(idx: number, dir: number) {
  const target = idx + dir;
  const temp = sections.value[idx];
  sections.value[idx] = sections.value[target];
  sections.value[target] = temp;
  reorder();
}

function addScreen(sIdx: number) {
  const section = sections.value[sIdx];
  section.screens.push({
    title: `Ecran ${section.screens.length + 1}`,
    order: section.screens.length,
    editing: true,
  });
}

function removeScreen(sIdx: number, scIdx: number) {
  sections.value[sIdx].screens.splice(scIdx, 1);
  reorder();
}

function moveScreen(sIdx: number, scIdx: number, dir: number) {
  const screens = sections.value[sIdx].screens;
  const target = scIdx + dir;
  const temp = screens[scIdx];
  screens[scIdx] = screens[target];
  screens[target] = temp;
  reorder();
}

function reorder() {
  sections.value.forEach((s, i) => {
    s.order = i;
    s.screens.forEach((sc, j) => {
      sc.order = j;
    });
  });
}

async function saveStructure() {
  if (!store.current) return;
  saving.value = true;
  saved.value = false;
  try {
    const payload = sections.value.map((s, i) => ({
      ...(s._id ? { _id: s._id } : {}),
      title: s.title,
      order: i,
      screens: s.screens.map((sc, j) => ({
        ...(sc._id ? { _id: sc._id } : {}),
        title: sc.title,
        order: j,
      })),
    }));
    await store.updateStructure(store.current._id, payload);
    // Recharger le module pour obtenir les _id generes
    await store.fetchModule(moduleId);
    loadSections();
    saved.value = true;
    setTimeout(() => { saved.value = false; }, 3000);
  } catch {
    // error in store
  } finally {
    saving.value = false;
  }
}

const moduleId = route.params.id as string;

onMounted(async () => {
  await store.fetchModule(moduleId);
  loadSections();
});
</script>
