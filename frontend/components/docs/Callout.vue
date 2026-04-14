<template>
  <div class="callout rounded-xl p-4 my-4 border-l-4 text-sm" :class="classes">
    <div class="flex items-start space-x-3">
      <span class="text-lg shrink-0 mt-0.5" v-html="icon"></span>
      <div class="flex-1">
        <div v-if="title" class="font-bold mb-1">{{ title }}</div>
        <div class="leading-relaxed"><slot /></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  type?: 'info' | 'warning' | 'tip' | 'danger';
  title?: string;
}>(), { type: 'info' });

const classes = computed(() => ({
  info: 'bg-blue-50 border-blue-400 text-blue-800',
  warning: 'bg-amber-50 border-amber-400 text-amber-800',
  tip: 'bg-green-50 border-green-400 text-green-800',
  danger: 'bg-red-50 border-red-400 text-red-800',
}[props.type]));

const icon = computed(() => ({
  info: '&#8505;&#65039;',
  warning: '&#9888;&#65039;',
  tip: '&#128161;',
  danger: '&#128680;',
}[props.type]));
</script>
