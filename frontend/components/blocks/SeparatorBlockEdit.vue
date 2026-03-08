<template>
  <div class="space-y-3">
    <label class="block text-sm font-medium text-gray-700">Style du separateur</label>
    <div class="flex space-x-4">
      <label v-for="s in styles" :key="s.value" class="flex items-center space-x-2 cursor-pointer">
        <input
          type="radio"
          :value="s.value"
          :checked="modelValue.style === s.value"
          @change="update('style', s.value)"
          class="text-primary-600"
        />
        <span class="text-sm">{{ s.label }}</span>
      </label>
    </div>
    <div class="pt-2">
      <hr :class="previewClass" />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: { style: string } }>();
const emit = defineEmits<{ 'update:modelValue': [val: any] }>();

const styles = [
  { value: 'solid', label: 'Trait plein' },
  { value: 'dashed', label: 'Pointilles' },
  { value: 'dotted', label: 'Points' },
  { value: 'space', label: 'Espace' },
];

const previewClass = computed(() => {
  const s = props.modelValue.style || 'solid';
  if (s === 'space') return 'border-0 my-6';
  if (s === 'dashed') return 'border-dashed border-gray-300 my-4';
  if (s === 'dotted') return 'border-dotted border-gray-300 my-4';
  return 'border-solid border-gray-300 my-4';
});

function update(key: string, value: any) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}
</script>
