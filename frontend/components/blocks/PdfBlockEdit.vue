<template>
  <div class="space-y-3">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">URL du document PDF</label>
      <input
        :value="modelValue.url"
        @input="update('url', ($event.target as HTMLInputElement).value)"
        type="url"
        placeholder="https://exemple.com/document.pdf"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Titre du document (optionnel)</label>
      <input
        :value="modelValue.title"
        @input="update('title', ($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="Nom du document"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Hauteur d'affichage (px)</label>
      <input
        :value="modelValue.height"
        @input="update('height', Number(($event.target as HTMLInputElement).value))"
        type="number"
        min="200"
        max="1000"
        placeholder="500"
        class="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: { url: string; title: string; height: number } }>();
const emit = defineEmits<{ 'update:modelValue': [val: any] }>();

function update(key: string, value: any) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}
</script>
