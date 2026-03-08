<template>
  <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
    <div class="flex items-center space-x-2 mb-2">
      <span class="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded">QUIZ</span>
    </div>

    <p class="font-medium text-gray-800">{{ data.question }}</p>

    <div class="space-y-2">
      <button
        v-for="(option, idx) in data.options"
        :key="idx"
        @click="selectAnswer(idx)"
        :disabled="answered"
        class="w-full text-left px-4 py-2 rounded-lg border transition text-sm"
        :class="optionClass(idx)"
      >
        <span class="font-medium mr-2">{{ String.fromCharCode(65 + idx) }}.</span>
        {{ option.text }}
        <span v-if="answered && option.isCorrect" class="float-right text-green-600 font-bold">&#10003;</span>
        <span v-if="answered && selected === idx && !option.isCorrect" class="float-right text-red-600 font-bold">&#10007;</span>
      </button>
    </div>

    <!-- Resultat -->
    <div v-if="answered" class="pt-2">
      <div
        class="p-3 rounded-lg text-sm"
        :class="isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
      >
        {{ isCorrect ? 'Bonne reponse !' : 'Mauvaise reponse.' }}
      </div>
      <p v-if="data.explanation" class="mt-2 text-sm text-gray-600 italic">
        {{ data.explanation }}
      </p>
      <button
        @click="reset"
        class="mt-2 text-sm text-primary-600 hover:text-primary-800"
      >
        Recommencer
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface QuizOption {
  text: string;
  isCorrect: boolean;
}

const props = defineProps<{
  data: {
    question: string;
    options: QuizOption[];
    explanation: string;
  };
}>();

const selected = ref<number | null>(null);
const answered = ref(false);

const isCorrect = computed(() => {
  if (selected.value === null) return false;
  return props.data.options[selected.value]?.isCorrect === true;
});

function selectAnswer(idx: number) {
  if (answered.value) return;
  selected.value = idx;
  answered.value = true;
}

function optionClass(idx: number) {
  if (!answered.value) {
    return selected.value === idx
      ? 'border-primary-400 bg-primary-50'
      : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50';
  }
  const opt = props.data.options[idx];
  if (opt.isCorrect) return 'border-green-400 bg-green-50';
  if (selected.value === idx) return 'border-red-400 bg-red-50';
  return 'border-gray-200 bg-white opacity-50';
}

function reset() {
  selected.value = null;
  answered.value = false;
}
</script>
