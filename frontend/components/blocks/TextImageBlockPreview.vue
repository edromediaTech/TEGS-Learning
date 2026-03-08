<template>
  <div class="flex gap-6 items-start" :class="{ 'flex-row-reverse': data.layout === 'text-right' }">
    <div class="flex-1 prose prose-sm max-w-none">
      <p class="whitespace-pre-wrap">{{ data.text }}</p>
    </div>
    <div class="flex-1">
      <img v-if="data.imageUrl" :src="data.imageUrl" class="w-full rounded-lg shadow-sm" />
      <div v-else class="bg-gray-100 rounded-lg h-40 flex items-center justify-center text-gray-400 text-sm">
        Aucune image
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ data: { text: string; imageUrl: string; layout: string } }>();
</script>
