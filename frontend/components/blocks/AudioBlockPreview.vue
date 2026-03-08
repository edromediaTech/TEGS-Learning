<template>
  <div class="bg-gray-50 rounded-lg p-4">
    <p v-if="data.title" class="font-medium text-gray-700 mb-2">{{ data.title }}</p>
    <audio v-if="data.url" :src="data.url" controls class="w-full"></audio>
    <p v-else class="text-gray-400 text-sm italic">Aucun audio configure</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ data: { url: string; title: string } }>();
</script>
