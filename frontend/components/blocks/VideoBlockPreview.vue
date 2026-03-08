<template>
  <div class="space-y-2">
    <div v-if="youtubeId" class="aspect-video">
      <iframe :src="`https://www.youtube.com/embed/${youtubeId}`" class="w-full h-full rounded-lg" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </div>
    <div v-else-if="data.url">
      <video :src="data.url" controls class="w-full rounded-lg shadow-sm">
        Votre navigateur ne supporte pas la lecture video.
      </video>
    </div>
    <div v-else class="text-gray-400 text-sm italic text-center py-8 bg-gray-50 rounded-lg">
      Aucune video configuree
    </div>
    <p v-if="data.caption" class="text-sm text-gray-500 text-center italic">{{ data.caption }}</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ data: { url: string; caption: string } }>();

const youtubeId = computed(() => {
  const url = props.data.url || '';
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
});
</script>
