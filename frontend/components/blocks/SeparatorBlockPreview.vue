<template>
  <div v-if="data.style === 'space'" class="py-6"></div>
  <hr v-else :class="hrClass" />
</template>

<script setup lang="ts">
const props = defineProps<{ data: { style: string } }>();

const hrClass = computed(() => {
  const s = props.data.style || 'solid';
  if (s === 'dashed') return 'border-dashed border-gray-300 my-4';
  if (s === 'dotted') return 'border-dotted border-gray-300 my-4';
  return 'border-solid border-gray-300 my-4';
});
</script>
