<template>
  <div class="space-y-2">
    <p v-if="data.title" class="font-medium text-gray-700">{{ data.title }}</p>
    <div v-if="data.url" class="border rounded-lg overflow-hidden">
      <iframe :src="data.url" :style="{ height: (data.height || 500) + 'px' }" class="w-full" frameborder="0"></iframe>
    </div>
    <div v-else class="text-gray-400 text-sm italic text-center py-8 bg-gray-50 rounded-lg">
      Aucun PDF configure
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ data: { url: string; title: string; height: number } }>();
</script>
