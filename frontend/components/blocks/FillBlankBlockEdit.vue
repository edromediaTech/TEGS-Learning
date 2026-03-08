<template>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Texte avec trous</label>
      <textarea
        :value="modelValue.text"
        @input="update('text', ($event.target as HTMLTextAreaElement).value)"
        rows="3"
        placeholder="Utilisez {{mot}} pour marquer les trous. Ex: La capitale d'Haiti est {{Port-au-Prince}}."
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-sm"
      ></textarea>
      <p class="text-xs text-gray-400 mt-1">Syntaxe : entourez les mots a deviner avec &#123;&#123;mot&#125;&#125;</p>
    </div>
    <div v-if="blanks.length > 0" class="bg-gray-50 rounded-lg p-3">
      <p class="text-xs font-medium text-gray-500 mb-2">Reponses attendues :</p>
      <div class="flex flex-wrap gap-2">
        <span v-for="(b, i) in blanks" :key="i" class="bg-primary-100 text-primary-700 px-2 py-1 rounded text-sm font-medium">
          {{ i + 1 }}. {{ b }}
        </span>
      </div>
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Explication (optionnel)</label>
      <textarea
        :value="modelValue.explanation"
        @input="update('explanation', ($event.target as HTMLTextAreaElement).value)"
        rows="2"
        placeholder="Explication..."
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: { text: string; explanation: string } }>();
const emit = defineEmits<{ 'update:modelValue': [val: any] }>();

const blanks = computed(() => {
  const matches = props.modelValue.text?.match(/\{\{(.+?)\}\}/g) || [];
  return matches.map(m => m.replace(/\{\{|\}\}/g, ''));
});

function update(key: string, value: any) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}
</script>
