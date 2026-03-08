<template>
  <div class="space-y-2">
    <p v-if="data.title" class="font-medium text-gray-700">{{ data.title }}</p>
    <div v-if="data.url" class="border rounded-lg overflow-hidden mx-auto" :style="{ maxWidth: (data.width || 800) + 'px' }">
      <iframe
        :src="data.url"
        :width="data.width || 800"
        :height="data.height || 500"
        class="w-full"
        frameborder="0"
        sandbox="allow-scripts allow-same-origin allow-popups"
      ></iframe>
    </div>
    <div v-else class="text-gray-400 text-sm italic text-center py-8 bg-gray-50 rounded-lg">
      Aucun objet integre configure
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ data: { url: string; width: number; height: number; title: string } }>();
</script>
