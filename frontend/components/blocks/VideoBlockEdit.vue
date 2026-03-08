<template>
  <div class="space-y-3">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">URL de la video</label>
      <input
        :value="modelValue.url"
        @input="update('url', ($event.target as HTMLInputElement).value)"
        type="url"
        placeholder="https://youtube.com/watch?v=... ou URL directe .mp4"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Legende (optionnel)</label>
      <input
        :value="modelValue.caption"
        @input="update('caption', ($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="Description de la video"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      />
    </div>
    <div v-if="youtubeId" class="bg-gray-50 border rounded-lg p-2">
      <div class="aspect-video">
        <iframe :src="`https://www.youtube.com/embed/${youtubeId}`" class="w-full h-full rounded" frameborder="0" allowfullscreen></iframe>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: { url: string; caption: string } }>();
const emit = defineEmits<{ 'update:modelValue': [val: any] }>();

const youtubeId = computed(() => {
  const url = props.modelValue.url || '';
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
});

function update(key: string, value: any) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}
</script>
