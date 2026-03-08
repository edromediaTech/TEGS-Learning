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

      <!-- Filtres -->
      <div class="flex items-center space-x-3 mb-6">
        <button
          v-for="f in filters"
          :key="f.value"
          @click="activeFilter = f.value"
          class="px-3 py-1.5 rounded-lg text-xs font-medium transition"
          :class="activeFilter === f.value ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
        >
          {{ f.label }}
        </button>
      </div>

      <!-- Upload progress -->
      <div v-if="uploading" class="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
        Import en cours...
      </div>

      <!-- Grille medias -->
      <div v-if="loading" class="text-center py-12 text-gray-500">Chargement...</div>

      <div v-else-if="filteredItems.length === 0" class="text-center py-16 text-gray-400">
        <p class="text-lg mb-2">Aucun media</p>
        <p class="text-sm">Importez des fichiers pour alimenter votre mediatheque</p>
      </div>

      <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div
          v-for="item in filteredItems"
          :key="item._id"
          class="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition group"
        >
          <!-- Apercu -->
          <div class="aspect-square bg-gray-100 flex items-center justify-center relative">
            <img v-if="item.mimetype?.startsWith('image/')" :src="item.url" :alt="item.filename" class="w-full h-full object-cover" />
            <span v-else-if="item.mimetype?.startsWith('video/')" class="text-3xl text-gray-400">&#9654;</span>
            <span v-else-if="item.mimetype?.startsWith('audio/')" class="text-3xl text-gray-400">&#9835;</span>
            <span v-else class="text-3xl text-gray-400">&#128196;</span>

            <!-- Overlay actions -->
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center space-x-2">
              <button @click="copyUrl(item.url)" class="px-3 py-1 bg-white text-gray-800 rounded-lg text-xs font-medium">
                Copier URL
              </button>
              <button @click="deleteItem(item._id)" class="px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-medium">
                Supprimer
              </button>
            </div>
          </div>
          <div class="p-2">
            <p class="text-xs text-gray-700 truncate font-medium">{{ item.filename }}</p>
            <p class="text-[10px] text-gray-400">{{ formatSize(item.size) }}</p>
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
  _id: string;
  filename: string;
  url: string;
  mimetype: string;
  size: number;
}

const items = ref<MediaItem[]>([]);
const loading = ref(true);
const uploading = ref(false);
const activeFilter = ref('all');

const filters = [
  { value: 'all', label: 'Tous' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
  { value: 'audio', label: 'Audio' },
  { value: 'other', label: 'Documents' },
];

const filteredItems = computed(() => {
  if (activeFilter.value === 'all') return items.value;
  if (activeFilter.value === 'other') {
    return items.value.filter(i => !['image/', 'video/', 'audio/'].some(t => i.mimetype?.startsWith(t)));
  }
  return items.value.filter(i => i.mimetype?.startsWith(activeFilter.value + '/'));
});

function getHeaders() {
  const token = useCookie('auth_token').value;
  return { Authorization: `Bearer ${token}` };
}

async function fetchLibrary() {
  loading.value = true;
  try {
    const res = await $fetch<any>(`${apiBase}/upload/library`, { headers: getHeaders() });
    items.value = res.files || [];
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
  try {
    const form = new FormData();
    form.append('file', file);
    await $fetch<any>(`${apiBase}/upload`, {
      method: 'POST',
      headers: { Authorization: getHeaders().Authorization },
      body: form,
    });
    await fetchLibrary();
  } catch {
    // handled
  } finally {
    uploading.value = false;
  }
}

async function deleteItem(id: string) {
  if (!confirm('Supprimer ce fichier ?')) return;
  try {
    await $fetch<any>(`${apiBase}/upload/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    items.value = items.value.filter(i => i._id !== id);
  } catch {
    // handled
  }
}

function copyUrl(url: string) {
  navigator.clipboard.writeText(url);
}

function formatSize(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

onMounted(() => fetchLibrary());
</script>
