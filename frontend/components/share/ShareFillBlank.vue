<template>
  <div class="rounded-lg border p-5 my-4" :style="{ background: '#fdf4ff', borderColor: '#e9d5ff' }">
    <span class="bg-purple-600 text-white px-2 py-0.5 rounded text-xs font-bold">TEXTE A TROUS</span>
    <p class="font-semibold my-3">{{ block.data.question || block.data.sentence }}</p>
    <div class="flex items-center gap-2">
      <input
        v-model="answer"
        type="text"
        placeholder="Votre reponse"
        :disabled="answered"
        class="px-3 py-2 border rounded-md flex-1 text-sm"
      >
      <button v-if="!answered" @click="check" class="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium">Valider</button>
    </div>
    <div v-if="answered" class="mt-3 p-3 rounded-lg text-sm" :style="resultStyle">
      {{ isCorrect ? 'Bonne reponse !' : `Mauvaise reponse. Reponse attendue : ${block.data.answer}` }}
    </div>
    <p v-if="answered && block.data.explanation" class="mt-2 text-sm text-gray-500 italic">{{ block.data.explanation }}</p>
    <button v-if="answered" @click="reset" class="mt-2 text-sm text-purple-600 hover:underline">Recommencer</button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ block: any; theme: any }>()
const answer = ref('')
const answered = ref(false)
const isCorrect = ref(false)

function check() {
  if (!answer.value.trim()) return
  const correct = (props.block.data.answer || '').toString().trim().toLowerCase()
  const acceptable = props.block.data.acceptableAnswers
    ? props.block.data.acceptableAnswers.map((a: string) => a.trim().toLowerCase())
    : [correct]
  if (!acceptable.includes(correct)) acceptable.push(correct)
  isCorrect.value = acceptable.includes(answer.value.trim().toLowerCase())
  answered.value = true
}

const resultStyle = computed(() => isCorrect.value
  ? { background: '#f0fdf4', color: '#166534' }
  : { background: '#fef2f2', color: '#991b1b' }
)

function reset() { answer.value = ''; answered.value = false; isCorrect.value = false }
</script>
