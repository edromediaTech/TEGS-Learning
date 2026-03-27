<template>
  <div class="rounded-lg border p-5 my-4" :style="{ background: '#f0fdfa', borderColor: '#99f6e4' }">
    <span class="bg-teal-600 text-white px-2 py-0.5 rounded text-xs font-bold">APPARIEMENT</span>
    <p class="font-semibold my-3">{{ block.data.question || 'Associez les elements' }}</p>
    <div class="space-y-2">
      <div v-for="(pair, i) in block.data.pairs || []" :key="i" class="flex items-center gap-3">
        <span class="px-3 py-2 bg-teal-100 rounded-md text-sm font-medium flex-1">{{ pair.left }}</span>
        <span class="text-gray-400">&rarr;</span>
        <select
          v-model="answers[i]"
          :disabled="answered"
          class="px-3 py-2 border rounded-md text-sm flex-1"
        >
          <option value="">Choisir...</option>
          <option v-for="(p, j) in shuffledRights" :key="j" :value="p">{{ p }}</option>
        </select>
      </div>
    </div>
    <button v-if="!answered" @click="check" class="mt-3 px-4 py-2 bg-teal-600 text-white rounded-md text-sm font-medium">Valider</button>
    <div v-if="answered" class="mt-3 p-3 rounded-lg text-sm" :style="resultStyle">
      {{ score }} / {{ (block.data.pairs || []).length }} correct{{ score > 1 ? 's' : '' }}
    </div>
    <button v-if="answered" @click="reset" class="mt-2 text-sm text-teal-600 hover:underline">Recommencer</button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ block: any; theme: any }>()
const pairs = computed(() => props.block.data.pairs || [])
const shuffledRights = computed(() => [...pairs.value.map((p: any) => p.right)].sort(() => Math.random() - 0.5))
const answers = ref<string[]>([])
const answered = ref(false)
const score = ref(0)

onMounted(() => { answers.value = pairs.value.map(() => '') })

const emit = defineEmits<{ answered: [result: { correct: boolean; points: number }] }>()

function check() {
  score.value = pairs.value.filter((p: any, i: number) => answers.value[i] === p.right).length
  answered.value = true
  emit('answered', { correct: score.value === pairs.value.length, points: props.block.data.points || 1 })
}

const resultStyle = computed(() => score.value === pairs.value.length
  ? { background: '#f0fdf4', color: '#166534' }
  : { background: '#fef2f2', color: '#991b1b' }
)

function reset() { answers.value = pairs.value.map(() => ''); answered.value = false; score.value = 0 }
</script>
