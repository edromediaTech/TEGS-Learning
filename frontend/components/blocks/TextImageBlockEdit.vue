<template>
  <div class="space-y-3">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Disposition</label>
      <div class="flex space-x-4">
        <label class="flex items-center space-x-2 cursor-pointer">
          <input type="radio" value="text-left" :checked="modelValue.layout === 'text-left'" @change="update('layout', 'text-left')" class="text-primary-600" />
          <span class="text-sm">Texte a gauche, Image a droite</span>
        </label>
        <label class="flex items-center space-x-2 cursor-pointer">
          <input type="radio" value="text-right" :checked="modelValue.layout === 'text-right'" @change="update('layout', 'text-right')" class="text-primary-600" />
          <span class="text-sm">Image a gauche, Texte a droite</span>
        </label>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Texte</label>
        <textarea
          :value="modelValue.text"
          @input="update('text', ($event.target as HTMLTextAreaElement).value)"
          rows="5"
          placeholder="Saisissez votre texte..."
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
        ></textarea>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">URL de l'image</label>
        <input
          :value="modelValue.imageUrl"
          @input="update('imageUrl', ($event.target as HTMLInputElement).value)"
          type="url"
          placeholder="https://..."
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm mb-2"
        />
        <div v-if="modelValue.imageUrl" class="border rounded-lg p-1 bg-gray-50">
          <img :src="modelValue.imageUrl" class="max-h-32 mx-auto rounded" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: { text: string; imageUrl: string; layout: string } }>();
const emit = defineEmits<{ 'update:modelValue': [val: any] }>();

function update(key: string, value: any) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}
</script>
