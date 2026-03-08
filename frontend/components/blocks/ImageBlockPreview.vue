<template>
  <figure :class="figureClass">
    <img
      v-if="data.url"
      :src="data.url"
      :alt="data.alt || ''"
      class="rounded-lg shadow-sm"
      :class="imgClass"
    />
    <div v-else class="text-gray-400 text-sm italic text-center py-8 bg-gray-50 rounded-lg">
      Aucune image configuree
    </div>
    <figcaption v-if="data.caption" class="text-sm text-gray-500 text-center italic mt-2">
      {{ data.caption }}
    </figcaption>
  </figure>
</template>

<script setup lang="ts">
const props = defineProps<{ data: { url: string; alt: string; caption: string; size: string } }>();

const figureClass = computed(() => {
  const s = props.data.size || 'full';
  if (s === 'small') return 'max-w-[50%] mx-auto';
  if (s === 'medium') return 'max-w-[75%] mx-auto';
  return '';
});

const imgClass = computed(() => 'w-full');
</script>
