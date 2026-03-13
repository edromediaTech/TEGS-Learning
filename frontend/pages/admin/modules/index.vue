<template>
  <div>
    <NuxtLayout name="admin">
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-extrabold bg-gradient-to-r from-primary-700 to-primary-500 bg-clip-text text-transparent">Mes Modules</h1>
          <p class="text-gray-500 mt-1">Creez et gerez vos formations pedagogiques</p>
        </div>
        <button
          @click="wizardStep = 1; resetWizard()"
          class="bg-gradient-to-r from-primary-600 to-blue-500 text-white px-6 py-3 rounded-xl hover:from-primary-700 hover:to-blue-600 transition-all shadow-lg hover:shadow-xl flex items-center space-x-2 font-bold"
        >
          <span class="text-xl">+</span>
          <span>Creer un module</span>
        </button>
      </div>

      <!-- Erreur -->
      <div v-if="store.error" class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
        {{ store.error }}
      </div>

      <!-- Loading -->
      <div v-if="store.loading" class="text-center py-12 text-gray-500">
        Chargement...
      </div>

      <!-- Liste vide -->
      <div v-else-if="store.modules.length === 0" class="text-center py-12">
        <div class="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <span class="text-3xl text-primary-400">+</span>
        </div>
        <p class="text-gray-400 text-lg mb-4">Aucun module pour le moment</p>
        <button
          @click="wizardStep = 1; resetWizard()"
          class="text-primary-600 hover:text-primary-800 font-medium"
        >
          Creer votre premier module
        </button>
      </div>

      <!-- Grille de modules -->
      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div
          v-for="mod in store.modules"
          :key="mod._id"
          class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group"
        >
          <!-- Barre theme gradient -->
          <div class="h-24 relative overflow-hidden" :style="{ background: `linear-gradient(135deg, ${themeColors[mod.theme || 'ddene']}, ${themeColors[mod.theme || 'ddene']}88)` }">
            <div class="absolute inset-0 bg-black/10"></div>
            <div class="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white"></div>
            <div class="absolute top-3 right-3 flex items-center space-x-1">
              <span
                class="px-2.5 py-1 text-[10px] font-bold rounded-full backdrop-blur-sm"
                :class="mod.status === 'published' ? 'bg-green-500/90 text-white' : 'bg-white/90 text-gray-700'"
              >
                {{ mod.status === 'published' ? 'PUBLIE' : 'BROUILLON' }}
              </span>
              <span v-if="mod.shareEnabled" class="px-2.5 py-1 text-[10px] font-bold rounded-full bg-blue-500/90 text-white backdrop-blur-sm">
                PARTAGE
              </span>
            </div>
            <div class="absolute top-3 left-3">
              <span class="text-3xl opacity-30 text-white">&#128218;</span>
            </div>
          </div>

          <div class="p-5 -mt-6 relative">
            <h3 class="text-lg font-bold text-gray-900 mb-1">{{ mod.title }}</h3>
            <p class="text-sm text-gray-500 mb-4 line-clamp-2">
              {{ mod.description || 'Aucune description' }}
            </p>

            <!-- Stats -->
            <div class="flex items-center text-xs mb-4 space-x-3">
              <span class="flex items-center space-x-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-full">
                <span>&#128196;</span>
                <span class="font-medium">{{ mod.sections?.length || 0 }} chap.</span>
              </span>
              <span class="flex items-center space-x-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                <span>&#128187;</span>
                <span class="font-medium">{{ countScreens(mod) }} ecrans</span>
              </span>
              <span class="px-2 py-1 rounded-full font-bold text-[10px]" :style="{ background: themeColors[mod.theme || 'ddene'] + '15', color: themeColors[mod.theme || 'ddene'] }">
                {{ mod.language?.toUpperCase() }}
              </span>
            </div>

            <!-- Actions -->
            <div class="flex items-center space-x-2">
              <NuxtLink
                :to="`/admin/modules/${mod._id}/structure`"
                class="flex-1 text-center bg-gradient-to-r from-primary-500 to-primary-600 text-white px-3 py-2.5 rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all text-sm font-bold shadow-sm"
              >
                Ouvrir le Studio
              </NuxtLink>
              <NuxtLink
                :to="`/admin/modules/${mod._id}/reporting`"
                class="px-3 py-2.5 text-purple-400 hover:bg-purple-50 hover:text-purple-600 rounded-xl transition text-sm"
                title="Reporting"
              >
                &#128202;
              </NuxtLink>
              <NuxtLink
                :to="`/admin/modules/${mod._id}/settings`"
                class="px-3 py-2.5 text-gray-500 hover:bg-gray-100 rounded-xl transition text-sm"
                title="Configuration"
              >
                &#9881;
              </NuxtLink>
              <button
                @click="confirmDelete(mod)"
                class="px-3 py-2.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition text-sm"
              >
                &#128465;
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== WIZARD DE CREATION (3 etapes) ===== -->
      <div v-if="wizardStep > 0" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden">
          <!-- Header Wizard -->
          <div class="bg-primary-700 text-white px-6 py-4">
            <p class="text-sm text-primary-200">Creer un nouveau module de formation</p>
            <div class="flex items-center justify-between mt-3">
              <div v-for="s in 3" :key="s" class="flex items-center" :class="s < 3 ? 'flex-1' : ''">
                <div
                  class="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition"
                  :class="s <= wizardStep ? 'bg-white text-primary-700 border-white' : 'border-primary-400 text-primary-300'"
                >
                  {{ s }}
                </div>
                <div v-if="s < 3" class="flex-1 h-0.5 mx-2" :class="s < wizardStep ? 'bg-white' : 'bg-primary-500'"></div>
              </div>
            </div>
            <div class="flex justify-between mt-2 text-xs text-primary-200">
              <span>CHOISISSEZ</span>
              <span>APPLIQUEZ</span>
              <span>CREEZ</span>
            </div>
          </div>

          <!-- Etape 1 : Nom & Description -->
          <div v-if="wizardStep === 1" class="p-6 space-y-4">
            <h3 class="text-lg font-bold text-gray-900">Etape 1 : Nom et description du module</h3>
            <!-- SuperAdmin: tenant selector -->
            <div v-if="auth.isSuperAdmin">
              <label class="block text-sm font-medium text-gray-700 mb-1">Ecole *</label>
              <select
                v-model="createForm.tenant_id"
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="" disabled>Choisir une ecole</option>
                <option v-for="t in tenantsList" :key="t._id" :value="t._id">{{ t.name }} ({{ t.code }})</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Titre du module *</label>
              <input
                v-model="createForm.title"
                type="text"
                required
                placeholder="Ex: Francais 1ere Annee"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-lg"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                v-model="createForm.description"
                rows="3"
                placeholder="Description du module..."
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              ></textarea>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Langue</label>
              <select
                v-model="createForm.language"
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="fr">Francais</option>
                <option value="ht">Creole Haitien</option>
                <option value="en">Anglais</option>
              </select>
            </div>
            <div class="flex justify-between pt-4">
              <button @click="wizardStep = 0" class="px-4 py-2 text-gray-500 hover:text-gray-700">Annuler</button>
              <button
                @click="wizardStep = 2"
                :disabled="!createForm.title.trim() || (auth.isSuperAdmin && !createForm.tenant_id)"
                class="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium"
              >
                Suivant &rarr;
              </button>
            </div>
          </div>

          <!-- Etape 2 : Theme graphique -->
          <div v-if="wizardStep === 2" class="p-6 space-y-4">
            <h3 class="text-lg font-bold text-gray-900">Etape 2 : Choisir un theme graphique</h3>
            <p class="text-sm text-gray-500">Selectionnez un habillage visuel pour votre module</p>
            <div class="grid grid-cols-3 gap-3">
              <button
                v-for="t in themes"
                :key="t.id"
                @click="createForm.theme = t.id"
                class="rounded-xl border-2 overflow-hidden transition hover:shadow-md"
                :class="createForm.theme === t.id ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200'"
              >
                <!-- Mini preview du theme -->
                <div class="h-8" :style="{ background: t.headerBg }"></div>
                <div class="p-3" :style="{ background: t.bodyBg }">
                  <div class="h-2 rounded-full mb-1.5" :style="{ background: t.primary, width: '60%' }"></div>
                  <div class="h-1.5 rounded-full mb-1" :style="{ background: t.bodyText + '33', width: '90%' }"></div>
                  <div class="h-1.5 rounded-full" :style="{ background: t.bodyText + '22', width: '70%' }"></div>
                </div>
                <div class="px-3 py-2 text-xs font-medium text-center" :class="createForm.theme === t.id ? 'text-primary-700 bg-primary-50' : 'text-gray-600'">
                  {{ t.name }}
                </div>
              </button>
            </div>
            <div class="flex justify-between pt-4">
              <button @click="wizardStep = 1" class="px-4 py-2 text-gray-500 hover:text-gray-700">&larr; Retour</button>
              <button
                @click="wizardStep = 3"
                class="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 font-medium"
              >
                Suivant &rarr;
              </button>
            </div>
          </div>

          <!-- Etape 3 : Confirmation & Lancement -->
          <div v-if="wizardStep === 3" class="p-6 space-y-4">
            <h3 class="text-lg font-bold text-gray-900">Etape 3 : Confirmation et creation</h3>
            <div class="bg-gray-50 rounded-xl p-4 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-500">Titre</span>
                <span class="font-medium">{{ createForm.title }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-500">Description</span>
                <span class="text-sm text-gray-700">{{ createForm.description || '(aucune)' }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-500">Langue</span>
                <span class="text-sm">{{ { fr: 'Francais', ht: 'Creole Haitien', en: 'Anglais' }[createForm.language] }}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-sm text-gray-500">Theme</span>
                <span class="px-2 py-0.5 rounded text-xs font-medium" :style="{ background: themeColors[createForm.theme] + '22', color: themeColors[createForm.theme] }">
                  {{ themeNames[createForm.theme] }}
                </span>
              </div>
            </div>
            <div class="flex justify-between pt-4">
              <button @click="wizardStep = 2" class="px-4 py-2 text-gray-500 hover:text-gray-700">&larr; Retour</button>
              <button
                @click="handleCreate"
                :disabled="creating"
                class="bg-green-600 text-white px-8 py-2.5 rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-bold text-lg"
              >
                {{ creating ? 'Creation...' : 'CREER' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal de confirmation suppression -->
      <div v-if="moduleToDelete" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
          <h2 class="text-xl font-bold text-gray-900 mb-2">Supprimer ce module ?</h2>
          <p class="text-gray-500 mb-6">
            Le module "{{ moduleToDelete.title }}" sera definitivement supprime.
          </p>
          <div class="flex justify-end space-x-3">
            <button
              @click="moduleToDelete = null"
              class="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
            >
              Annuler
            </button>
            <button
              @click="handleDelete"
              class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
            >
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import type { Module, ThemeId } from '~/stores/modules';

definePageMeta({ middleware: 'auth' });

const router = useRouter();
const store = useModulesStore();
const auth = useAuthStore();
const { apiFetch } = useApi();
const wizardStep = ref(0);
const creating = ref(false);
const moduleToDelete = ref<Module | null>(null);
const tenantsList = ref<any[]>([]);

const themes = [
  { id: 'ddene' as ThemeId, name: 'DDENE Officiel', primary: '#1e40af', headerBg: '#1e40af', bodyBg: '#f8fafc', bodyText: '#1e293b' },
  { id: 'nature' as ThemeId, name: 'Nature', primary: '#166534', headerBg: '#166534', bodyBg: '#fefce8', bodyText: '#1c1917' },
  { id: 'contrast' as ThemeId, name: 'Contraste', primary: '#fbbf24', headerBg: '#0f172a', bodyBg: '#1e293b', bodyText: '#f1f5f9' },
  { id: 'ocean' as ThemeId, name: 'Ocean', primary: '#0891b2', headerBg: '#164e63', bodyBg: '#ecfeff', bodyText: '#134e4a' },
  { id: 'sunset' as ThemeId, name: 'Coucher de soleil', primary: '#dc2626', headerBg: '#7c2d12', bodyBg: '#fff7ed', bodyText: '#1c1917' },
];

const themeColors: Record<string, string> = {
  ddene: '#1e40af', nature: '#166534', contrast: '#fbbf24', ocean: '#0891b2', sunset: '#dc2626',
};
const themeNames: Record<string, string> = {
  ddene: 'DDENE Officiel', nature: 'Nature', contrast: 'Contraste', ocean: 'Ocean', sunset: 'Coucher de soleil',
};

const createForm = reactive({
  title: '',
  description: '',
  language: 'fr' as string,
  theme: 'ddene' as ThemeId,
  tenant_id: '' as string,
});

function resetWizard() {
  createForm.title = '';
  createForm.description = '';
  createForm.language = 'fr';
  createForm.theme = 'ddene';
  createForm.tenant_id = '';
}

function countScreens(mod: Module) {
  return mod.sections?.reduce((acc, s) => acc + (s.screens?.length || 0), 0) || 0;
}

function confirmDelete(mod: Module) {
  moduleToDelete.value = mod;
}

async function handleCreate() {
  creating.value = true;
  try {
    const body: any = {
      title: createForm.title,
      description: createForm.description,
      language: createForm.language,
    };
    if (auth.isSuperAdmin && createForm.tenant_id) {
      body.tenant_id = createForm.tenant_id;
    }
    const mod = await store.createModule(body);
    // Appliquer le theme
    if (createForm.theme !== 'ddene') {
      await store.updateModule(mod._id, { theme: createForm.theme } as any);
    }
    wizardStep.value = 0;
    // Naviguer vers la structure du module cree
    router.push(`/admin/modules/${mod._id}/structure`);
  } catch {
    // error handled in store
  } finally {
    creating.value = false;
  }
}

async function handleDelete() {
  if (!moduleToDelete.value) return;
  try {
    await store.deleteModule(moduleToDelete.value._id);
    moduleToDelete.value = null;
  } catch {
    // error handled in store
  }
}

onMounted(async () => {
  store.fetchModules();
  // Load tenants list for superadmin
  if (auth.isSuperAdmin) {
    try {
      const res = await apiFetch('/tenants');
      tenantsList.value = (res.data as any).tenants || [];
    } catch {}
  }
});
</script>
