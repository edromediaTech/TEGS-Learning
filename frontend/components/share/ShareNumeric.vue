<template>
  <div class="rounded-lg border p-5 my-4" :style="{ background: '#eef2ff', borderColor: '#c7d2fe' }">
    <span class="bg-indigo-600 text-white px-2 py-0.5 rounded text-xs font-bold">NUMERIQUE</span>
    <p class="font-semibold my-3">{{ block.data.question }}</p>
    <div class="flex items-center gap-2">
      <input
        v-model.number="answer"
        type="number"
        step="any"
        placeholder="Votre reponse"
        :disabled="answered"
        class="px-3 py-2 border rounded-md w-36 text-sm"
      >
      <span v-if="block.data.unit" class="text-sm">{{ block.data.unit }}</span>
      <button v-if="!answered" @click="check" class="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium">Valider</button>
    </div>
    <div v-if="answered" class="mt-3 p-3 rounded-lg text-sm" :style="resultStyle">
      {{ isCorrect ? 'Bonne reponse !' : `Mauvaise reponse. La reponse etait ${block.data.answer}.` }}
    </div>
    <p v-if="answered && block.data.explanation" class="mt-2 text-sm text-gray-500 italic">{{ block.data.explanation }}</p>
    <button v-if="answered" @click="reset" class="mt-2 text-sm text-indigo-600 hover:underline">Recommencer</button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ block: any; theme: any }>()
const emit = defineEmits<{ answered: [result: { correct: boolean; points: number }] }>()
const answer = ref<number | null>(null)
const answered = ref(false)
const isCorrect = ref(false)

function check() {
  if (answer.value === null) return
  const tolerance = props.block.data.tolerance || 0
  isCorrect.value = Math.abs(answer.value - props.block.data.answer) <= tolerance
  answered.value = true
  emit('answered', { correct: isCorrect.value, points: props.block.data.points || 1 })
}

const resultStyle = computed(() => isCorrect.value
  ? { background: '#f0fdf4', color: '#166534' }
  : { background: '#fef2f2', color: '#991b1b' }
)

function reset() { answer.value = null; answered.value = false; isCorrect.value = false }
</script>
