<template>
  <div class="space-y-3">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Niveau de titre</label>
      <select
        :value="modelValue.level"
        @change="update('level', Number(($event.target as HTMLSelectElement).value))"
        class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      >
        <option :value="1">H1 - Titre principal</option>
        <option :value="2">H2 - Sous-titre</option>
        <option :value="3">H3 - Section</option>
      </select>
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Texte du titre</label>
      <input
        :value="modelValue.text"
        @input="update('text', ($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="Saisissez le titre..."
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
        :class="{ 'text-2xl font-bold': modelValue.level === 1, 'text-xl font-semibold': modelValue.level === 2, 'text-lg font-medium': modelValue.level === 3 }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: { text: string; level: number } }>();
const emit = defineEmits<{ 'update:modelValue': [val: any] }>();

function update(key: string, value: any) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}
</script>
