<template>
  <figure class="my-6">
    <div class="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
      <!-- Real image -->
      <img v-if="src && !imageError" :src="src" :alt="alt"
        class="w-full h-auto"
        :class="{ 'cursor-pointer hover:opacity-90 transition': zoomable }"
        @click="zoomable && (zoomed = true)"
        @error="imageError = true" />

      <!-- Placeholder when no image yet -->
      <div v-else
        class="flex flex-col items-center justify-center py-12 px-6 bg-gradient-to-br from-gray-50 to-gray-100 text-center">
        <div class="w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center text-3xl mb-4">
          {{ placeholderIcon }}
        </div>
        <p class="text-sm font-medium text-gray-500 mb-1">{{ alt || 'Capture d\'ecran' }}</p>
        <p class="text-xs text-gray-400">{{ placeholder || 'Image a ajouter' }}</p>
      </div>
    </div>

    <!-- Caption -->
    <figcaption v-if="caption" class="mt-2 text-xs text-gray-500 text-center italic">
      {{ caption }}
    </figcaption>

    <!-- Zoom modal -->
    <Teleport to="body">
      <div v-if="zoomed" class="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-pointer"
        @click="zoomed = false">
        <img :src="src" :alt="alt" class="max-w-full max-h-full rounded-lg shadow-2xl" />
        <button class="absolute top-6 right-6 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white text-xl">
          &#10005;
        </button>
      </div>
    </Teleport>
  </figure>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  src?: string;
  alt?: string;
  caption?: string;
  placeholder?: string;
  zoomable?: boolean;
  icon?: string;
}>(), {
  zoomable: true,
});

const zoomed = ref(false);
const imageError = ref(false);

const placeholderIcon = computed(() => props.icon || '\uD83D\uDCF7');
</script>
