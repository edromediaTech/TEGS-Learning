<template>
  <div class="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
    <div class="flex items-center space-x-2 mb-2">
      <span class="bg-amber-600 text-white text-xs font-bold px-2 py-1 rounded">VRAI / FAUX</span>
    </div>
    <p class="font-medium text-gray-800">{{ data.statement }}</p>
    <div class="flex space-x-3">
      <button
        @click="select(true)"
        :disabled="answered"
        class="flex-1 px-4 py-3 rounded-lg border font-medium text-sm transition"
        :class="btnClass(true)"
      >
        Vrai
      </button>
      <button
        @click="select(false)"
        :disabled="answered"
        class="flex-1 px-4 py-3 rounded-lg border font-medium text-sm transition"
        :class="btnClass(false)"
      >
        Faux
      </button>
    </div>
    <div v-if="answered" class="pt-2">
      <div class="p-3 rounded-lg text-sm" :class="isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
        {{ isCorrect ? 'Bonne reponse !' : 'Mauvaise reponse.' }}
      </div>
      <p v-if="data.explanation" class="mt-2 text-sm text-gray-600 italic">{{ data.explanation }}</p>
      <button @click="reset" class="mt-2 text-sm text-primary-600 hover:text-primary-800">Recommencer</button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ data: { statement: string; answer: boolean; explanation: string } }>();

const selected = ref<boolean | null>(null);
const answered = ref(false);
const isCorrect = computed(() => selected.value === props.data.answer);

function select(val: boolean) {
  if (answered.value) return;
  selected.value = val;
  answered.value = true;
}

function btnClass(val: boolean) {
  if (!answered.value) return 'border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50';
  if (val === props.data.answer) return 'border-green-400 bg-green-50 text-green-700';
  if (val === selected.value) return 'border-red-400 bg-red-50 text-red-700';
  return 'border-gray-200 bg-white opacity-50';
}

function reset() { selected.value = null; answered.value = false; }
</script>
