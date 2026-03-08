<template>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Question</label>
      <input
        :value="modelValue.question"
        @input="update('question', ($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="Ex: Combien font 12 x 8 ?"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      />
    </div>
    <div class="grid grid-cols-3 gap-3">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Reponse exacte</label>
        <input
          :value="modelValue.answer"
          @input="update('answer', Number(($event.target as HTMLInputElement).value))"
          type="number"
          step="any"
          placeholder="96"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Tolerance (+/-)</label>
        <input
          :value="modelValue.tolerance"
          @input="update('tolerance', Number(($event.target as HTMLInputElement).value))"
          type="number"
          step="any"
          min="0"
          placeholder="0"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Unite (optionnel)</label>
        <input
          :value="modelValue.unit"
          @input="update('unit', ($event.target as HTMLInputElement).value)"
          type="text"
          placeholder="kg, m, %..."
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
        />
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
const props = defineProps<{ modelValue: { question: string; answer: number; tolerance: number; unit: string; explanation: string } }>();
const emit = defineEmits<{ 'update:modelValue': [val: any] }>();

function update(key: string, value: any) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}
</script>
