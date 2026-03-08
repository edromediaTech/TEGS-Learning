<template>
  <div class="space-y-3">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">URL a integrer</label>
      <input
        :value="modelValue.url"
        @input="update('url', ($event.target as HTMLInputElement).value)"
        type="url"
        placeholder="https://exemple.com/widget ou URL iframe"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      />
    </div>
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Largeur</label>
        <input
          :value="modelValue.width"
          @input="update('width', Number(($event.target as HTMLInputElement).value))"
          type="number"
          min="200"
          max="1200"
          placeholder="800"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Hauteur</label>
        <input
          :value="modelValue.height"
          @input="update('height', Number(($event.target as HTMLInputElement).value))"
          type="number"
          min="100"
          max="1000"
          placeholder="500"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
        />
      </div>
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Titre (optionnel)</label>
      <input
        :value="modelValue.title"
        @input="update('title', ($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="Description de l'objet integre"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: { url: string; width: number; height: number; title: string } }>();
const emit = defineEmits<{ 'update:modelValue': [val: any] }>();

function update(key: string, value: any) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}
</script>
