<template>
  <div class="rounded-lg border p-5 my-4" :style="{ background: '#fdf2f8', borderColor: '#fbcfe8' }">
    <span class="bg-pink-600 text-white px-2 py-0.5 rounded text-xs font-bold">ECHELLE</span>
    <p class="font-semibold my-3">{{ block.data.question || block.data.statement }}</p>
    <div class="flex gap-2 justify-center">
      <button
        v-for="val in scaleValues"
        :key="val"
        @click="select(val)"
        class="w-12 h-12 rounded-full border-2 font-bold text-sm transition-all"
        :style="btnStyle(val)"
      >
        {{ val }}
      </button>
    </div>
    <div v-if="labels" class="flex justify-between text-xs text-gray-400 mt-1 px-2">
      <span>{{ labels.min }}</span>
      <span>{{ labels.max }}</span>
    </div>
    <div v-if="selected !== null" class="mt-3 p-3 bg-pink-50 rounded-lg text-sm text-pink-800 text-center">
      Vous avez choisi : <strong>{{ selected }}</strong>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ block: any; theme: any }>()
const selected = ref<number | null>(null)
const max = computed(() => props.block.data.scale || props.block.data.max || 5)
const scaleValues = computed(() => Array.from({ length: max.value }, (_, i) => i + 1))
const labels = computed(() => props.block.data.labels || null)

const emit = defineEmits<{ answered: [result: { correct: boolean; points: number }] }>()

function select(val: number) {
  selected.value = val
  emit('answered', { correct: true, points: props.block.data.points || 1 })
}

function btnStyle(val: number) {
  if (selected.value === val) return { borderColor: '#ec4899', background: '#ec4899', color: '#fff' }
  return { borderColor: '#e5e7eb', background: 'white', color: '#374151' }
}
</script>
