<template>
  <div class="bg-cyan-50 border border-cyan-200 rounded-lg p-4 space-y-3">
    <div class="flex items-center justify-between mb-2">
      <span class="bg-cyan-600 text-white text-xs font-bold px-2 py-1 rounded">REPONSE COURTE</span>
      <div class="flex items-center gap-2 text-xs text-gray-500">
        <span v-if="data.points" class="bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded font-medium">{{ data.points }} pt{{ data.points > 1 ? 's' : '' }}</span>
        <span v-if="data.duration" class="bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{{ data.duration }} min</span>
      </div>
    </div>

    <p class="font-medium text-gray-800">{{ data.question }}</p>

    <div class="relative">
      <textarea
        v-model="userAnswer"
        :disabled="answered"
        :rows="data.rows || 3"
        :placeholder="data.maxWords ? `Reponse (max ${data.maxWords} mots)...` : 'Votre reponse...'"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
        :class="{ 'bg-gray-50': answered }"
      ></textarea>
      <div v-if="data.maxWords && data.maxWords > 0" class="absolute bottom-2 right-3 text-xs"
        :class="wordCount > data.maxWords ? 'text-red-500 font-bold' : 'text-gray-400'"
      >
        {{ wordCount }} / {{ data.maxWords }} mots
      </div>
    </div>

    <button
      @click="submit"
      :disabled="answered || !userAnswer.trim() || (data.maxWords && wordCount > data.maxWords)"
      class="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700 disabled:opacity-50 transition"
    >
      Valider
    </button>

    <div v-if="answered" class="pt-2">
      <div v-if="data.autoGrade"
        class="p-3 rounded-lg text-sm"
        :class="isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'"
      >
        {{ isCorrect ? 'Bonne reponse !' : 'Mauvaise reponse.' }}
        <span v-if="!isCorrect && data.answer" class="block mt-1">Reponse attendue : <strong>{{ data.answer }}</strong></span>
      </div>
      <div v-else class="p-3 rounded-lg text-sm bg-blue-100 text-blue-800">
        Reponse enregistree. Cette question sera evaluee manuellement.
      </div>
      <p v-if="data.explanation" class="mt-2 text-sm text-gray-600 italic">{{ data.explanation }}</p>
      <button @click="reset" class="mt-2 text-sm text-cyan-600 hover:text-cyan-800">Recommencer</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  data: {
    question: string;
    answer: string;
    autoGrade: boolean;
    maxWords: number;
    rows: number;
    points: number;
    duration: number;
    explanation: string;
  };
}>();

const userAnswer = ref('');
const answered = ref(false);

const wordCount = computed(() => {
  const trimmed = userAnswer.value.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
});

const isCorrect = computed(() => {
  if (!props.data.autoGrade) return false;
  return userAnswer.value.trim().toLowerCase() === (props.data.answer || '').trim().toLowerCase();
});

function submit() {
  if (!userAnswer.value.trim()) return;
  if (props.data.maxWords && wordCount.value > props.data.maxWords) return;
  answered.value = true;
}

function reset() {
  userAnswer.value = '';
  answered.value = false;
}
</script>
