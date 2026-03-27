<template>
  <div class="rounded-lg border p-5 my-4" :style="{ background: '#fffbeb', borderColor: '#fde68a' }">
    <span class="bg-amber-600 text-white px-2 py-0.5 rounded text-xs font-bold">VRAI / FAUX</span>
    <p class="font-semibold my-3">{{ block.data.statement }}</p>
    <div class="flex gap-3">
      <button
        v-for="val in ['true', 'false']"
        :key="val"
        @click="select(val)"
        class="flex-1 text-center py-3 border rounded-md font-semibold cursor-pointer transition-all"
        :style="btnStyle(val)"
      >
        {{ val === 'true' ? 'Vrai' : 'Faux' }}
      </button>
    </div>
    <div v-if="answered" class="mt-3 p-3 rounded-lg text-sm" :style="resultStyle">
      {{ isCorrect ? 'Bonne reponse !' : 'Mauvaise reponse.' }}
    </div>
    <p v-if="answered && block.data.explanation" class="mt-2 text-sm text-gray-500 italic">{{ block.data.explanation }}</p>
    <button v-if="answered" @click="reset" class="mt-2 text-sm text-amber-600 hover:underline">Recommencer</button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ block: any; theme: any }>()
const emit = defineEmits<{ answered: [result: { correct: boolean; points: number }] }>()
const selected = ref<string | null>(null)
const answered = ref(false)
const correctAnswer = computed(() => props.block.data.answer === true ? 'true' : 'false')
const isCorrect = computed(() => selected.value === correctAnswer.value)

function select(val: string) {
  if (answered.value) return
  selected.value = val
  answered.value = true
  emit('answered', { correct: isCorrect.value, points: props.block.data.points || 1 })
}

function btnStyle(val: string) {
  if (!answered.value) return { borderColor: '#e5e7eb' }
  if (val === correctAnswer.value) return { borderColor: '#22c55e', background: '#f0fdf4' }
  if (val === selected.value) return { borderColor: '#ef4444', background: '#fef2f2' }
  return { borderColor: '#e5e7eb', opacity: '0.5' }
}

const resultStyle = computed(() => isCorrect.value
  ? { background: '#f0fdf4', color: '#166534' }
  : { background: '#fef2f2', color: '#991b1b' }
)

function reset() { selected.value = null; answered.value = false }
</script>
