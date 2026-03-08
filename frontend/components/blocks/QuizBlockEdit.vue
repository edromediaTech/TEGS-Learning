<template>
  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Question</label>
      <input
        :value="modelValue.question"
        @input="updateField('question', ($event.target as HTMLInputElement).value)"
        type="text"
        placeholder="Ex: Quel est le resultat de 3 + 4 ?"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      />
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">Options de reponse</label>
      <div class="space-y-2">
        <div
          v-for="(option, idx) in modelValue.options"
          :key="idx"
          class="flex items-center space-x-2"
        >
          <input
            type="radio"
            :name="`quiz-correct-${blockId}`"
            :checked="option.isCorrect"
            @change="setCorrect(idx)"
            class="text-green-600"
            title="Bonne reponse"
          />
          <input
            :value="option.text"
            @input="updateOption(idx, 'text', ($event.target as HTMLInputElement).value)"
            type="text"
            :placeholder="`Option ${idx + 1}`"
            class="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            :class="option.isCorrect ? 'border-green-300 bg-green-50' : 'border-gray-300'"
          />
          <button
            v-if="modelValue.options.length > 2"
            @click="removeOption(idx)"
            class="text-red-400 hover:text-red-600 px-2"
            title="Supprimer"
          >
            &times;
          </button>
        </div>
      </div>
      <button
        @click="addOption"
        class="mt-2 text-sm text-primary-600 hover:text-primary-800"
      >
        + Ajouter une option
      </button>
      <p class="text-xs text-gray-400 mt-1">Selectionnez le bouton radio pour la bonne reponse</p>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Explication (optionnel)</label>
      <textarea
        :value="modelValue.explanation"
        @input="updateField('explanation', ($event.target as HTMLTextAreaElement).value)"
        rows="2"
        placeholder="Explication affichee apres la reponse..."
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
interface QuizOption {
  text: string;
  isCorrect: boolean;
}

const props = defineProps<{
  modelValue: {
    question: string;
    options: QuizOption[];
    explanation: string;
  };
  blockId: string;
}>();
const emit = defineEmits<{ 'update:modelValue': [val: any] }>();

function updateField(key: string, value: any) {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
}

function updateOption(idx: number, key: string, value: any) {
  const newOptions = props.modelValue.options.map((o, i) =>
    i === idx ? { ...o, [key]: value } : { ...o }
  );
  emit('update:modelValue', { ...props.modelValue, options: newOptions });
}

function setCorrect(idx: number) {
  const newOptions = props.modelValue.options.map((o, i) => ({
    ...o,
    isCorrect: i === idx,
  }));
  emit('update:modelValue', { ...props.modelValue, options: newOptions });
}

function addOption() {
  const newOptions = [...props.modelValue.options, { text: '', isCorrect: false }];
  emit('update:modelValue', { ...props.modelValue, options: newOptions });
}

function removeOption(idx: number) {
  const newOptions = props.modelValue.options.filter((_, i) => i !== idx);
  emit('update:modelValue', { ...props.modelValue, options: newOptions });
}
</script>
