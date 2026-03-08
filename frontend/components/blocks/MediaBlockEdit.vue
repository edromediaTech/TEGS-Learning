<template>
  <div class="space-y-3">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Type de media</label>
      <div class="flex space-x-4">
        <label class="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            value="image"
            :checked="modelValue.mediaType === 'image'"
            @change="update('mediaType', 'image')"
            class="text-primary-600"
          />
          <span class="text-sm">Image</span>
        </label>
        <label class="flex items-center space-x-2 cursor-pointer">
          <input
            type="radio"
            value="video"
            :checked="modelValue.mediaType === 'video'"
            @change="update('mediaType', 'video')"
            class="text-primary-600"
          />
          <span class="text-sm">Video</span>
        </label>
      </div>
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">
        URL {{ modelValue.mediaType === 'video' ? '(YouTube ou directe)' : '(image)' }}
      </label>
      <input
        :value="modelValue.url"
        @input="update('url', ($event.target as HTMLInputElement).value)"
        type="url"
        placeholder="https://..."
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Legende (optionnel)</label>
      <input
        :value="modelValue.caption"
        @input="update('caption', ($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="Description du media..."
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  modelValue: { url: string; mediaType: string; caption: string };
}>();
const emit = defineEmits<{ 'update:modelValue': [val: any] }>();

function update(key: string, value: any) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}
</script>
