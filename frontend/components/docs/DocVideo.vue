<template>
  <div class="my-6">
    <div class="relative rounded-xl overflow-hidden bg-black aspect-video">
      <iframe
        v-if="embedUrl"
        :src="embedUrl"
        class="absolute inset-0 w-full h-full"
        frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen>
      </iframe>
      <div v-else class="flex items-center justify-center h-full text-gray-500 text-sm">
        URL video invalide
      </div>
    </div>
    <p v-if="caption" class="text-sm text-gray-500 mt-2 text-center">{{ caption }}</p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  src: string;
  caption?: string;
}>();

const embedUrl = computed(() => {
  const url = props.src;
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`;
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
  // Direct embed URL
  if (url.includes('embed')) return url;
  return '';
});
</script>
