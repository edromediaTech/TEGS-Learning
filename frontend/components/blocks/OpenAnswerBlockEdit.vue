<template>
  <div class="space-y-3">
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Question</label>
      <input
        v-model="localData.question"
        @input="emit('update:modelValue', localData)"
        type="text"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
        placeholder="Posez votre question..."
      />
    </div>

    <div class="flex items-center gap-4">
      <label class="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          v-model="localData.autoGrade"
          @change="emit('update:modelValue', localData)"
          class="rounded border-gray-300 text-primary-600"
        />
        <span class="text-gray-700">Correction automatique</span>
      </label>
    </div>

    <div v-if="localData.autoGrade">
      <label class="block text-sm font-medium text-gray-700 mb-1">Reponse attendue</label>
      <input
        v-model="localData.answer"
        @input="emit('update:modelValue', localData)"
        type="text"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
        placeholder="Reponse correcte..."
      />
      <p class="text-xs text-gray-400 mt-1">La comparaison ignore la casse et les espaces en debut/fin.</p>
    </div>

    <div v-if="!localData.autoGrade">
      <label class="block text-sm font-medium text-gray-700 mb-1">Reponse modele (reference pour le correcteur)</label>
      <textarea
        v-model="localData.answer"
        @input="emit('update:modelValue', localData)"
        rows="2"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
        placeholder="Reponse attendue (obligatoire)..."
      ></textarea>
    </div>

    <div class="flex gap-3">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Nombre de mots max</label>
        <input
          v-model.number="localData.maxWords"
          @input="emit('update:modelValue', localData)"
          type="number"
          min="0"
          class="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          placeholder="Illimite"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Lignes (hauteur)</label>
        <input
          v-model.number="localData.rows"
          @input="emit('update:modelValue', localData)"
          type="number"
          min="1"
          max="20"
          class="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
        />
      </div>
    </div>

    <!-- Points & Duree -->
    <div class="flex gap-3 pt-2 border-t border-gray-100">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Points</label>
        <input
          v-model.number="localData.points"
          @input="emit('update:modelValue', localData)"
          type="number"
          min="0"
          class="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Duree (min)</label>
        <input
          v-model.number="localData.duration"
          @input="emit('update:modelValue', localData)"
          type="number"
          min="0"
          class="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
          placeholder="--"
        />
      </div>
    </div>

    <div>
      <label class="block text-sm font-medium text-gray-700 mb-1">Explication (optionnel)</label>
      <textarea
        v-model="localData.explanation"
        @input="emit('update:modelValue', localData)"
        rows="2"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
        placeholder="Explication apres la reponse..."
      ></textarea>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ modelValue: any }>();
const emit = defineEmits<{ 'update:modelValue': [val: any] }>();

const localData = reactive({
  question: props.modelValue.question || '',
  answer: props.modelValue.answer || '',
  autoGrade: props.modelValue.autoGrade ?? false,
  maxWords: props.modelValue.maxWords || 0,
  rows: props.modelValue.rows || 3,
  points: props.modelValue.points || 1,
  duration: props.modelValue.duration || 0,
  explanation: props.modelValue.explanation || '',
});

watch(() => props.modelValue, (v) => {
  Object.assign(localData, {
    question: v.question || '',
    answer: v.answer || '',
    autoGrade: v.autoGrade ?? false,
    maxWords: v.maxWords || 0,
    rows: v.rows || 3,
    points: v.points || 1,
    duration: v.duration || 0,
    explanation: v.explanation || '',
  });
}, { deep: true });
</script>
