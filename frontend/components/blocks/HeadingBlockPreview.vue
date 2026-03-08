<template>
  <component :is="tag" :class="classes">{{ data.text }}</component>
</template>

<script setup lang="ts">
const props = defineProps<{ data: { text: string; level: number } }>();

const tag = computed(() => `h${props.data.level || 1}`);
const classes = computed(() => {
  const level = props.data.level || 1;
  if (level === 1) return 'text-2xl font-bold text-gray-900 mb-3';
  if (level === 2) return 'text-xl font-semibold text-gray-800 mb-2';
  return 'text-lg font-medium text-gray-700 mb-2';
});
</script>
