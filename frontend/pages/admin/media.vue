<template>
  <div>
    <NuxtLayout name="admin">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold text-gray-900">Mediatheque</h1>
        <label class="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 cursor-pointer text-sm font-medium transition">
          Importer un fichier
          <input type="file" class="hidden" @change="uploadFile" accept="image/*,video/*,audio/*,application/pdf" />
        </label>
      </div>

      <!-- Upload progress -->
      <div v-if="uploading" class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
        Import en cours...
      </div>
      <div v-if="uploadError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
        {{ uploadError }}
      </div>

      <!-- Grille medias -->
      <div v-if="loading" class="text-center py-12 text-gray-500">Chargement...</div>

      <div v-else-if="items.length === 0" class="text-center py-16 text-gray-400">
        <p class="text-lg mb-2">Aucun media</p>
        <p class="text-sm">Importez des fichiers pour alimenter votre mediatheque</p>
      </div>

      <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div
          v-for="(item, idx) in items"
          :key="idx"
          class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition group"
        >
          <!-- Apercu -->
          <div class="aspect-square bg-gray-100 flex items-center justify-center relative">
            <img :src="item.url" :alt="item.filename" class="w-full h-full object-cover" />

            <!-- Overlay actions -->
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-2">
              <button @click="copyUrl(item.url)" class="px-3 py-1 bg-white text-gray-800 rounded-lg text-xs font-medium">
                {{ copiedIdx === idx ? 'Copie !' : 'Copier URL' }}
              </button>
              <button @click="deleteItem(item)" class="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium">
                Supprimer
              </button>
            </div>
          </div>
          <div class="p-2">
            <p class="text-xs text-gray-700 truncate font-medium">{{ item.filename }}</p>
            <p class="text-[10px] text-gray-400">{{ formatSize(item.size) }} &middot; {{ item.storage === 'gcp' ? 'Cloud' : 'Local' }}</p>
          </div>
        </div>
      </div>
    </NuxtLayout>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' });

const config = useRuntimeConfig();
const apiBase = config.public.apiBase;

interface MediaItem {
  filename: string;
  url: string;
  size: number;
  storage: string;
  gcsPath?: string;
}

const items = ref<MediaItem[]>([]);
const loading = ref(true);
const uploading = ref(false);
const uploadError = ref('');
const copiedIdx = ref<number | null>(null);

function getHeaders() {
  const token = useCookie('auth_token').value;
  return { Authorization: `Bearer ${token}` };
}

async function fetchLibrary() {
  loading.value = true;
  try {
    const res = await $fetch<any>(`${apiBase}/upload/library`, { headers: getHeaders() });
    items.value = res.images || [];
  } catch {
    items.value = [];
  } finally {
    loading.value = false;
  }
}

async function uploadFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  uploading.value = true;
  uploadError.value = '';
  try {
    const form = new FormData();
    form.append('image', file);
    await $fetch<any>(`${apiBase}/upload/image`, {
      method: 'POST',
      headers: { Authorization: getHeaders().Authorization },
      body: form,
    });
    await fetchLibrary();
  } catch (err: any) {
    uploadError.value = err.data?.error || 'Erreur lors de l\'import';
  } finally {
    uploading.value = false;
    // Reset input
    (event.target as HTMLInputElement).value = '';
  }
}

async function deleteItem(item: MediaItem) {
  if (!confirm('Supprimer ce fichier ?')) return;
  try {
    const query = item.gcsPath ? `?gcsPath=${encodeURIComponent(item.gcsPath)}` : '';
    await $fetch<any>(`${apiBase}/upload/${encodeURIComponent(item.filename)}${query}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    items.value = items.value.filter(i => i !== item);
  } catch {
    // handled
  }
}

function copyUrl(url: string) {
  navigator.clipboard.writeText(url);
  const idx = items.value.findIndex(i => i.url === url);
  copiedIdx.value = idx;
  setTimeout(() => { copiedIdx.value = null; }, 2000);
}

function formatSize(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

onMounted(() => fetchLibrary());
</script>
