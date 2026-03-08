<template>
  <div class="space-y-3">
    <!-- Onglets source image -->
    <div class="flex border-b border-gray-200">
      <button
        v-for="tab in sourceTabs"
        :key="tab.id"
        @click="activeTab = tab.id"
        class="px-4 py-2 text-xs font-bold border-b-2 transition"
        :class="activeTab === tab.id
          ? 'border-green-600 text-green-700'
          : 'border-transparent text-gray-500 hover:text-gray-700'"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- TAB 1 : Upload local -->
    <div v-if="activeTab === 'upload'" class="space-y-3">
      <div
        class="border-2 border-dashed rounded-xl p-6 text-center transition cursor-pointer"
        :class="isDragging
          ? 'border-green-500 bg-green-50'
          : 'border-gray-300 hover:border-green-400 hover:bg-green-50/30'"
        @dragover.prevent="isDragging = true"
        @dragleave="isDragging = false"
        @drop.prevent="onDrop"
        @click="fileInputRef?.click()"
      >
        <input
          ref="fileInputRef"
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
          class="hidden"
          @change="onFileSelect"
        />
        <div v-if="uploading" class="space-y-2">
          <div class="w-8 h-8 border-3 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p class="text-sm text-green-600 font-medium">Envoi en cours...</p>
        </div>
        <div v-else>
          <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p class="text-sm font-medium text-gray-700">Cliquez ou glissez une image ici</p>
          <p class="text-xs text-gray-400 mt-1">JPEG, PNG, GIF, WebP, SVG - Max 5 Mo</p>
        </div>
      </div>
      <p v-if="uploadError" class="text-xs text-red-500">{{ uploadError }}</p>

      <!-- Bibliotheque locale (images deja uploadees) -->
      <div v-if="libraryImages.length > 0">
        <p class="text-xs font-bold text-gray-500 uppercase mb-2">Images deja envoyees</p>
        <div class="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
          <button
            v-for="img in libraryImages"
            :key="img.filename"
            @click="selectImage(imgFullUrl(img))"
            class="aspect-square rounded-lg overflow-hidden border-2 transition hover:shadow-md"
            :class="modelValue.url === imgFullUrl(img) ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200 hover:border-green-300'"
          >
            <img :src="imgFullUrl(img)" class="w-full h-full object-cover" />
          </button>
        </div>
      </div>
    </div>

    <!-- TAB 2 : Recherche en ligne (Pixabay) -->
    <div v-if="activeTab === 'online'" class="space-y-3">
      <div class="flex space-x-2">
        <input
          v-model="searchQuery"
          @keyup.enter="searchOnline"
          type="text"
          placeholder="Rechercher une image (ex: ecole, nature, Haiti...)"
          class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
        />
        <button
          @click="searchOnline"
          :disabled="searching || !searchQuery.trim()"
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
        >
          {{ searching ? '...' : 'Chercher' }}
        </button>
      </div>

      <!-- Categories rapides -->
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="cat in quickCategories"
          :key="cat"
          @click="searchQuery = cat; searchOnline()"
          class="px-2.5 py-1 text-xs bg-gray-100 text-gray-600 rounded-full hover:bg-green-100 hover:text-green-700 transition"
        >
          {{ cat }}
        </button>
      </div>

      <!-- Resultats -->
      <div v-if="searching" class="text-center py-6">
        <div class="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-xs text-gray-500 mt-2">Recherche en cours...</p>
      </div>

      <div v-else-if="onlineResults.length > 0" class="space-y-2">
        <div class="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
          <button
            v-for="img in onlineResults"
            :key="img.id"
            @click="selectImage(img.webformatURL)"
            class="aspect-video rounded-lg overflow-hidden border-2 transition hover:shadow-md relative group"
            :class="modelValue.url === img.webformatURL ? 'border-green-500 ring-2 ring-green-200' : 'border-gray-200 hover:border-green-300'"
          >
            <img :src="img.previewURL" :alt="img.tags" class="w-full h-full object-cover" />
            <div class="absolute inset-x-0 bottom-0 bg-black/60 text-white text-[9px] px-1 py-0.5 opacity-0 group-hover:opacity-100 transition truncate">
              {{ img.tags }}
            </div>
          </button>
        </div>
        <p class="text-[10px] text-gray-400 text-center">Images libres de droits - Pixabay</p>
      </div>

      <div v-else-if="searchDone && onlineResults.length === 0" class="text-center py-4 text-gray-400 text-sm">
        Aucune image trouvee. Essayez d'autres mots-cles.
      </div>
    </div>

    <!-- TAB 3 : URL manuelle -->
    <div v-if="activeTab === 'url'" class="space-y-3">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">URL de l'image</label>
        <input
          :value="modelValue.url"
          @input="update('url', ($event.target as HTMLInputElement).value)"
          type="url"
          placeholder="https://exemple.com/image.jpg"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
        />
      </div>
    </div>

    <!-- Champs communs (toujours visibles si image selectionnee) -->
    <div v-if="modelValue.url" class="space-y-3 border-t border-gray-200 pt-3">
      <!-- Apercu -->
      <div class="border rounded-lg p-2 bg-gray-50">
        <img :src="modelValue.url" :alt="modelValue.alt || ''" class="max-h-40 mx-auto rounded" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Texte alternatif</label>
        <input
          :value="modelValue.alt"
          @input="update('alt', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="Description de l'image pour l'accessibilite"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Legende (optionnel)</label>
        <input
          :value="modelValue.caption"
          @input="update('caption', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="Legende affichee sous l'image"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Taille</label>
        <select
          :value="modelValue.size"
          @change="update('size', ($event.target as HTMLSelectElement).value)"
          class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
        >
          <option value="small">Petite (50%)</option>
          <option value="medium">Moyenne (75%)</option>
          <option value="full">Pleine largeur</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: { url: string; alt: string; caption: string; size: string } }>();
const emit = defineEmits<{ 'update:modelValue': [val: any] }>();

const config = useRuntimeConfig();
const backendUrl = config.public.apiBase.replace('/api', '');

const activeTab = ref<'upload' | 'online' | 'url'>('upload');
const fileInputRef = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const uploading = ref(false);
const uploadError = ref('');
const libraryImages = ref<any[]>([]);

// Recherche en ligne
const searchQuery = ref('');
const searching = ref(false);
const searchDone = ref(false);
const onlineResults = ref<any[]>([]);

const quickCategories = ['education', 'ecole', 'nature', 'science', 'mathematiques', 'Haiti', 'livre', 'enfants'];

// Cle API Pixabay via variable d'environnement
const PIXABAY_KEY = config.public.pixabayKey || '';

const sourceTabs = [
  { id: 'upload' as const, label: 'Mon ordinateur' },
  { id: 'online' as const, label: 'Images libres' },
  { id: 'url' as const, label: 'URL' },
];

function update(key: string, value: any) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}

function imgFullUrl(img: any): string {
  // GCP: url is already a full signed URL; local: relative path
  if (img.storage === 'gcp' || img.url?.startsWith('http')) return img.url;
  return backendUrl + img.url;
}

function selectImage(url: string) {
  emit('update:modelValue', { ...props.modelValue, url });
}

// --- Upload local ---
async function uploadFile(file: File) {
  uploading.value = true;
  uploadError.value = '';

  const formData = new FormData();
  formData.append('image', file);

  try {
    const token = useCookie('auth_token').value;
    const res = await $fetch<any>(`${config.public.apiBase}/upload/image`, {
      method: 'POST',
      body: formData,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    // GCP renvoie une signed URL complete, local renvoie un chemin relatif
    const fullUrl = res.storage === 'gcp' ? res.url : backendUrl + res.url;
    selectImage(fullUrl);
    // Rafraichir la bibliotheque
    loadLibrary();
  } catch (err: any) {
    uploadError.value = err?.data?.error || err?.message || 'Erreur lors de l\'envoi';
  } finally {
    uploading.value = false;
  }
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.[0]) {
    uploadFile(input.files[0]);
    input.value = '';
  }
}

function onDrop(e: DragEvent) {
  isDragging.value = false;
  const file = e.dataTransfer?.files?.[0];
  if (file && file.type.startsWith('image/')) {
    uploadFile(file);
  }
}

async function loadLibrary() {
  try {
    const token = useCookie('auth_token').value;
    const res = await $fetch<any>(`${config.public.apiBase}/upload/library`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    libraryImages.value = res.images || [];
  } catch {
    // silencieux
  }
}

// --- Recherche en ligne (Pixabay) ---
async function searchOnline() {
  if (!searchQuery.value.trim()) return;
  searching.value = true;
  searchDone.value = false;
  onlineResults.value = [];

  try {
    const q = encodeURIComponent(searchQuery.value.trim());
    const res = await $fetch<any>(
      `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${q}&image_type=photo&per_page=30&safesearch=true&lang=fr`
    );
    onlineResults.value = res.hits || [];
  } catch {
    // En cas d'erreur API (cle manquante etc.), on utilise le fallback
    onlineResults.value = [];
  } finally {
    searching.value = false;
    searchDone.value = true;
  }
}

onMounted(() => {
  loadLibrary();
});
</script>
