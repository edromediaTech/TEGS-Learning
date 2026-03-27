<template>
  <div class="rounded-lg border p-5 my-4" :style="{ background: '#fff7ed', borderColor: '#fed7aa' }">
    <span class="bg-orange-600 text-white px-2 py-0.5 rounded text-xs font-bold">SEQUENCE</span>
    <p class="font-semibold my-3">{{ block.data.question || 'Remettez dans le bon ordre' }}</p>
    <div class="space-y-1">
      <div
        v-for="(item, i) in userOrder"
        :key="i"
        class="flex items-center gap-2 px-3 py-2 border rounded-md text-sm"
        :style="answered ? itemStyle(i) : { borderColor: '#e5e7eb' }"
      >
        <span class="font-bold text-gray-400 w-6">{{ i + 1 }}.</span>
        <span class="flex-1">{{ item }}</span>
        <div v-if="!answered" class="flex gap-1">
          <button @click="moveUp(i)" :disabled="i === 0" class="text-gray-400 hover:text-gray-700 disabled:opacity-30">&uarr;</button>
          <button @click="moveDown(i)" :disabled="i === userOrder.length - 1" class="text-gray-400 hover:text-gray-700 disabled:opacity-30">&darr;</button>
        </div>
      </div>
    </div>
    <button v-if="!answered" @click="check" class="mt-3 px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium">Valider</button>
    <div v-if="answered" class="mt-3 p-3 rounded-lg text-sm" :style="resultStyle">
      {{ isCorrect ? 'Parfait ! Bon ordre !' : 'Ordre incorrect.' }}
    </div>
    <button v-if="answered" @click="reset" class="mt-2 text-sm text-orange-600 hover:underline">Recommencer</button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ block: any; theme: any }>()
const correctOrder = computed(() => props.block.data.items || props.block.data.correctOrder || [])
const userOrder = ref<string[]>([])
const answered = ref(false)
const isCorrect = ref(false)

onMounted(() => { userOrder.value = [...correctOrder.value].sort(() => Math.random() - 0.5) })

function moveUp(i: number) { if (i > 0) { const tmp = userOrder.value[i]; userOrder.value[i] = userOrder.value[i - 1]; userOrder.value[i - 1] = tmp } }
function moveDown(i: number) { if (i < userOrder.value.length - 1) { const tmp = userOrder.value[i]; userOrder.value[i] = userOrder.value[i + 1]; userOrder.value[i + 1] = tmp } }

function check() {
  isCorrect.value = userOrder.value.every((item, i) => item === correctOrder.value[i])
  answered.value = true
}

function itemStyle(i: number) {
  return userOrder.value[i] === correctOrder.value[i]
    ? { borderColor: '#22c55e', background: '#f0fdf4' }
    : { borderColor: '#ef4444', background: '#fef2f2' }
}

const resultStyle = computed(() => isCorrect.value
  ? { background: '#f0fdf4', color: '#166534' }
  : { background: '#fef2f2', color: '#991b1b' }
)

function reset() { userOrder.value = [...correctOrder.value].sort(() => Math.random() - 0.5); answered.value = false; isCorrect.value = false }
</script>
