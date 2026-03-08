<template>
  <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3">
    <div class="flex items-center space-x-2 mb-2">
      <span class="bg-orange-600 text-white text-xs font-bold px-2 py-1 rounded">SEQUENCE</span>
    </div>
    <p v-if="data.instruction" class="text-gray-700 text-sm">{{ data.instruction }}</p>
    <div class="space-y-2">
      <div
        v-for="(item, idx) in userOrder"
        :key="idx"
        class="flex items-center space-x-2 px-3 py-2 bg-white border rounded-lg text-sm"
        :class="answered ? (item === data.items[idx] ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50') : 'border-gray-200'"
      >
        <span class="text-gray-400 font-medium w-6">{{ idx + 1 }}.</span>
        <span class="flex-1">{{ item }}</span>
        <div v-if="!answered" class="flex space-x-1">
          <button v-if="idx > 0" @click="move(idx, -1)" class="text-gray-400 hover:text-gray-600 text-xs px-1">&uarr;</button>
          <button v-if="idx < userOrder.length - 1" @click="move(idx, 1)" class="text-gray-400 hover:text-gray-600 text-xs px-1">&darr;</button>
        </div>
      </div>
    </div>
    <button
      @click="check"
      :disabled="answered"
      class="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:opacity-50"
    >
      Valider
    </button>
    <div v-if="answered" class="pt-2">
      <div class="p-3 rounded-lg text-sm" :class="allCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
        {{ allCorrect ? 'Ordre correct !' : 'L\'ordre n\'est pas correct.' }}
      </div>
      <p v-if="data.explanation" class="mt-2 text-sm text-gray-600 italic">{{ data.explanation }}</p>
      <button @click="reset" class="mt-2 text-sm text-primary-600 hover:text-primary-800">Recommencer</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ data: { instruction: string; items: string[]; explanation: string } }>();

const userOrder = ref<string[]>([]);
const answered = ref(false);
const allCorrect = computed(() => userOrder.value.every((item, i) => item === props.data.items[i]));

function shuffle() {
  const arr = [...props.data.items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  userOrder.value = arr;
}

function move(idx: number, dir: number) {
  const target = idx + dir;
  const arr = [...userOrder.value];
  [arr[idx], arr[target]] = [arr[target], arr[idx]];
  userOrder.value = arr;
}

function check() { answered.value = true; }
function reset() { answered.value = false; shuffle(); }

onMounted(shuffle);
</script>
