<template>
  <div class="rounded-lg border p-5 my-4" :style="{ background: theme.cardBg, borderColor: '#dbeafe' }">
    <div class="flex items-center justify-between mb-3">
      <span class="bg-blue-600 text-white px-2 py-0.5 rounded text-xs font-bold">QCM</span>
      <div class="flex gap-2 text-xs text-gray-500">
        <span v-if="block.data.points" class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">{{ block.data.points }} pts</span>
        <span v-if="block.data.duration" class="bg-gray-100 px-2 py-0.5 rounded">{{ block.data.duration }} min</span>
      </div>
    </div>
    <p class="font-semibold mb-3">{{ block.data.question }}</p>
    <div
      v-for="(opt, i) in block.data.options || []"
      :key="i"
      @click="select(i)"
      class="px-4 py-2.5 my-1 border rounded-md text-sm cursor-pointer transition-all"
      :style="optionStyle(i)"
    >
      <strong>{{ String.fromCharCode(65 + i) }}.</strong> {{ opt.text }}
    </div>
    <div v-if="answered" class="mt-3 p-3 rounded-lg text-sm" :style="resultStyle">
      {{ isCorrect ? 'Bonne reponse !' : 'Mauvaise reponse.' }}
    </div>
    <p v-if="answered && block.data.explanation" class="mt-2 text-sm text-gray-500 italic">{{ block.data.explanation }}</p>
    <button v-if="answered" @click="reset" class="mt-2 text-sm text-blue-600 hover:underline">Recommencer</button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ block: any; theme: any }>()
const emit = defineEmits<{ answered: [result: { correct: boolean; points: number }] }>()
const selected = ref<number | null>(null)
const answered = ref(false)
const correctIdx = computed(() => (props.block.data.options || []).findIndex((o: any) => o.isCorrect))
const isCorrect = computed(() => selected.value === correctIdx.value)

function select(i: number) {
  if (answered.value) return
  selected.value = i
  answered.value = true
  emit('answered', { correct: isCorrect.value, points: props.block.data.points || 1 })
}

function optionStyle(i: number) {
  if (!answered.value) return { borderColor: '#e5e7eb', background: 'transparent' }
  if (i === correctIdx.value) return { borderColor: '#22c55e', background: '#f0fdf4' }
  if (i === selected.value) return { borderColor: '#ef4444', background: '#fef2f2' }
  return { borderColor: '#e5e7eb', opacity: '0.5' }
}

const resultStyle = computed(() => isCorrect.value
  ? { background: '#f0fdf4', color: '#166534' }
  : { background: '#fef2f2', color: '#991b1b' }
)

function reset() { selected.value = null; answered.value = false }
</script>
