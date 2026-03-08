<template>
  <div class="space-y-2">
    <!-- Image -->
    <div v-if="data.mediaType === 'image' && data.url">
      <img :src="data.url" :alt="data.caption || 'Image'" class="max-w-full rounded-lg shadow-sm" />
    </div>

    <!-- Video YouTube -->
    <div v-else-if="data.mediaType === 'video' && youtubeId" class="aspect-video">
      <iframe
        :src="`https://www.youtube.com/embed/${youtubeId}`"
        class="w-full h-full rounded-lg"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    </div>

    <!-- Video directe -->
    <div v-else-if="data.mediaType === 'video' && data.url">
      <video :src="data.url" controls class="max-w-full rounded-lg shadow-sm">
        Votre navigateur ne supporte pas la lecture video.
      </video>
    </div>

    <!-- Pas d'URL -->
    <div v-else class="text-gray-400 text-sm italic">
      Aucun media configure
    </div>

    <!-- Caption -->
    <p v-if="data.caption" class="text-sm text-gray-500 text-center italic">
      {{ data.caption }}
    </p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ data: { url: string; mediaType: string; caption: string } }>();

const youtubeId = computed(() => {
  const url = props.data.url || '';
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
});
</script>
