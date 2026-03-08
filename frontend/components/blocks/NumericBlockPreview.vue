<template>
  <div class="bg-indigo-50 border border-indigo-200 rounded-lg p-4 space-y-3">
    <div class="flex items-center space-x-2 mb-2">
      <span class="bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded">NUMERIQUE</span>
    </div>
    <p class="font-medium text-gray-800">{{ data.question }}</p>
    <div class="flex items-center space-x-2">
      <input
        v-model.number="userAnswer"
        :disabled="answered"
        type="number"
        step="any"
        placeholder="Votre reponse"
        class="px-3 py-2 border border-gray-300 rounded-lg text-sm w-40 focus:ring-2 focus:ring-indigo-500"
      />
      <span v-if="data.unit" class="text-sm text-gray-600">{{ data.unit }}</span>
      <button
        @click="check"
        :disabled="answered || userAnswer === null"
        class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
      >
        Valider
      </button>
    </div>
    <div v-if="answered" class="pt-2">
      <div class="p-3 rounded-lg text-sm" :class="isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
        {{ isCorrect ? 'Bonne reponse !' : `Mauvaise reponse. La reponse est ${data.answer}${data.unit ? ' ' + data.unit : ''}.` }}
      </div>
      <p v-if="data.explanation" class="mt-2 text-sm text-gray-600 italic">{{ data.explanation }}</p>
      <button @click="reset" class="mt-2 text-sm text-primary-600 hover:text-primary-800">Recommencer</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ data: { question: string; answer: number; tolerance: number; unit: string; explanation: string } }>();

const userAnswer = ref<number | null>(null);
const answered = ref(false);
const isCorrect = computed(() => {
  if (userAnswer.value === null) return false;
  const tol = props.data.tolerance || 0;
  return Math.abs(userAnswer.value - props.data.answer) <= tol;
});

function check() { answered.value = true; }
function reset() { userAnswer.value = null; answered.value = false; }
</script>
