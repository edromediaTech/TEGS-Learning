<template>
  <div class="bg-violet-50 border border-violet-200 rounded-lg p-4 space-y-3">
    <div class="flex items-center space-x-2 mb-2">
      <span class="bg-violet-600 text-white text-xs font-bold px-2 py-1 rounded">APPARIEMENT</span>
    </div>
    <p v-if="data.instruction" class="text-gray-700 text-sm">{{ data.instruction }}</p>
    <div class="grid grid-cols-2 gap-4">
      <div class="space-y-2">
        <p class="text-xs font-medium text-gray-500 uppercase">Elements</p>
        <div v-for="(pair, i) in data.pairs" :key="'l'+i" class="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium">
          {{ i + 1 }}. {{ pair.left }}
        </div>
      </div>
      <div class="space-y-2">
        <p class="text-xs font-medium text-gray-500 uppercase">Correspondances</p>
        <div v-for="(item, i) in shuffledRight" :key="'r'+i" class="flex items-center space-x-2">
          <select
            v-model="userMatches[i]"
            :disabled="answered"
            class="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-violet-500"
            :class="answered ? (userMatches[i] === correctMatches[i] ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50') : ''"
          >
            <option value="">-- Choisir --</option>
            <option v-for="n in data.pairs.length" :key="n" :value="n">{{ n }}</option>
          </select>
          <span class="text-sm">{{ item }}</span>
        </div>
      </div>
    </div>
    <button
      @click="check"
      :disabled="answered"
      class="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700 disabled:opacity-50"
    >
      Valider
    </button>
    <div v-if="answered" class="pt-2">
      <div class="p-3 rounded-lg text-sm" :class="allCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
        {{ allCorrect ? 'Tout est correct !' : 'Certaines associations sont incorrectes.' }}
      </div>
      <p v-if="data.explanation" class="mt-2 text-sm text-gray-600 italic">{{ data.explanation }}</p>
      <button @click="reset" class="mt-2 text-sm text-primary-600 hover:text-primary-800">Recommencer</button>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Pair { left: string; right: string; }
const props = defineProps<{ data: { instruction: string; pairs: Pair[]; explanation: string } }>();

const shuffleOrder = ref<number[]>([]);
const shuffledRight = computed(() => shuffleOrder.value.map(i => props.data.pairs[i]?.right || ''));
const correctMatches = computed(() => shuffleOrder.value.map(i => i + 1));

const userMatches = ref<(number | string)[]>([]);
const answered = ref(false);
const allCorrect = computed(() => userMatches.value.every((v, i) => Number(v) === correctMatches.value[i]));

function shuffle() {
  const arr = props.data.pairs.map((_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  shuffleOrder.value = arr;
  userMatches.value = arr.map(() => '');
}

function check() { answered.value = true; }
function reset() { answered.value = false; shuffle(); }

onMounted(shuffle);
</script>
