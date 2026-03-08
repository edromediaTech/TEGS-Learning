<template>
  <div>
    <NuxtLayout name="admin">
      <div v-if="store.loading && !store.current" class="text-center py-12 text-gray-500">
        Chargement...
      </div>

      <div v-else-if="store.current">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <div>
            <NuxtLink to="/admin/modules" class="text-sm text-primary-600 hover:text-primary-800 mb-1 inline-block">
              &larr; Retour aux modules
            </NuxtLink>
            <h1 class="text-2xl font-bold text-gray-900">Configuration : {{ store.current.title }}</h1>
          </div>
        </div>

        <!-- Onglets -->
        <div class="flex border-b border-gray-200 mb-6">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            @click="activeTab = tab.id"
            class="px-5 py-3 text-sm font-medium border-b-2 transition"
            :class="activeTab === tab.id ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- Messages -->
        <div v-if="successMsg" class="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {{ successMsg }}
        </div>
        <div v-if="store.error" class="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {{ store.error }}
        </div>

        <!-- Onglet Proprietes -->
        <div v-if="activeTab === 'properties'" class="max-w-2xl space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Titre</label>
            <input v-model="editForm.title" type="text" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea v-model="editForm.description" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Langue</label>
            <select v-model="editForm.language" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
              <option value="fr">Francais</option>
              <option value="ht">Creole Haitien</option>
              <option value="en">Anglais</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">Statut</label>
            <select v-model="editForm.status" class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500">
              <option value="draft">Brouillon</option>
              <option value="published">Publie</option>
            </select>
          </div>
          <button @click="saveProperties" :disabled="saving" class="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium">
            {{ saving ? 'Sauvegarde...' : 'Sauvegarder' }}
          </button>
        </div>

        <!-- Onglet Theme -->
        <div v-if="activeTab === 'theme'" class="max-w-3xl">
          <p class="text-sm text-gray-500 mb-4">Choisissez l'habillage graphique de votre module</p>
          <div class="grid grid-cols-3 lg:grid-cols-5 gap-4">
            <button
              v-for="t in themes"
              :key="t.id"
              @click="selectTheme(t.id)"
              class="rounded-xl border-2 overflow-hidden transition hover:shadow-md"
              :class="editForm.theme === t.id ? 'border-primary-500 ring-2 ring-primary-200 shadow-md' : 'border-gray-200'"
            >
              <div class="h-10" :style="{ background: t.headerBg }"></div>
              <div class="p-3 h-16" :style="{ background: t.bodyBg }">
                <div class="h-2 rounded-full mb-2" :style="{ background: t.primary, width: '70%' }"></div>
                <div class="h-1.5 rounded-full mb-1" :style="{ background: t.bodyText + '33', width: '100%' }"></div>
                <div class="h-1.5 rounded-full" :style="{ background: t.bodyText + '22', width: '60%' }"></div>
              </div>
              <div class="px-3 py-2 text-xs font-bold text-center" :class="editForm.theme === t.id ? 'text-primary-700 bg-primary-50' : 'text-gray-600 bg-gray-50'">
                {{ t.name }}
              </div>
            </button>
          </div>
        </div>

        <!-- Onglet Partager -->
        <div v-if="activeTab === 'share'" class="max-w-2xl space-y-6">
          <!-- Activer/Desactiver -->
          <div class="bg-white border border-gray-200 rounded-xl p-5">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="font-bold text-gray-900">Partager ce module</h3>
                <p class="text-sm text-gray-500 mt-1">Rendre le module accessible publiquement via un lien securise</p>
              </div>
              <button
                @click="toggleShare(!shareInfo.shareEnabled)"
                :disabled="sharingLoading"
                class="px-4 py-2 rounded-lg font-medium text-sm transition"
                :class="shareInfo.shareEnabled
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-green-600 text-white hover:bg-green-700'"
              >
                {{ shareInfo.shareEnabled ? 'Desactiver' : 'Activer le partage' }}
              </button>
            </div>
          </div>

          <!-- URL publique -->
          <div v-if="shareInfo.shareEnabled && shareInfo.shareUrl" class="space-y-4">
            <div class="bg-green-50 border border-green-200 rounded-xl p-5">
              <h4 class="font-bold text-green-800 mb-2">URL publique de la formation</h4>
              <div class="flex items-center space-x-2">
                <input
                  :value="shareInfo.shareUrl"
                  readonly
                  class="flex-1 px-3 py-2 border border-green-300 rounded-lg bg-white text-sm font-mono"
                />
                <button
                  @click="copyToClipboard(shareInfo.shareUrl)"
                  class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  {{ copied === 'url' ? 'Copie !' : 'Copier' }}
                </button>
              </div>
            </div>

            <!-- Code Iframe -->
            <div class="bg-blue-50 border border-blue-200 rounded-xl p-5">
              <h4 class="font-bold text-blue-800 mb-2">Integrer dans votre site Web</h4>
              <p class="text-sm text-blue-600 mb-3">Code a inclure dans votre site :</p>
              <div class="bg-white border border-blue-200 rounded-lg p-3 font-mono text-xs break-all">
                {{ iframeCode }}
              </div>
              <div class="flex items-center space-x-4 mt-3">
                <div>
                  <label class="text-xs text-blue-600 font-medium">Largeur</label>
                  <input v-model.number="embedWidth" type="number" min="300" max="1400" class="w-20 px-2 py-1 border border-blue-300 rounded text-sm ml-1" />
                </div>
                <div>
                  <label class="text-xs text-blue-600 font-medium">Hauteur</label>
                  <input v-model.number="embedHeight" type="number" min="300" max="1000" class="w-20 px-2 py-1 border border-blue-300 rounded text-sm ml-1" />
                </div>
                <button
                  @click="copyToClipboard(iframeCode, 'iframe')"
                  class="px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium ml-auto"
                >
                  {{ copied === 'iframe' ? 'Copie !' : 'Copier le code' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Onglet Exporter -->
        <div v-if="activeTab === 'export'" class="max-w-2xl">
          <div class="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
            <div class="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <span class="text-2xl text-gray-400">&#8681;</span>
            </div>
            <h3 class="font-bold text-gray-700 mb-2">Export cmi5</h3>
            <p class="text-sm text-gray-500 mb-4">Telecharger le manifeste cmi5.xml pour integration LMS</p>
            <a
              :href="`${apiBase}/cmi5/manifest/${store.current._id}`"
              target="_blank"
              class="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 font-medium"
            >
              Telecharger cmi5.xml
            </a>
          </div>
        </div>

        <!-- Onglet Supprimer -->
        <div v-if="activeTab === 'delete'" class="max-w-2xl">
          <div class="bg-red-50 border border-red-200 rounded-xl p-6">
            <h3 class="font-bold text-red-800 mb-2">Zone dangereuse</h3>
            <p class="text-sm text-red-600 mb-4">La suppression est definitive et irreversible. Tous les chapitres, ecrans et contenus seront perdus.</p>
            <button
              @click="handleDelete"
              class="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 font-medium"
            >
              Supprimer definitivement ce module
            </button>
          </div>
        </div>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
import type { ThemeId } from '~/stores/modules';

definePageMeta({ middleware: 'auth' });

const route = useRoute();
const routerNav = useRouter();
const store = useModulesStore();
const config = useRuntimeConfig();
const apiBase = config.public.apiBase;

const moduleId = route.params.id as string;

const activeTab = ref('properties');
const saving = ref(false);
const successMsg = ref('');
const sharingLoading = ref(false);
const copied = ref('');
const embedWidth = ref(800);
const embedHeight = ref(600);

const tabs = [
  { id: 'properties', label: 'Proprietes' },
  { id: 'theme', label: 'Theme' },
  { id: 'share', label: 'Partager' },
  { id: 'export', label: 'Exporter' },
  { id: 'delete', label: 'Supprimer' },
];

const themes = [
  { id: 'ddene' as ThemeId, name: 'DDENE Officiel', primary: '#1e40af', headerBg: '#1e40af', bodyBg: '#f8fafc', bodyText: '#1e293b' },
  { id: 'nature' as ThemeId, name: 'Nature', primary: '#166534', headerBg: '#166534', bodyBg: '#fefce8', bodyText: '#1c1917' },
  { id: 'contrast' as ThemeId, name: 'Contraste', primary: '#fbbf24', headerBg: '#0f172a', bodyBg: '#1e293b', bodyText: '#f1f5f9' },
  { id: 'ocean' as ThemeId, name: 'Ocean', primary: '#0891b2', headerBg: '#164e63', bodyBg: '#ecfeff', bodyText: '#134e4a' },
  { id: 'sunset' as ThemeId, name: 'Coucher de soleil', primary: '#dc2626', headerBg: '#7c2d12', bodyBg: '#fff7ed', bodyText: '#1c1917' },
];

const editForm = reactive({
  title: '',
  description: '',
  language: 'fr',
  status: 'draft',
  theme: 'ddene' as ThemeId,
});

const shareInfo = reactive({
  shareEnabled: false,
  shareToken: null as string | null,
  shareUrl: null as string | null,
});

const iframeCode = computed(() => {
  if (!shareInfo.shareUrl) return '';
  return `<iframe width="${embedWidth.value}" height="${embedHeight.value}" src="${shareInfo.shareUrl}" frameborder="0" allowfullscreen></iframe>`;
});

function loadForm() {
  if (!store.current) return;
  editForm.title = store.current.title;
  editForm.description = store.current.description;
  editForm.language = store.current.language;
  editForm.status = store.current.status;
  editForm.theme = store.current.theme || 'ddene';
}

async function saveProperties() {
  saving.value = true;
  successMsg.value = '';
  store.error = null;
  try {
    await store.updateModule(moduleId, {
      title: editForm.title,
      description: editForm.description,
      language: editForm.language,
      status: editForm.status,
      theme: editForm.theme,
    } as any);
    successMsg.value = 'Proprietes sauvegardees !';
    setTimeout(() => { successMsg.value = ''; }, 3000);
  } catch { /* handled in store */ } finally {
    saving.value = false;
  }
}

async function selectTheme(themeId: ThemeId) {
  editForm.theme = themeId;
  store.error = null;
  try {
    await store.updateModule(moduleId, { theme: themeId } as any);
    successMsg.value = 'Theme applique !';
    setTimeout(() => { successMsg.value = ''; }, 2000);
  } catch { /* handled */ }
}

async function toggleShare(enabled: boolean) {
  sharingLoading.value = true;
  try {
    const res = await store.toggleShare(moduleId, enabled);
    shareInfo.shareEnabled = res.shareEnabled;
    shareInfo.shareToken = res.shareToken;
    shareInfo.shareUrl = res.shareUrl;
  } catch { /* handled */ } finally {
    sharingLoading.value = false;
  }
}

async function loadShareInfo() {
  try {
    const res = await store.getShareInfo(moduleId);
    shareInfo.shareEnabled = res.shareEnabled;
    shareInfo.shareToken = res.shareToken;
    shareInfo.shareUrl = res.shareUrl;
  } catch { /* not shared yet */ }
}

function copyToClipboard(text: string, type = 'url') {
  navigator.clipboard.writeText(text);
  copied.value = type;
  setTimeout(() => { copied.value = ''; }, 2000);
}

async function handleDelete() {
  if (!confirm('Etes-vous certain de vouloir supprimer ce module ? Cette action est irreversible.')) return;
  try {
    await store.deleteModule(moduleId);
    routerNav.push('/admin/modules');
  } catch { /* handled */ }
}

onMounted(async () => {
  await store.fetchModule(moduleId);
  loadForm();
  loadShareInfo();
});
</script>
