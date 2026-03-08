<template>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Enonce</label>
      <input
        :value="modelValue.statement"
        @input="update('statement', ($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="Ex: La Terre est plate."
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      />
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Reponse correcte</label>
      <div class="flex space-x-4">
        <label class="flex items-center space-x-2 cursor-pointer px-4 py-2 rounded-lg border" :class="modelValue.answer === true ? 'border-green-400 bg-green-50' : 'border-gray-200'">
          <input type="radio" :checked="modelValue.answer === true" @change="update('answer', true)" class="text-green-600" />
          <span class="text-sm font-medium">Vrai</span>
        </label>
        <label class="flex items-center space-x-2 cursor-pointer px-4 py-2 rounded-lg border" :class="modelValue.answer === false ? 'border-red-400 bg-red-50' : 'border-gray-200'">
          <input type="radio" :checked="modelValue.answer === false" @change="update('answer', false)" class="text-red-600" />
          <span class="text-sm font-medium">Faux</span>
        </label>
      </div>
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Explication (optionnel)</label>
      <textarea
        :value="modelValue.explanation"
        @input="update('explanation', ($event.target as HTMLTextAreaElement).value)"
        rows="2"
        placeholder="Explication affichee apres la reponse..."
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: { statement: string; answer: boolean; explanation: string } }>();
const emit = defineEmits<{ 'update:modelValue': [val: any] }>();

function update(key: string, value: any) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}
</script>
