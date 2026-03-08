<template>
  <div class="space-y-3">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">URL du fichier audio</label>
      <input
        :value="modelValue.url"
        @input="update('url', ($event.target as HTMLInputElement).value)"
        type="url"
        placeholder="https://exemple.com/audio.mp3"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Titre (optionnel)</label>
      <input
        :value="modelValue.title"
        @input="update('title', ($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="Titre du fichier audio"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      />
    </div>
    <div v-if="modelValue.url" class="bg-gray-50 border rounded-lg p-3">
      <audio :src="modelValue.url" controls class="w-full"></audio>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: { url: string; title: string } }>();
const emit = defineEmits<{ 'update:modelValue': [val: any] }>();

function update(key: string, value: any) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}
</script>
